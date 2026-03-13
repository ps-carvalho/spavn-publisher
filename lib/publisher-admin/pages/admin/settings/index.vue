<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const router = useRouter()
const { user } = usePublisherAuth()

// Whether the current user has admin or super-admin role
const isAdminUser = computed(() => {
  return user.value?.role === 'admin' || user.value?.role === 'super-admin'
})

// All tab definitions (Security Policies is conditionally included based on role)
const allItems: TabsItem[] = [
  {
    label: 'Storage',
    icon: 'i-heroicons-circle-stack',
    value: 'storage',
    slot: 'storage' as const,
  },
  {
    label: 'General',
    icon: 'i-heroicons-cog-6-tooth',
    value: 'general',
    slot: 'general' as const,
  },
  {
    label: 'My Preferences',
    icon: 'i-heroicons-user-circle',
    value: 'users',
    slot: 'users' as const,
  },
  {
    label: 'My Security',
    icon: 'i-heroicons-shield-check',
    value: 'my-security',
    slot: 'my-security' as const,
  },
  {
    label: 'Email',
    icon: 'i-heroicons-envelope',
    value: 'email',
    slot: 'email' as const,
  },
  {
    label: 'Security Policies',
    icon: 'i-heroicons-shield-exclamation',
    value: 'security-policies',
    slot: 'security-policies' as const,
  },
]

// Filter tabs based on user role — Security Policies is admin-only
const items = computed<TabsItem[]>(() => {
  if (isAdminUser.value) {
    return allItems
  }
  return allItems.filter(item => item.value !== 'security-policies')
})

// Get default tab from URL query parameter
const defaultTab = computed(() => {
  const tabParam = route.query.tab as string
  if (tabParam && items.value.some(item => item.value === tabParam)) {
    return tabParam
  }
  return 'storage'
})

// Update URL when tab changes
function handleTabChange(value: string) {
  router.push({ query: { tab: value } })
}
</script>

<template>
  <div class="space-y-6">
    <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Settings</h2>

    <UTabs
      :items="items"
      :default-value="defaultTab"
      color="neutral"
      variant="link"
      class="w-full"
      @update:model-value="handleTabChange"
    >
      <template #storage>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <PublisherSettingsStorageSettings />
        </div>
      </template>

      <template #general>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <PublisherSettingsGeneralSettings />
        </div>
      </template>

      <template #users>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <PublisherSettingsUserSettings />
        </div>
      </template>

      <template #my-security>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <PublisherSettingsMySecuritySettings />
        </div>
      </template>

      <template #email>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <PublisherSettingsEmailSettings />
        </div>
      </template>

      <template #security-policies>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <div class="text-center py-12">
            <UIcon name="i-heroicons-shield-exclamation" class="text-4xl text-amber-500 dark:text-amber-400 mb-3" />
            <p class="text-stone-700 dark:text-stone-300 font-medium">Manage organization security policies</p>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1 mb-4">
              Configure authentication requirements and security policies for all users.
            </p>
            <NuxtLink to="/admin/settings/security">
              <UButton icon="i-heroicons-shield-exclamation" size="sm">
                Security Policies
              </UButton>
            </NuxtLink>
          </div>
        </div>
      </template>
    </UTabs>
  </div>
</template>
