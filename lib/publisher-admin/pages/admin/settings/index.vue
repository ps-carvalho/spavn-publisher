<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const router = useRouter()

// Tab configuration
const items: TabsItem[] = [
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
    label: 'Email',
    icon: 'i-heroicons-envelope',
    value: 'email',
    slot: 'email' as const,
  },
  {
    label: 'Security',
    icon: 'i-heroicons-shield-check',
    value: 'security',
    slot: 'security' as const,
  },
]

// Get default tab from URL query parameter
const defaultTab = computed(() => {
  const tabParam = route.query.tab as string
  if (tabParam && items.some(item => item.value === tabParam)) {
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

      <template #security>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <div class="text-center py-12">
            <UIcon name="i-heroicons-finger-print" class="text-4xl text-amber-500 dark:text-amber-400 mb-3" />
            <p class="text-stone-700 dark:text-stone-300 font-medium">Manage your passkeys and security settings</p>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1 mb-4">
              Add passkeys for fast, secure passwordless sign-in.
            </p>
            <NuxtLink to="/admin/settings/security">
              <UButton icon="i-heroicons-shield-check" size="sm">
                Security Settings
              </UButton>
            </NuxtLink>
          </div>
        </div>
      </template>

      <template #email>
        <div class="mt-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <PublisherSettingsEmailSettings />
        </div>
      </template>
    </UTabs>
  </div>
</template>
