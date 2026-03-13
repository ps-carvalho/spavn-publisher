<script setup lang="ts">
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

const toast = useToast()
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

const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'url', header: 'URL' },
  { accessorKey: 'events', header: 'Events' },
  { accessorKey: 'active', header: 'Active' },
  { id: 'actions', header: '' },
]

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
      toast.add({ title: 'Webhook created', description: 'Save the signing secret now.', color: 'success' })
    }
    else {
      showCreateModal.value = false
      toast.add({ title: 'Webhook created', color: 'success' })
    }
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast.add({ title: err?.data?.data?.error?.message || 'Failed to create webhook', color: 'error' })
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
    toast.add({ title: 'Webhook updated', color: 'success' })
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast.add({ title: err?.data?.data?.error?.message || 'Failed to update webhook', color: 'error' })
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
    toast.add({ title: 'Failed to toggle webhook', color: 'error' })
  }
}

async function deleteWebhook(webhook: Webhook) {
  if (!confirm(`Delete webhook "${webhook.name}"?`)) return

  try {
    await $fetch(`/api/publisher/webhooks/${webhook.id}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Webhook deleted', color: 'success' })
  }
  catch {
    toast.add({ title: 'Failed to delete webhook', color: 'error' })
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
      toast.add({ title: 'Test successful', description: `Status: ${result.data.statusCode}`, color: 'success' })
    }
    else {
      toast.add({
        title: 'Test failed',
        description: `Status: ${result.data.statusCode || 'Network error'}`,
        color: 'error',
      })
    }
  }
  catch {
    toast.add({ title: 'Failed to send test', color: 'error' })
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
    toast.add({ title: 'Failed to load logs', color: 'error' })
  }
  finally {
    logsLoading.value = false
  }
}

function copySecret() {
  if (createdSecret.value) {
    navigator.clipboard.writeText(createdSecret.value)
    toast.add({ title: 'Secret copied to clipboard', color: 'success' })
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString()
}

function getStatusDotClass(code: number | null): string {
  if (!code || code === 0) return 'bg-red-500 dark:bg-red-400'
  if (code >= 200 && code < 300) return 'bg-green-600 dark:bg-green-400'
  if (code >= 400 && code < 500) return 'bg-amber-500 dark:bg-amber-400'
  return 'bg-red-500 dark:bg-red-400'
}

function getStatusTextClass(code: number | null): string {
  if (!code || code === 0) return 'text-red-500 dark:text-red-400'
  if (code >= 200 && code < 300) return 'text-green-600 dark:text-green-400'
  if (code >= 400 && code < 500) return 'text-amber-500 dark:text-amber-400'
  return 'text-red-500 dark:text-red-400'
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
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Webhooks</h2>
      <UButton icon="i-heroicons-plus" color="neutral" @click="showCreateModal = true">
        Create Webhook
      </UButton>
    </div>

    <!-- Created secret alert -->
    <UAlert
      v-if="createdSecret"
      color="warning"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      title="Save your signing secret!"
      class="mb-6"
      :close-button="{ onClick: () => createdSecret = null }"
    >
      <template #description>
        <p class="text-sm mb-2">This secret is used to verify webhook payloads. It won't be shown again.</p>
        <div class="flex items-center gap-2">
          <code class="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-2 py-1 rounded font-mono break-all">{{ createdSecret }}</code>
          <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-clipboard" @click="copySecret">
            Copy
          </UButton>
        </div>
      </template>
    </UAlert>

    <!-- Webhooks table -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <UTable :data="webhooks" :columns="columns" :loading="status === 'pending'">
        <template #name-cell="{ row }">
          <span class="font-medium text-stone-900 dark:text-stone-100">{{ row.original.name }}</span>
        </template>

        <template #url-cell="{ row }">
          <code class="text-xs font-mono text-stone-600 dark:text-stone-400 truncate max-w-xs block">{{ row.original.url }}</code>
        </template>

        <template #events-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <span
              v-for="evt in row.original.events.slice(0, 3)"
              :key="evt"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
            >
              {{ evt }}
            </span>
            <span
              v-if="row.original.events.length > 3"
              class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400"
            >
              +{{ row.original.events.length - 3 }}
            </span>
          </div>
        </template>

        <template #active-cell="{ row }">
          <USwitch
            :model-value="row.original.isActive"
            @update:model-value="toggleActive(row.original)"
          />
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-play"
              :loading="isTesting"
              @click="testWebhook(row.original)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-document-text"
              @click="viewLogs(row.original)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-pencil"
              @click="openEdit(row.original)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click="deleteWebhook(row.original)"
            />
          </div>
        </template>
      </UTable>

      <!-- Empty state -->
      <div v-if="webhooks.length === 0 && status !== 'pending'" class="text-center py-12">
        <UIcon name="i-heroicons-bolt" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">No webhooks configured yet.</p>
        <p class="text-sm text-stone-400 dark:text-stone-500 mt-1">Create a webhook to receive event notifications.</p>
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal" @close="closeCreateModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Create Webhook</h3>
          <form @submit.prevent="createWebhook" class="space-y-4">
            <UFormField label="Name" required>
              <UInput v-model="createForm.name" placeholder="e.g., Deploy Hook" class="w-full" />
            </UFormField>

            <UFormField label="URL" required>
              <UInput v-model="createForm.url" placeholder="https://example.com/webhook" type="url" class="w-full" />
            </UFormField>

            <UFormField label="Events">
              <div class="space-y-2">
                <label
                  v-for="evt in availableEvents"
                  :key="evt.value"
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="isEventSelected(evt.value)"
                    class="rounded border-stone-300 dark:border-stone-600"
                    @change="toggleCreateEvent(evt.value)"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">{{ evt.label }}</span>
                  <code class="text-xs text-stone-400 dark:text-stone-500 font-mono">{{ evt.value }}</code>
                </label>
              </div>
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="closeCreateModal">Cancel</UButton>
              <UButton
                type="submit"
                color="neutral"
                :loading="isSubmitting"
                :disabled="!createForm.name.trim() || !createForm.url.trim() || createForm.events.length === 0"
              >
                Create
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Edit Webhook</h3>
          <form @submit.prevent="saveEdit" class="space-y-4">
            <UFormField label="Name">
              <UInput v-model="editForm.name" class="w-full" />
            </UFormField>

            <UFormField label="URL">
              <UInput v-model="editForm.url" type="url" class="w-full" />
            </UFormField>

            <UFormField label="Events">
              <div class="space-y-2">
                <label
                  v-for="evt in availableEvents"
                  :key="evt.value"
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="isEditEventSelected(evt.value)"
                    class="rounded border-stone-300 dark:border-stone-600"
                    @change="toggleEditEvent(evt.value)"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">{{ evt.label }}</span>
                  <code class="text-xs text-stone-400 dark:text-stone-500 font-mono">{{ evt.value }}</code>
                </label>
              </div>
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="showEditModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral" :loading="isSubmitting">Save</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Delivery Logs Slideover -->
    <USlideover v-model:open="showLogsSlide">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-1">Delivery Logs</h3>
          <p class="text-sm text-stone-400 dark:text-stone-500 mb-4">{{ selectedWebhook?.name }} — Last 10 deliveries</p>

          <div v-if="logsLoading" class="flex justify-center py-8">
            <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-stone-400" />
          </div>

          <div v-else-if="logs.length === 0" class="text-center py-8">
            <p class="text-stone-400 dark:text-stone-500">No delivery logs yet.</p>
          </div>

          <div v-else class="space-y-3">
            <div
              v-for="log in logs"
              :key="log.id"
              class="border border-stone-200 dark:border-stone-700 rounded-lg p-3"
            >
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="getStatusDotClass(log.statusCode)" />
                  <span class="text-sm font-medium" :class="getStatusTextClass(log.statusCode)">
                    {{ log.statusCode || 'ERR' }}
                  </span>
                  <span class="text-sm text-stone-700 dark:text-stone-300 font-medium">{{ log.event }}</span>
                </div>
                <span class="text-xs text-stone-400 dark:text-stone-500">{{ formatDate(log.deliveredAt) }}</span>
              </div>
              <div v-if="log.responseBody" class="mt-1">
                <code class="text-xs text-stone-500 dark:text-stone-400 break-all block max-h-20 overflow-auto font-mono">{{ log.responseBody }}</code>
              </div>
            </div>
          </div>

          <div class="mt-6">
            <UButton variant="ghost" color="neutral" block @click="showLogsSlide = false">Close</UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
