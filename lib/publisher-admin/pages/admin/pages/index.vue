<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const toast = useToast()

// Fetch page types for display names
const { data: pageTypesData } = await useFetch<{ data: Array<{ name: string; displayName: string }> }>('/api/publisher/page-types')
const pageTypesMap = computed(() => {
  const map: Record<string, string> = {}
  pageTypesData.value?.data?.forEach((pt) => {
    map[pt.name] = pt.displayName
  })
  return map
})

// Search & filter state
const search = ref('')
const statusFilter = ref<string>('all')
const page = ref(1)
const pageSize = 10

// Debounced search (manual implementation)
const debouncedSearch = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, (newValue) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = newValue
    page.value = 1 // Reset to first page on search
  }, 300)
})

// Cleanup debounce timeout on unmount
onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

// Reset page when status filter changes
watch(statusFilter, () => {
  page.value = 1
})

// Build query params
const queryParams = computed(() => {
  const params: Record<string, string> = {
    'pagination[page]': String(page.value),
    'pagination[pageSize]': String(pageSize),
    sort: 'updatedAt:desc',
  }

  if (debouncedSearch.value) {
    params.search = debouncedSearch.value
  }

  if (statusFilter.value && statusFilter.value !== 'all') {
    params.status = statusFilter.value
  }

  return params
})

// Fetch pages
const { data: pagesData, refresh, status } = await useFetch<{
  data: Array<{
    id: number
    title: string
    slug: string
    pageType: string
    status: string
    updatedAt: string
  }>
  meta: { pagination: { page: number; pageSize: number; total: number; pageCount: number } }
}>('/api/v1/pages', {
  query: queryParams,
  watch: [queryParams],
})

const pages = computed(() => pagesData.value?.data || [])
const pagination = computed(() => pagesData.value?.meta?.pagination || { page: 1, pageSize: 25, total: 0, pageCount: 0 })

// Table columns
const columns = [
  { accessorKey: 'title', header: 'Title' },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'pageType', header: 'Page Type' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'updatedAt', header: 'Updated' },
  { id: 'actions' },
]

// Status filter options
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
]

// Delete modal
const showDeleteModal = ref(false)
const pageToDelete = ref<{ id: number; title: string } | null>(null)

async function deletePage() {
  if (!pageToDelete.value) return
  try {
    await $fetch(`/api/v1/pages/${pageToDelete.value.id}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Page deleted', color: 'success' })
  }
  catch {
    toast.add({ title: 'Failed to delete page', color: 'error' })
  }
  finally {
    showDeleteModal.value = false
    pageToDelete.value = null
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

function openDeleteModal(row: typeof pages.value[0]) {
  pageToDelete.value = { id: row.id, title: row.title }
  showDeleteModal.value = true
}

function navigateToEditor(row: typeof pages.value[0]) {
  navigateTo(`/admin/pages/${row.id}`)
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
        Pages
      </h2>
      <UButton
        icon="i-heroicons-plus"
        color="neutral"
        to="/admin/pages/new"
      >
        Create Page
      </UButton>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <UInput
        v-model="search"
        placeholder="Search pages..."
        icon="i-heroicons-magnifying-glass"
        class="w-64"
      />
      <USelectMenu
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
        :data="pages"
        :columns="columns"
        :loading="status === 'pending'"
        @click="navigateToEditor"
      >
        <template #title-cell="{ row }">
          <span class="font-medium text-stone-900 dark:text-stone-100">
            {{ row.original.title }}
          </span>
        </template>

        <template #slug-cell="{ row }">
          <span class="font-mono text-sm text-stone-500 dark:text-stone-400">
            {{ row.original.slug }}
          </span>
        </template>

        <template #pageType-cell="{ row }">
          <span class="text-sm text-stone-600 dark:text-stone-300">
            {{ pageTypesMap[row.original.pageType] || row.original.pageType }}
          </span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            :color="row.original.status === 'published' ? 'success' : 'neutral'"
            variant="subtle"
          >
            {{ row.original.status }}
          </UBadge>
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
              :to="`/admin/pages/${row.original.id}`"
              @click.stop
            />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click.stop="openDeleteModal(row.original)"
            />
          </div>
        </template>
      </UTable>

      <!-- Empty state -->
      <div v-if="pages.length === 0 && status !== 'pending'" class="text-center py-12">
        <UIcon
          name="i-heroicons-document-text"
          class="text-4xl text-stone-400 dark:text-stone-500 mb-3"
        />
        <p class="text-stone-500 dark:text-stone-400">No pages yet.</p>
        <UButton
          class="mt-3"
          variant="outline"
          color="neutral"
          to="/admin/pages/new"
        >
          Create your first page
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
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
            Delete Page
          </h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to delete <strong>"{{ pageToDelete?.title }}"</strong>? This page will be soft-deleted and can be recovered.
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">
              Cancel
            </UButton>
            <UButton color="error" @click="deletePage">
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
