<script setup lang="ts">
import { Plus, Play, FileText, Pencil, Trash2, Zap, Clipboard, RefreshCw, AlertTriangle, Loader2 } from 'lucide-vue-next'
import {
  Button, Input, Label, Switch,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Alert, AlertTitle, AlertDescription,
} from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface Webhook {
  id: number
  name: string
  url: string
  events: string[]
  isActive: boolean
  createdAt: string
  secret?: string
}

interface WebhookLog {
  id: number
  webhookId: number
  event: string
  statusCode: number | null
  responseBody: string | null
  deliveredAt: string
}

const { toast } = useToast()
const showCreateModal = ref(false)
const showEditModal = ref(false)
const showLogsSlide = ref(false)
const selectedWebhook = ref<Webhook | null>(null)
const isSubmitting = ref(false)
const isTesting = ref(false)
const createdSecret = ref<string | null>(null)
const logs = ref<WebhookLog[]>([])
const logsLoading = ref(false)

// Create form
const createForm = ref({
  name: '',
  url: '',
  events: [] as string[],
})

// Edit form
const editForm = ref({
  name: '',
  url: '',
  events: [] as string[],
})

const availableEvents = [
  { label: 'Entry Created', value: 'entry.create' },
  { label: 'Entry Updated', value: 'entry.update' },
  { label: 'Entry Deleted', value: 'entry.delete' },
  { label: 'Entry Published', value: 'entry.publish' },
  { label: 'Entry Unpublished', value: 'entry.unpublish' },
  { label: 'Media Uploaded', value: 'media.upload' },
  { label: 'Media Deleted', value: 'media.delete' },
  { label: 'Page Block Created', value: 'page.block.created' },
  { label: 'Page Block Updated', value: 'page.block.updated' },
  { label: 'Page Block Deleted', value: 'page.block.deleted' },
  { label: 'Page Blocks Reordered', value: 'page.block.reordered' },
]

const { data, refresh, status } = await useFetch<{ data: Webhook[] }>('/api/publisher/webhooks')
const webhooks = computed(() => data.value?.data || [])

async function createWebhook() {
  if (!createForm.value.name.trim() || !createForm.value.url.trim()) return
  isSubmitting.value = true

  try {
    const result = await $fetch<{ data: Webhook }>('/api/publisher/webhooks', {
      method: 'POST',
      body: createForm.value,
    })

    createdSecret.value = result.data.secret || null
    createForm.value = { name: '', url: '', events: [] }
    await refresh()

    if (createdSecret.value) {
      toast({ title: 'Webhook created', description: 'Save the signing secret now.' })
    }
    else {
      showCreateModal.value = false
      toast({ title: 'Webhook created' })
    }
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast({ title: err?.data?.data?.error?.message || 'Failed to create webhook', variant: 'destructive' })
  }
  finally {
    isSubmitting.value = false
  }
}

function closeCreateModal() {
  showCreateModal.value = false
  createdSecret.value = null
}

function openEdit(webhook: Webhook) {
  selectedWebhook.value = webhook
  editForm.value = {
    name: webhook.name,
    url: webhook.url,
    events: [...webhook.events],
  }
  showEditModal.value = true
}

async function saveEdit() {
  if (!selectedWebhook.value) return
  isSubmitting.value = true

  try {
    await $fetch(`/api/publisher/webhooks/${selectedWebhook.value.id}`, {
      method: 'PUT',
      body: editForm.value,
    })
    await refresh()
    showEditModal.value = false
    toast({ title: 'Webhook updated' })
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast({ title: err?.data?.data?.error?.message || 'Failed to update webhook', variant: 'destructive' })
  }
  finally {
    isSubmitting.value = false
  }
}

async function toggleActive(webhook: Webhook) {
  try {
    await $fetch(`/api/publisher/webhooks/${webhook.id}`, {
      method: 'PUT',
      body: { isActive: !webhook.isActive },
    })
    await refresh()
  }
  catch {
    toast({ title: 'Failed to toggle webhook', variant: 'destructive' })
  }
}

async function deleteWebhook(webhook: Webhook) {
  if (!confirm(`Delete webhook "${webhook.name}"?`)) return

  try {
    await $fetch(`/api/publisher/webhooks/${webhook.id}`, { method: 'DELETE' })
    await refresh()
    toast({ title: 'Webhook deleted' })
  }
  catch {
    toast({ title: 'Failed to delete webhook', variant: 'destructive' })
  }
}

