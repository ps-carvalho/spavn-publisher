<script setup lang="ts">
import { ArrowLeft, Mail, Fingerprint, Smartphone, Info, Loader2 } from 'lucide-vue-next'
import { Button, Switch } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
})

const { toast } = useToast()
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
  { value: 'magic-link', label: 'Magic Link', icon: Mail },
  { value: 'passkey', label: 'Passkey', icon: Fingerprint },
  { value: 'totp', label: 'Authenticator App', icon: Smartphone },
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
    toast({ title: 'Failed to load security policies', variant: 'destructive' })
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
    toast({ title: 'Security policies saved' })
    hasChanges.value = false
    await loadPolicies()
  }
  catch (err: any) {
    toast({ title: 'Failed to save policies', variant: 'destructive' })
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
      toast({ title: 'At least one auth method must be allowed', variant: 'destructive' })
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
            class="flex items-center justify-center w-8 h-8 rounded-lg text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] transition-colors duration-150"
          >
            <ArrowLeft class="w-5 h-5" />
          </NuxtLink>
          <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">
            Security Policies
          </h1>
        </div>
        <p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
          Configure authentication requirements per role. All auth methods are available — policies control what's required.
        </p>
      </div>
      <div class="flex gap-3">
        <Button
          variant="outline"
          :disabled="!hasChanges || saving"
          @click="loadPolicies"
        >
          Reset
        </Button>
        <Button
          :disabled="!hasChanges || saving"
          @click="savePolicies"
        >
          <Loader2 v-if="saving" class="h-4 w-4 mr-2 animate-spin" />
          Save Policies
        </Button>
      </div>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="space-y-4">
      <div
        v-for="i in 4"
        :key="i"
        class="animate-pulse rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 h-32"
      />
    </div>

    <!-- Per-role policy cards -->
    <div v-else class="space-y-4">
      <div
        v-for="policy in policies"
        :key="policy.role"
        class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
      >
        <div class="flex items-center justify-between mb-4">
          <div>
            <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] capitalize">
              {{ policy.role.replace('-', ' ') }}
            </h3>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-sm text-[hsl(var(--muted-foreground))]">Require 2FA</span>
            <Switch
              :checked="policy.require2FA"
              @update:checked="toggleRequire2FA(policy)"
            />
          </div>
        </div>

        <!-- Allowed methods -->
        <div>
          <p class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">
            Allowed Authentication Methods
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="method in authMethods"
              :key="method.value"
              class="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors duration-150"
              :class="policy.allowedMethods.includes(method.value)
                ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]'
                : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--ring))]'"
              @click="toggleMethod(policy, method.value)"
            >
              <component :is="method.icon" class="w-4 h-4" />
              {{ method.label }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Info box -->
    <div class="rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))] p-4">
      <div class="flex gap-3">
        <Info class="w-5 h-5 text-[hsl(var(--muted-foreground))] flex-shrink-0 mt-0.5" />
        <div class="text-sm text-[hsl(var(--muted-foreground))]">
          <p class="font-medium text-[hsl(var(--foreground))]">
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
