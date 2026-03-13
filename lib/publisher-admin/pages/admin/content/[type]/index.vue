<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const toast = useToast()
const typeName = computed(() => route.params.type as string)

// Fetch content type config
const { data: typeData } = await useFetch<{ data: any[] }>('/api/publisher/types')
const contentType = computed(() => typeData.value?.data?.find((t: any) => t.pluralName === typeName.value))

// Search & filter state
const search = ref('')
const statusFilter = ref<string>('')
const page = ref(1)
const pageSize = 25

// Build query params
const queryParams = computed(() => {
  const params: Record<string, string> = {
    'pagination[page]': String(page.value),
    'pagination[pageSize]': String(pageSize),
    'sort': 'createdAt:desc',
  }

  // Search by first string field
  if (search.value && contentType.value) {
    const firstStringField = Object.entries(contentType.value.fields)
      .find(([_, f]: [string, any]) => f.type === 'string')?.[0]
    if (firstStringField) {
      params[`filters[${firstStringField}][$contains]`] = search.value
    }
  }

  // Status filter
  if (statusFilter.value) {
    params['filters[status]'] = statusFilter.value
  }

  return params
})

// Fetch entries
const { data: entriesData, refresh, status } = await useFetch<{
  data: Record<string, unknown>[]
  meta: { pagination: { page: number; pageSize: number; total: number; pageCount: number } }
}>(() => `/api/v1/${typeName.value}`, {
  query: queryParams,
  watch: [queryParams],
})

const entries = computed(() => entriesData.value?.data || [])
const pagination = computed(() => entriesData.value?.meta?.pagination || { page: 1, pageSize: 25, total: 0, pageCount: 0 })

// Derive table columns from content type (first 4 non-body fields + status + updatedAt)
const columns = computed(() => {
  if (!contentType.value) return []

  const cols: { accessorKey?: string; id?: string; header: string }[] = []

  let count = 0
  for (const [name, config] of Object.entries(contentType.value.fields) as [string, any][]) {
    if (config.type === 'richtext' || config.type === 'text' || config.type === 'password') continue
    if (count >= 4) break
    cols.push({ accessorKey: name, header: config.label || name })
    count++
  }

  if (contentType.value.options?.draftAndPublish) {
    cols.push({ accessorKey: 'status', header: 'Status' })
  }

  cols.push({ accessorKey: 'updatedAt', header: 'Updated' })
  cols.push({ id: 'actions', header: '' })

  return cols
})

// Status filter options
const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
]

// Delete modal
const showDeleteModal = ref(false)
const entryToDelete = ref<number | null>(null)

async function deleteEntry() {
  if (!entryToDelete.value) return
  try {
    await $fetch(`/api/v1/${typeName.value}/${entryToDelete.value}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Entry deleted', color: 'success' })
  }
  catch {
    toast.add({ title: 'Failed to delete entry', color: 'error' })
  }
  finally {
    showDeleteModal.value = false
    entryToDelete.value = null
  }
}

function formatDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '—'
  return new Date(dateStr).toLocaleDateString()
}

function getStatusDotClass(status: string): string {
  if (status === 'published') return 'bg-green-600 dark:bg-green-400'
  return 'bg-amber-500 dark:bg-amber-400'
}

function getStatusTextClass(status: string): string {
  if (status === 'published') return 'text-green-600 dark:text-green-400'
  return 'text-amber-500 dark:text-amber-400'
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
        {{ contentType?.displayName || typeName }}
      </h2>
      <UButton
        icon="i-heroicons-plus"
        color="neutral"
        :to="`/admin/content/${typeName}/new`"
      >
        Create Entry
      </UButton>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <UInput
        v-model="search"
        placeholder="Search..."
        icon="i-heroicons-magnifying-glass"
        class="w-64"
      />
      <USelectMenu
        v-if="contentType?.options?.draftAndPublish"
        v-model="statusFilter"
        :items="statusOptions"
        value-key="value"
        placeholder="Status"
        class="w-40"
      />
    </div>

    <!-- Table card -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <UTable
        :data="entries"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #status-cell="{ row }">
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="getStatusDotClass(row.original.status as string || 'draft')"
            />
            <span
              class="text-sm capitalize"
              :class="getStatusTextClass(row.original.status as string || 'draft')"
            >
              {{ row.original.status || 'draft' }}
            </span>
          </div>
        </template>

        <template #updatedAt-cell="{ row }">
          <span class="text-sm text-stone-500 dark:text-stone-400">
            {{ formatDate(row.original.updatedAt) }}
          </span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-pencil"
              :to="`/admin/content/${typeName}/${row.original.id}`"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click.stop="entryToDelete = row.original.id as number; showDeleteModal = true"
            />
          </div>
        </template>
      </UTable>

      <!-- Empty state -->
      <div v-if="entries.length === 0 && status !== 'pending'" class="text-center py-12">
        <UIcon
          :name="contentType?.icon || 'i-heroicons-inbox'"
          class="text-4xl text-stone-400 dark:text-stone-500 mb-3"
        />
        <p class="text-stone-500 dark:text-stone-400">No entries yet.</p>
        <UButton
          class="mt-3"
          variant="outline"
          color="neutral"
          :to="`/admin/content/${typeName}/new`"
        >
          Create your first entry
        </UButton>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.pageCount > 1" class="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800">
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Showing {{ ((pagination.page - 1) * pageSize) + 1 }}–{{ Math.min(pagination.page * pageSize, pagination.total) }} of {{ pagination.total }}
        </p>
        <UPagination
          v-model="page"
          :total="pagination.total"
          :items-per-page="pageSize"
        />
      </div>
    </div>

    <!-- Delete confirmation -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Delete Entry</h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to delete this entry? {{ contentType?.options?.softDelete ? 'It will be soft-deleted and can be recovered.' : 'This action cannot be undone.' }}
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="error" @click="deleteEntry">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
