<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface ApiToken {
  id: number
  name: string
  tokenPrefix: string
  scopes: string[]
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

interface ContentType {
  name: string
  displayName: string
  pluralName: string
}

// Scope group definitions
const scopeGroups = [
  {
    name: 'Content',
    scopes: [
      { value: 'content:read', label: 'Read all content' },
      { value: 'content:write', label: 'Create & update all content' },
      { value: 'content:delete', label: 'Delete all content' },
      { value: 'content:publish', label: 'Publish & unpublish all content' },
    ],
  },
  {
    name: 'Pages',
    scopes: [
      { value: 'pages:read', label: 'Read pages' },
      { value: 'pages:write', label: 'Create & update pages' },
      { value: 'pages:delete', label: 'Delete pages' },
      { value: 'pages:publish', label: 'Publish & unpublish pages' },
    ],
  },
  {
    name: 'Media',
    scopes: [
      { value: 'media:read', label: 'Read media files' },
      { value: 'media:write', label: 'Upload media files' },
      { value: 'media:delete', label: 'Delete media files' },
    ],
  },
]

const contentActions = ['read', 'write', 'delete', 'publish']

const toast = useToast()
const showCreateModal = ref(false)
const newTokenName = ref('')
const createdToken = ref<string | null>(null)
const isCreating = ref(false)
const showRevokeModal = ref(false)
const tokenToRevoke = ref<ApiToken | null>(null)

// Scope selection state
const fullAccess = ref(false)
const selectedScopes = ref<Set<string>>(new Set())
const showContentTypes = ref(false)

// Fetch content types for per-type scopes
const { data: contentTypesData } = await useFetch<{ data: ContentType[] }>('/api/publisher/types')
const contentTypes = computed(() => contentTypesData.value?.data || [])

const { data, refresh, status } = await useFetch<{ data: ApiToken[] }>('/api/publisher/tokens')

const tokens = computed(() => data.value?.data || [])

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'tokenPrefix', header: 'Token' },
  { accessorKey: 'scopes', header: 'Scopes' },
  { accessorKey: 'createdAt', header: 'Created' },
  { accessorKey: 'lastUsedAt', header: 'Last Used' },
  { accessorKey: 'expiresAt', header: 'Expires' },
  { id: 'actions', header: '' },
]

// Compute which resource-level scopes are selected
const resourceScopesSelected = computed(() => ({
  read: selectedScopes.value.has('content:read'),
  write: selectedScopes.value.has('content:write'),
  delete: selectedScopes.value.has('content:delete'),
  publish: selectedScopes.value.has('content:publish'),
}))

// Check if a type-specific scope is covered by resource-level scope
function isTypeScopeCovered(action: string): boolean {
  return resourceScopesSelected.value[action as keyof typeof resourceScopesSelected.value]
}

// Toggle a scope
function toggleScope(scope: string) {
  if (selectedScopes.value.has(scope)) {
    selectedScopes.value.delete(scope)
  }
  else {
    selectedScopes.value.add(scope)
  }
}

// Get effective scopes for submission
function getEffectiveScopes(): string[] {
  if (fullAccess.value) {
    return ['*']
  }
  return Array.from(selectedScopes.value)
}

// Reset form when modal opens/closes
function resetForm() {
  newTokenName.value = ''
  fullAccess.value = false
  selectedScopes.value = new Set()
  showContentTypes.value = false
}

// Watch modal to reset form
watch(showCreateModal, (isOpen) => {
  if (!isOpen) {
    resetForm()
  }
})

async function createToken() {
  if (!newTokenName.value.trim()) return
  isCreating.value = true

  try {
    const result = await $fetch<{ data: { token: string } }>('/api/publisher/tokens', {
      method: 'POST',
      body: { name: newTokenName.value, scopes: getEffectiveScopes() },
    })

    createdToken.value = result.data.token
    showCreateModal.value = false
    await refresh()
    toast.add({ title: 'Token created', description: 'Copy it now — it won\'t be shown again.', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: 'Failed to create token', description: e?.data?.data?.error?.message || 'Unknown error', color: 'error' })
  }
  finally {
    isCreating.value = false
  }
}

