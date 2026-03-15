<script setup lang="ts">
import { ShieldAlert } from 'lucide-vue-next'
import { Button, Tabs, TabsList, TabsTrigger, TabsContent } from '@spavn/ui'

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

// All tab definitions
const allTabs = [
  { label: 'Storage', value: 'storage' },
  { label: 'General', value: 'general' },
  { label: 'My Preferences', value: 'users' },
  { label: 'My Security', value: 'my-security' },
  { label: 'Email', value: 'email' },
  { label: 'Security Policies', value: 'security-policies' },
]

// Filter tabs based on user role — Security Policies is admin-only
const visibleTabs = computed(() => {
  if (isAdminUser.value) {
    return allTabs
  }
  return allTabs.filter(tab => tab.value !== 'security-policies')
})

// Get default tab from URL query parameter
const defaultTab = computed(() => {
  const tabParam = route.query.tab as string
  if (tabParam && visibleTabs.value.some(tab => tab.value === tabParam)) {
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
    <div>
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))] tracking-tight">Settings</h2>
      <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">Manage your site configuration and preferences</p>
    </div>

    <Tabs
      :default-value="defaultTab"
      class="w-full"
      @update:model-value="handleTabChange"
    >
      <TabsList>
        <TabsTrigger
          v-for="tab in visibleTabs"
          :key="tab.value"
          :value="tab.value"
        >
          {{ tab.label }}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="storage">
        <div class="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <PublisherSettingsStorageSettings />
        </div>
      </TabsContent>

      <TabsContent value="general">
        <div class="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <PublisherSettingsGeneralSettings />
        </div>
      </TabsContent>

      <TabsContent value="users">
        <div class="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <PublisherSettingsUserSettings />
        </div>
      </TabsContent>

      <TabsContent value="my-security">
        <div class="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <PublisherSettingsMySecuritySettings />
        </div>
      </TabsContent>

      <TabsContent value="email">
        <div class="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <PublisherSettingsEmailSettings />
        </div>
      </TabsContent>

      <TabsContent v-if="isAdminUser" value="security-policies">
        <div class="mt-6 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 sm:p-8">
          <div class="text-center py-12">
            <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(var(--muted))] ring-1 ring-[hsl(var(--border))] mb-4">
              <ShieldAlert class="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p class="text-[hsl(var(--foreground))] font-semibold">Manage organization security policies</p>
            <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1.5 mb-5 max-w-sm mx-auto">
              Configure authentication requirements and security policies for all users.
            </p>
            <NuxtLink to="/admin/settings/security">
              <Button>
                <ShieldAlert class="h-4 w-4 mr-2" />
                Security Policies
              </Button>
            </NuxtLink>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>
