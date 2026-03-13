<script setup lang="ts">
import type { FieldConfig } from '~~/lib/publisher/types'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface ContentTypeSummary {
  name: string
  displayName: string
  pluralName: string
  icon?: string
  description?: string
  fieldCount: number
  fields: Record<string, FieldConfig>
  options?: any
  isSystem?: boolean
  active?: boolean
}

const toast = useToast()

// Fetch content types
const { data: contentTypesData, refresh: refreshContentTypes, status: contentTypesStatus } = await useFetch<{ data: ContentTypeSummary[] }>('/api/publisher/types')

const contentTypes = computed(() => contentTypesData.value?.data || [])

// Search & pagination state
const search = ref('')
const debouncedSearch = ref('')
const page = ref(1)
const pageSize = 10

// Debounced search
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

// Filter content types based on search
const filteredContentTypes = computed(() => {
  let data = contentTypes.value
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase()
    data = data.filter(t => 
      t.displayName.toLowerCase().includes(query) ||
      t.name.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    )
  }
  return data
})

// Paginated content types
const paginatedContentTypes = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredContentTypes.value.slice(start, start + pageSize)
})

const totalPages = computed(() => 
  Math.ceil(filteredContentTypes.value.length / pageSize)
)

// Delete confirmation
const showDeleteModal = ref(false)
const deleteTarget = ref<{ name: string, displayName: string } | null>(null)
const isDeleting = ref(false)

function openDeleteModal(name: string, displayName: string) {
  deleteTarget.value = { name, displayName }
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/types/${deleteTarget.value.name}`, { method: 'DELETE' })
    await refreshContentTypes()
    toast.add({ title: `${deleteTarget.value.displayName} deleted`, color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isDeleting.value = false
    showDeleteModal.value = false
    deleteTarget.value = null
  }
}

// Content type columns
const contentTypeColumns = [
  { accessorKey: 'icon', header: '' },
  { accessorKey: 'displayName', header: 'Display Name' },
  { accessorKey: 'name', header: 'API Name' },
  { accessorKey: 'fieldCount', header: 'Fields' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' },
]

function getFieldCount(fields: Record<string, any> | undefined): number {
  return fields ? Object.keys(fields).length : 0
}

function getContentTypeRows() {
  return paginatedContentTypes.value.map(t => ({
    ...t,
    icon: t.icon || 'i-heroicons-cube',
    fieldCount: getFieldCount(t.fields),
  }))
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Content Types</h2>
      <UButton
        icon="i-heroicons-plus"
        color="neutral"
        to="/admin/types/content/new"
      >
        Create Content Type
      </UButton>
    </div>

    <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">
      Define content structures for your API
    </p>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <UInput
        v-model="search"
        placeholder="Search content types..."
        icon="i-heroicons-magnifying-glass"
        class="w-64"
      />
    </div>

    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <UTable
        :data="getContentTypeRows()"
        :columns="contentTypeColumns"
        :loading="contentTypesStatus === 'pending'"
      >
        <template #icon-cell="{ row }">
          <UIcon :name="row.original.icon" class="text-lg text-stone-500 dark:text-stone-400" />
        </template>

        <template #displayName-cell="{ row }">
          <div class="flex items-center gap-2">
            <NuxtLink
              :to="`/admin/types/content/${row.original.name}`"
              class="font-medium text-stone-900 dark:text-stone-100 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {{ row.original.displayName }}
            </NuxtLink>
            <UBadge v-if="row.original.isSystem" color="info" variant="subtle" size="xs">
              System
            </UBadge>
          </div>
        </template>

        <template #name-cell="{ row }">
          <code class="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono">
            {{ row.original.name }}
          </code>
        </template>

        <template #fieldCount-cell="{ row }">
          <span class="text-sm text-stone-600 dark:text-stone-400">
            {{ row.original.fieldCount }} fields
          </span>
        </template>

        <template #status-cell="{ row }">
          <UBadge
            v-if="row.original.active === false"
            color="error"
            variant="subtle"
            size="xs"
          >
            Disabled
          </UBadge>
          <UBadge v-else color="success" variant="subtle" size="xs">
            Active
          </UBadge>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-pencil"
              :to="`/admin/types/content/${row.original.name}`"
            />
            <UButton
              v-if="!row.original.isSystem"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click="openDeleteModal(row.original.name, row.original.displayName)"
            />
          </div>
        </template>
      </UTable>

      <div v-if="filteredContentTypes.length === 0 && contentTypesStatus !== 'pending'" class="text-center py-12">
        <UIcon name="i-heroicons-cube" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">No content types found.</p>
        <UButton
          v-if="!search"
          variant="soft"
          color="neutral"
          icon="i-heroicons-plus"
          to="/admin/types/content/new"
          class="mt-4"
        >
          Create your first content type
        </UButton>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800">
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Showing {{ ((page - 1) * pageSize) + 1 }}–{{ Math.min(page * pageSize, filteredContentTypes.length) }} of {{ filteredContentTypes.length }}
        </p>
        <UPagination
          v-model:page="page"
          :total="filteredContentTypes.length"
          :items-per-page="pageSize"
        />
      </div>
    </div>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
            Delete Content Type
          </h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to delete <span class="font-medium text-stone-700 dark:text-stone-300">{{ deleteTarget?.displayName }}</span>?
            This will disable the type but preserve existing data.
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">
              Cancel
            </UButton>
            <UButton color="error" :loading="isDeleting" @click="confirmDelete">
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
