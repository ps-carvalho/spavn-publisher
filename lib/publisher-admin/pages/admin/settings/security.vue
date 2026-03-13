<script setup lang="ts">
definePageMeta({
  layout: 'admin',
})

const toast = useToast()
const { user } = usePublisherAuth()

// Access control — only super-admin and admin can view security policies
if (user.value && !['super-admin', 'admin'].includes(user.value.role)) {
  navigateTo('/admin')
}

// State
const policies = ref<Array<{
  id?: number
  role: string
  require2FA: boolean
  allowedMethods: string[]
}>>([])
const loading = ref(true)
const saving = ref(false)
const hasChanges = ref(false)

// Available roles and methods
const roles = ['super-admin', 'admin', 'editor', 'viewer']
const authMethods = [
  { value: 'magic-link', label: 'Magic Link', icon: 'i-heroicons-envelope' },
  { value: 'passkey', label: 'Passkey', icon: 'i-heroicons-finger-print' },
  { value: 'totp', label: 'Authenticator App', icon: 'i-heroicons-device-phone-mobile' },
]

// Load policies on mount
onMounted(async () => {
  await loadPolicies()
})

async function loadPolicies() {
  loading.value = true
  try {
    const { policies: data } = await $fetch<{ policies: Array<any> }>('/api/publisher/settings/security-policies')
    // Merge with defaults for roles that don't have a policy yet
    policies.value = roles.map((role) => {
      const existing = data.find((p: any) => p.role === role)
      return existing
        ? {
            id: existing.id,
            role: existing.role,
            require2FA: existing.require2FA,
            allowedMethods: existing.allowedMethods,
          }
        : {
            role,
            require2FA: false,
            allowedMethods: ['magic-link', 'passkey', 'totp'],
          }
    })
    hasChanges.value = false
  }
  catch (err: any) {
    toast.add({ title: 'Failed to load security policies', color: 'error' })
  }
  finally {
    loading.value = false
  }
}

async function savePolicies() {
  saving.value = true
  try {
    await $fetch('/api/publisher/settings/security-policies', {
      method: 'PUT',
      body: { policies: policies.value },
    })
    toast.add({ title: 'Security policies saved', color: 'success' })
    hasChanges.value = false
    await loadPolicies()
  }
  catch (err: any) {
    toast.add({ title: 'Failed to save policies', color: 'error' })
  }
  finally {
    saving.value = false
  }
}

function toggleMethod(policy: typeof policies.value[0], method: string) {
  const idx = policy.allowedMethods.indexOf(method)
  if (idx >= 0) {
    // Don't allow removing the last method
    if (policy.allowedMethods.length <= 1) {
      toast.add({ title: 'At least one auth method must be allowed', color: 'warning' })
      return
    }
    policy.allowedMethods.splice(idx, 1)
  }
  else {
    policy.allowedMethods.push(method)
  }
  hasChanges.value = true
}

function toggleRequire2FA(policy: typeof policies.value[0]) {
  policy.require2FA = !policy.require2FA
  hasChanges.value = true
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <div class="flex items-center gap-3">
          <NuxtLink
            to="/admin/settings?tab=security-policies"
            class="flex items-center justify-center w-8 h-8 rounded-lg text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors duration-150"
          >
            <UIcon name="i-heroicons-arrow-left" class="w-5 h-5" />
          </NuxtLink>
          <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Security Policies
          </h1>
        </div>
        <p class="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Configure authentication requirements per role. All auth methods are available — policies control what's required.
        </p>
      </div>
      <div class="flex gap-3">
        <UButton
          variant="outline"
          color="neutral"
          :disabled="!hasChanges || saving"
          @click="loadPolicies"
        >
          Reset
        </UButton>
        <UButton
          :loading="saving"
          :disabled="!hasChanges"
          @click="savePolicies"
        >
          Save Policies
        </UButton>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-4">
      <div
        v-for="i in 4"
        :key="i"
        class="animate-pulse rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 h-32"
      />
    </div>

    <!-- Per-role policy cards -->
    <div v-else class="space-y-4">
      <div
        v-for="policy in policies"
        :key="policy.role"
        class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 capitalize">
              {{ policy.role.replace('-', ' ') }}
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-stone-500 dark:text-stone-400">Require 2FA</span>
            <USwitch
              :model-value="policy.require2FA"
              @update:model-value="toggleRequire2FA(policy)"
            />
          </div>
        </div>

        <!-- Allowed methods -->
        <div>
          <p class="text-sm font-medium text-stone-700 dark:text-stone-300 mb-3">
            Allowed Authentication Methods
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="method in authMethods"
              :key="method.value"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors duration-150"
              :class="policy.allowedMethods.includes(method.value)
                ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400'
                : 'border-stone-200 dark:border-stone-700 text-stone-500 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'"
              @click="toggleMethod(policy, method.value)"
            >
              <UIcon :name="method.icon" class="w-4 h-4" />
              {{ method.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Info box -->
    <div class="rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 p-4">
      <div class="flex gap-3">
        <UIcon name="i-heroicons-information-circle" class="w-5 h-5 text-stone-400 flex-shrink-0 mt-0.5" />
        <div class="text-sm text-stone-600 dark:text-stone-400">
          <p class="font-medium text-stone-700 dark:text-stone-300">
            How policies work
          </p>
          <ul class="mt-2 space-y-1 list-disc list-inside">
            <li>All authentication methods are always available to users</li>
            <li>Policies control whether 2FA is <strong>required</strong> for a role</li>
            <li>Users with required 2FA who haven't set it up will be prompted after login</li>
            <li>Allowed methods restrict which 2FA options users in that role can configure</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>
