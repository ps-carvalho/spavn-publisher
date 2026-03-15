<script setup lang="ts">
import { Plus, Key, Clipboard, Trash2, AlertTriangle, ChevronRight, ChevronDown, Loader2 } from 'lucide-vue-next'
import {
  Button, Input, Label, Switch, Badge, Checkbox,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Alert, AlertTitle, AlertDescription,
} from '@spavn/ui'
import { useToast } from '@spavn/ui'

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

const { toast } = useToast()
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
    toast({ title: 'Token created', description: 'Copy it now -- it won\'t be shown again.' })
  }
  catch (e: any) {
    toast({ title: 'Failed to create token', description: e?.data?.data?.error?.message || 'Unknown error', variant: 'destructive' })
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
    toast({ title: 'Token revoked' })
  }
  catch {
    toast({ title: 'Failed to revoke token', variant: 'destructive' })
  }
  finally {
    showRevokeModal.value = false
    tokenToRevoke.value = null
  }
}

function copyToken() {
  if (createdToken.value) {
    navigator.clipboard.writeText(createdToken.value)
    toast({ title: 'Token copied to clipboard' })
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---'
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
function getScopeBadges(scopes: string[]): { label: string; variant: 'default' | 'destructive' | 'secondary' | 'outline'; isLegacy?: boolean }[] {
  if (scopes.length === 0) {
    return [{ label: 'Full Access (legacy)', variant: 'destructive', isLegacy: true }]
  }
  if (scopes.length === 1 && scopes[0] === '*') {
    return [{ label: 'Full Access', variant: 'default' }]
  }
  return scopes.slice(0, 3).map(scope => ({
    label: formatScopeBadge(scope),
    variant: 'secondary' as const,
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
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">API Tokens</h2>
      <Button @click="showCreateModal = true">
        <Plus class="h-4 w-4 mr-2" />
        Create Token
      </Button>
    </div>

    <!-- Created token alert -->
    <Alert v-if="createdToken" variant="destructive" class="mb-6">
      <AlertTriangle class="h-4 w-4" />
      <AlertTitle>Save your token now!</AlertTitle>
      <AlertDescription>
        <p class="text-sm">This token will not be shown again.</p>
        <div class="flex items-center gap-2 mt-2">
          <code class="text-xs bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] px-2 py-1 rounded font-mono break-all">{{ createdToken }}</code>
          <Button size="sm" variant="outline" @click="copyToken">
            <Clipboard class="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>
      </AlertDescription>
    </Alert>

    <!-- Tokens table -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Token</TableHead>
            <TableHead>Scopes</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Last Used</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead class="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell colspan="7" class="text-center py-8">
              <Loader2 class="h-6 w-6 animate-spin mx-auto text-[hsl(var(--muted-foreground))]" />
            </TableCell>
          </TableRow>
          <TableRow v-for="token in tokens" :key="token.id">
            <TableCell>
              <span class="font-medium text-[hsl(var(--foreground))]">{{ token.name }}</span>
            </TableCell>
            <TableCell>
              <code class="text-xs font-mono text-[hsl(var(--muted-foreground))]">{{ token.tokenPrefix }}--------</code>
            </TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-1 items-center">
                <Badge
                  v-for="badge in getScopeBadges(token.scopes)"
                  :key="badge.label"
                  :variant="badge.variant"
                >
                  {{ badge.label }}
                </Badge>
                <Badge v-if="getMoreCount(token.scopes) > 0" variant="secondary">
                  +{{ getMoreCount(token.scopes) }} more
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <span class="text-sm text-[hsl(var(--muted-foreground))]">{{ formatDate(token.createdAt) }}</span>
            </TableCell>
            <TableCell>
              <span class="text-sm text-[hsl(var(--muted-foreground))]">{{ formatDate(token.lastUsedAt) }}</span>
            </TableCell>
            <TableCell>
              <span class="text-sm text-[hsl(var(--muted-foreground))]">{{ formatDate(token.expiresAt) }}</span>
            </TableCell>
            <TableCell>
              <Button
                size="sm"
                variant="ghost"
                @click="tokenToRevoke = token; showRevokeModal = true"
              >
                <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))] mr-1" />
                Revoke
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Empty state -->
      <div v-if="tokens.length === 0 && status !== 'pending'" class="text-center py-12">
        <Key class="w-9 h-9 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No API tokens yet.</p>
      </div>
    </div>

    <!-- Create modal -->
    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create API Token</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="createToken" class="space-y-4">
          <div class="space-y-2">
            <Label for="token-name">Token Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="token-name"
              v-model="newTokenName"
              placeholder="e.g., Production Deploy"
              class="w-full"
              autofocus
            />
          </div>

          <!-- Full Access Toggle -->
          <div class="pt-2 border-t border-[hsl(var(--border))]">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium text-[hsl(var(--foreground))]">Full Access</div>
                <div class="text-sm text-[hsl(var(--muted-foreground))]">Grant all permissions to this token</div>
              </div>
              <Switch v-model:checked="fullAccess" />
            </div>
          </div>

          <!-- Scope Picker (shown when Full Access is OFF) -->
          <div v-if="!fullAccess" class="space-y-4">
            <div class="text-sm font-medium text-[hsl(var(--foreground))]">Permissions</div>

            <!-- Scope Groups -->
            <div v-for="group in scopeGroups" :key="group.name" class="space-y-2">
              <div class="text-sm font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
                {{ group.name }}
              </div>
              <div class="pl-2 space-y-1">
                <label
                  v-for="scope in group.scopes"
                  :key="scope.value"
                  class="flex items-center gap-2 cursor-pointer hover:bg-[hsl(var(--accent))] rounded px-2 py-1 -mx-2"
                >
                  <Checkbox
                    :checked="selectedScopes.has(scope.value)"
                    @update:checked="toggleScope(scope.value)"
                  />
                  <span class="text-sm text-[hsl(var(--foreground))]">{{ scope.label }}</span>
                </label>
              </div>

              <!-- Content type-specific scopes -->
              <div v-if="group.name === 'Content' && contentTypes.length > 0" class="pl-4">
                <button
                  type="button"
                  class="flex items-center gap-1 text-sm text-[hsl(var(--primary))] hover:underline"
                  @click="showContentTypes = !showContentTypes"
                >
                  <ChevronDown v-if="showContentTypes" class="h-4 w-4" />
                  <ChevronRight v-else class="h-4 w-4" />
                  {{ showContentTypes ? 'Hide' : 'Show' }} per-type permissions
                </button>

                <div v-if="showContentTypes" class="mt-2 space-y-3 border-l-2 border-[hsl(var(--border))] pl-3">
                  <div v-for="contentType in contentTypes" :key="contentType.name" class="space-y-1">
                    <div class="text-sm font-medium text-[hsl(var(--foreground))]">
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
                        <Checkbox
                          :checked="isTypeScopeCovered(action) || selectedScopes.has(`content:${contentType.pluralName}:${action}`)"
                          :disabled="isTypeScopeCovered(action)"
                          @update:checked="toggleScope(`content:${contentType.pluralName}:${action}`)"
                        />
                        <span class="text-[hsl(var(--muted-foreground))] capitalize">{{ action }}</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter class="pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="ghost" @click="showCreateModal = false">
              Cancel
            </Button>
            <Button type="submit" :disabled="!newTokenName.trim() || isCreating">
              <Loader2 v-if="isCreating" class="h-4 w-4 mr-2 animate-spin" />
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Revoke confirmation -->
    <Dialog v-model:open="showRevokeModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Revoke Token</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to revoke <span class="font-medium text-[hsl(var(--foreground))]">{{ tokenToRevoke?.name }}</span>? This action cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showRevokeModal = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="revokeToken">
            Revoke
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