async function revokeToken() {
  if (!tokenToRevoke.value) return

  try {
    await $fetch(`/api/publisher/tokens/${tokenToRevoke.value.id}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Token revoked', color: 'success' })
  }
  catch {
    toast.add({ title: 'Failed to revoke token', color: 'error' })
  }
  finally {
    showRevokeModal.value = false
    tokenToRevoke.value = null
  }
}

function copyToken() {
  if (createdToken.value) {
    navigator.clipboard.writeText(createdToken.value)
    toast.add({ title: 'Token copied to clipboard', color: 'success' })
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

// Format scope for display
function formatScopeBadge(scope: string): string {
  const parts = scope.split(':')
  if (parts.length === 3) {
    // content:articles:read -> Articles: read
    const type = parts[1] ?? ''
    const action = parts[2] ?? ''
    return `${type.charAt(0).toUpperCase() + type.slice(1)}: ${action}`
  }
  // content:read -> Content: read
  const resource = parts[0] ?? ''
  const action = parts[1] ?? ''
  return `${resource.charAt(0).toUpperCase() + resource.slice(1)}: ${action}`
}

// Get scope badges for display in table
function getScopeBadges(scopes: string[]): { label: string; color: 'warning' | 'primary' | 'neutral'; isLegacy?: boolean }[] {
  if (scopes.length === 0) {
    return [{ label: 'Full Access (legacy)', color: 'warning', isLegacy: true }]
  }
  if (scopes.length === 1 && scopes[0] === '*') {
    return [{ label: 'Full Access', color: 'primary' }]
  }
  return scopes.slice(0, 3).map(scope => ({
    label: formatScopeBadge(scope),
    color: 'neutral' as const,
  }))
}

function getMoreCount(scopes: string[]): number {
  if (scopes.length === 0 || (scopes.length === 1 && scopes[0] === '*')) {
    return 0
  }
  return Math.max(0, scopes.length - 3)
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">API Tokens</h2>
      <UButton icon="i-heroicons-plus" color="neutral" @click="showCreateModal = true">
        Create Token
      </UButton>
    </div>

    <!-- Created token alert -->
    <UAlert
      v-if="createdToken"
      color="warning"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      title="Save your token now!"
      :description="`This token will not be shown again.`"
      class="mb-6"
      :close-button="{ onClick: () => createdToken = null }"
    >
      <template #description>
        <div class="flex items-center gap-2 mt-2">
          <code class="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2 py-1 rounded font-mono break-all">{{ createdToken }}</code>
          <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-clipboard" @click="copyToken">
            Copy
          </UButton>
        </div>
      </template>
    </UAlert>

    <!-- Tokens table -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <UTable
        :data="tokens"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #name-cell="{ row }">
          <span class="font-medium text-stone-900 dark:text-stone-100">{{ row.original.name }}</span>
        </template>

        <template #tokenPrefix-cell="{ row }">
          <code class="text-xs font-mono text-stone-600 dark:text-stone-400">{{ row.original.tokenPrefix }}••••••••</code>
        </template>

        <template #createdAt-cell="{ row }">
          <span class="text-sm text-stone-500 dark:text-stone-400">{{ formatDate(row.original.createdAt) }}</span>
        </template>

        <template #lastUsedAt-cell="{ row }">
          <span class="text-sm text-stone-500 dark:text-stone-400">{{ formatDate(row.original.lastUsedAt) }}</span>
        </template>

        <template #expiresAt-cell="{ row }">
          <span class="text-sm text-stone-500 dark:text-stone-400">{{ formatDate(row.original.expiresAt) }}</span>
        </template>

        <template #scopes-cell="{ row }">
          <div class="flex flex-wrap gap-1 items-center">
            <template v-for="badge in getScopeBadges(row.original.scopes)" :key="badge.label">
              <UBadge :color="badge.color" variant="subtle" size="xs">
                {{ badge.label }}
              </UBadge>
            </template>
            <UBadge v-if="getMoreCount(row.original.scopes) > 0" color="neutral" variant="subtle" size="xs">
              +{{ getMoreCount(row.original.scopes) }} more
            </UBadge>
          </div>
        </template>

        <template #actions-cell="{ row }">
          <UButton
            size="xs"
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            @click="tokenToRevoke = row.original; showRevokeModal = true"
          >
            Revoke
          </UButton>
        </template>
      </UTable>

      <!-- Empty state -->
      <div v-if="tokens.length === 0 && status !== 'pending'" class="text-center py-12">
        <UIcon name="i-heroicons-key" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">No API tokens yet.</p>
      </div>
    </div>

    <!-- Create modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6 max-h-[85vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Create API Token</h3>
          <form @submit.prevent="createToken" class="space-y-4">
            <UFormField label="Token Name" name="name" required>
              <UInput
                v-model="newTokenName"
                placeholder="e.g., Production Deploy"
                class="w-full"
                autofocus
              />
            </UFormField>

            <!-- Full Access Toggle -->
            <div class="pt-2 border-t border-stone-200 dark:border-stone-700">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-medium text-stone-900 dark:text-stone-100">Full Access</div>
                  <div class="text-sm text-stone-500 dark:text-stone-400">Grant all permissions to this token</div>
                </div>
                <USwitch v-model:checked="fullAccess" />
              </div>
            </div>

            <!-- Scope Picker (shown when Full Access is OFF) -->
            <div v-if="!fullAccess" class="space-y-4">
              <div class="text-sm font-medium text-stone-700 dark:text-stone-300">Permissions</div>

              <!-- Scope Groups -->
              <div v-for="group in scopeGroups" :key="group.name" class="space-y-2">
                <div class="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wide">
                  {{ group.name }}
                </div>
                <div class="pl-2 space-y-1">
                  <label
                    v-for="scope in group.scopes"
                    :key="scope.value"
                    class="flex items-center gap-2 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800 rounded px-2 py-1 -mx-2"
                  >
                    <UCheckbox
                      :model-value="selectedScopes.has(scope.value)"
                      @update:model-value="toggleScope(scope.value)"
                    />
                    <span class="text-sm text-stone-700 dark:text-stone-300">{{ scope.label }}</span>
                  </label>
                </div>

                <!-- Content type-specific scopes -->
                <div v-if="group.name === 'Content' && contentTypes.length > 0" class="pl-4">
                  <button
                    type="button"
                    class="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    @click="showContentTypes = !showContentTypes"
                  >
                    <UIcon :name="showContentTypes ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" />
                    {{ showContentTypes ? 'Hide' : 'Show' }} per-type permissions
                  </button>

                  <div v-if="showContentTypes" class="mt-2 space-y-3 border-l-2 border-stone-200 dark:border-stone-700 pl-3">
                    <div v-for="contentType in contentTypes" :key="contentType.name" class="space-y-1">
                      <div class="text-sm font-medium text-stone-700 dark:text-stone-300">
                        {{ contentType.displayName || contentType.name }}
                      </div>
                      <div class="flex flex-wrap gap-x-4 gap-y-1 pl-2">
                        <label
                          v-for="action in contentActions"
                          :key="action"
                          class="flex items-center gap-1 cursor-pointer text-xs"
                          :class="{
                            'opacity-50 cursor-not-allowed': isTypeScopeCovered(action),
                          }"
                        >
                          <UCheckbox
                            :model-value="isTypeScopeCovered(action) || selectedScopes.has(`content:${contentType.pluralName}:${action}`)"
                            :disabled="isTypeScopeCovered(action)"
                            @update:model-value="toggleScope(`content:${contentType.pluralName}:${action}`)"
                          />
                          <span class="text-stone-600 dark:text-stone-400 capitalize">{{ action }}</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-4 border-t border-stone-200 dark:border-stone-700">
              <UButton variant="ghost" color="neutral" @click="showCreateModal = false">
                Cancel
              </UButton>
              <UButton type="submit" color="neutral" :loading="isCreating" :disabled="!newTokenName.trim()">
                Create
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Revoke confirmation -->
    <UModal v-model:open="showRevokeModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Revoke Token</h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to revoke <span class="font-medium text-stone-700 dark:text-stone-300">{{ tokenToRevoke?.name }}</span>? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showRevokeModal = false">
              Cancel
            </UButton>
            <UButton color="error" @click="revokeToken">
              Revoke
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