async function testWebhook(webhook: Webhook) {
  isTesting.value = true

  try {
    const result = await $fetch<{ data: { statusCode: number; success: boolean; responseBody: string } }>(
      `/api/publisher/webhooks/${webhook.id}/test`,
      { method: 'POST' },
    )

    if (result.data.success) {
      toast({ title: 'Test successful', description: `Status: ${result.data.statusCode}` })
    }
    else {
      toast({
        title: 'Test failed',
        description: `Status: ${result.data.statusCode || 'Network error'}`,
        variant: 'destructive',
      })
    }
  }
  catch {
    toast({ title: 'Failed to send test', variant: 'destructive' })
  }
  finally {
    isTesting.value = false
  }
}

async function viewLogs(webhook: Webhook) {
  selectedWebhook.value = webhook
  showLogsSlide.value = true
  logsLoading.value = true

  try {
    const result = await $fetch<{ data: WebhookLog[] }>(
      `/api/publisher/webhooks/${webhook.id}/logs`,
    )
    logs.value = result.data
  }
  catch {
    toast({ title: 'Failed to load logs', variant: 'destructive' })
  }
  finally {
    logsLoading.value = false
  }
}

function copySecret() {
  if (createdSecret.value) {
    navigator.clipboard.writeText(createdSecret.value)
    toast({ title: 'Secret copied to clipboard' })
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '---'
  return new Date(dateStr).toLocaleString()
}

function getStatusDotClass(code: number | null): string {
  if (!code || code === 0) return 'bg-[hsl(var(--destructive))]'
  if (code >= 200 && code < 300) return 'bg-[hsl(var(--accent))]'
  if (code >= 400 && code < 500) return 'bg-[hsl(var(--muted-foreground))]'
  return 'bg-[hsl(var(--destructive))]'
}

function getStatusTextClass(code: number | null): string {
  if (!code || code === 0) return 'text-[hsl(var(--destructive))]'
  if (code >= 200 && code < 300) return 'text-[hsl(var(--accent-foreground))]'
  if (code >= 400 && code < 500) return 'text-[hsl(var(--muted-foreground))]'
  return 'text-[hsl(var(--destructive))]'
}

function isEventSelected(eventValue: string): boolean {
  return createForm.value.events.includes(eventValue)
}

function toggleCreateEvent(eventValue: string) {
  const idx = createForm.value.events.indexOf(eventValue)
  if (idx >= 0) {
    createForm.value.events.splice(idx, 1)
  }
  else {
    createForm.value.events.push(eventValue)
  }
}

function isEditEventSelected(eventValue: string): boolean {
  return editForm.value.events.includes(eventValue)
}

function toggleEditEvent(eventValue: string) {
  const idx = editForm.value.events.indexOf(eventValue)
  if (idx >= 0) {
    editForm.value.events.splice(idx, 1)
  }
  else {
    editForm.value.events.push(eventValue)
  }
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Webhooks</h2>
      <Button @click="showCreateModal = true">
        <Plus class="h-4 w-4 mr-2" />
        Create Webhook
      </Button>
    </div>

    <!-- Created secret alert -->
    <Alert v-if="createdSecret" variant="destructive" class="mb-6">
      <AlertTriangle class="h-4 w-4" />
      <AlertTitle>Save your signing secret!</AlertTitle>
      <AlertDescription>
        <p class="text-sm mb-2">This secret is used to verify webhook payloads. It won't be shown again.</p>
        <div class="flex items-center gap-2">
          <code class="text-xs bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] px-2 py-1 rounded font-mono break-all">{{ createdSecret }}</code>
          <Button size="sm" variant="outline" @click="copySecret">
            <Clipboard class="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>
      </AlertDescription>
    </Alert>

    <!-- Webhooks table -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>URL</TableHead>
            <TableHead>Events</TableHead>
            <TableHead>Active</TableHead>
            <TableHead class="w-[150px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell colspan="5" class="text-center py-8">
              <Loader2 class="h-6 w-6 animate-spin mx-auto text-[hsl(var(--muted-foreground))]" />
            </TableCell>
          </TableRow>
          <TableRow v-for="webhook in webhooks" :key="webhook.id">
            <TableCell>
              <span class="font-medium text-[hsl(var(--foreground))]">{{ webhook.name }}</span>
            </TableCell>
            <TableCell>
              <code class="text-xs font-mono text-[hsl(var(--muted-foreground))] truncate max-w-xs block">{{ webhook.url }}</code>
            </TableCell>
            <TableCell>
              <div class="flex flex-wrap gap-1">
                <span
                  v-for="evt in webhook.events.slice(0, 3)"
                  :key="evt"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                >
                  {{ evt }}
                </span>
                <span
                  v-if="webhook.events.length > 3"
                  class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                >
                  +{{ webhook.events.length - 3 }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <Switch
                :checked="webhook.isActive"
                @update:checked="toggleActive(webhook)"
              />
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  :disabled="isTesting"
                  @click="testWebhook(webhook)"
                >
                  <Loader2 v-if="isTesting" class="h-4 w-4 animate-spin" />
                  <Play v-else class="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  @click="viewLogs(webhook)"
                >
                  <FileText class="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  @click="openEdit(webhook)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  @click="deleteWebhook(webhook)"
                >
                  <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Empty state -->
      <div v-if="webhooks.length === 0 && status !== 'pending'" class="text-center py-12">
        <Zap class="w-9 h-9 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No webhooks configured yet.</p>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">Create a webhook to receive event notifications.</p>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog v-model:open="showCreateModal" @close="closeCreateModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="createWebhook" class="space-y-4">
          <div class="space-y-2">
            <Label for="webhook-name">Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input id="webhook-name" v-model="createForm.name" placeholder="e.g., Deploy Hook" class="w-full" />
          </div>

          <div class="space-y-2">
            <Label for="webhook-url">URL <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input id="webhook-url" v-model="createForm.url" placeholder="https://example.com/webhook" type="url" class="w-full" />
          </div>

          <div class="space-y-2">
            <Label>Events</Label>
            <div class="space-y-2">
              <label
                v-for="evt in availableEvents"
                :key="evt.value"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="isEventSelected(evt.value)"
                  class="rounded border-[hsl(var(--border))]"
                  @change="toggleCreateEvent(evt.value)"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">{{ evt.label }}</span>
                <code class="text-xs text-[hsl(var(--muted-foreground))] font-mono">{{ evt.value }}</code>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" @click="closeCreateModal">Cancel</Button>
            <Button
              type="submit"
              :disabled="!createForm.name.trim() || !createForm.url.trim() || createForm.events.length === 0 || isSubmitting"
            >
              <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Edit Modal -->
    <Dialog v-model:open="showEditModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Webhook</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="saveEdit" class="space-y-4">
          <div class="space-y-2">
            <Label for="edit-webhook-name">Name</Label>
            <Input id="edit-webhook-name" v-model="editForm.name" class="w-full" />
          </div>

          <div class="space-y-2">
            <Label for="edit-webhook-url">URL</Label>
            <Input id="edit-webhook-url" v-model="editForm.url" type="url" class="w-full" />
          </div>

          <div class="space-y-2">
            <Label>Events</Label>
            <div class="space-y-2">
              <label
                v-for="evt in availableEvents"
                :key="evt.value"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="isEditEventSelected(evt.value)"
                  class="rounded border-[hsl(var(--border))]"
                  @change="toggleEditEvent(evt.value)"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">{{ evt.label }}</span>
                <code class="text-xs text-[hsl(var(--muted-foreground))] font-mono">{{ evt.value }}</code>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" @click="showEditModal = false">Cancel</Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delivery Logs Sheet -->
    <Sheet v-model:open="showLogsSlide">
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Delivery Logs</SheetTitle>
          <SheetDescription>{{ selectedWebhook?.name }} -- Last 10 deliveries</SheetDescription>
        </SheetHeader>

        <div class="mt-6">
          <div v-if="logsLoading" class="flex justify-center py-8">
            <RefreshCw class="w-6 h-6 animate-spin text-[hsl(var(--muted-foreground))]" />
          </div>

          <div v-else-if="logs.length === 0" class="text-center py-8">
            <p class="text-[hsl(var(--muted-foreground))]">No delivery logs yet.</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="log in logs"
              :key="log.id"
              class="border border-[hsl(var(--border))] rounded-lg p-3"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="getStatusDotClass(log.statusCode)" />
                  <span class="text-sm font-medium" :class="getStatusTextClass(log.statusCode)">
                    {{ log.statusCode || 'ERR' }}
                  </span>
                  <span class="text-sm text-[hsl(var(--foreground))] font-medium">{{ log.event }}</span>
                </div>
                <span class="text-xs text-[hsl(var(--muted-foreground))]">{{ formatDate(log.deliveredAt) }}</span>
              </div>
              <div v-if="log.responseBody" class="mt-1">
                <code class="text-xs text-[hsl(var(--muted-foreground))] break-all block max-h-20 overflow-auto font-mono">{{ log.responseBody }}</code>
              </div>
            </div>
          </div>

          <div class="mt-6">
            <Button variant="ghost" class="w-full" @click="showLogsSlide = false">Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
