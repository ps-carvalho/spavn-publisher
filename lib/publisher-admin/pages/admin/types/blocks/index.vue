<script setup lang="ts">
import type { FieldConfig, BlockTypeConfig } from '~~/lib/publisher/types'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface BlockTypeSummary {
  id?: number
  name: string
  displayName: string
  icon?: string
  category?: string
  description?: string
  fields: Record<string, FieldConfig>
  isSystem?: boolean
  active?: boolean
  createdAt?: string
}

const toast = useToast()
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedBlockType = ref<BlockTypeSummary | null>(null)
const isSubmitting = ref(false)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

// Form state
const form = ref({
  name: '',
  displayName: '',
  category: 'text',
  icon: '',
  description: '',
  fields: {} as Record<string, FieldConfig>,
})

const categories = [
  { label: 'Layout', value: 'layout' },
  { label: 'Media', value: 'media' },
  { label: 'Text', value: 'text' },
  { label: 'Interactive', value: 'interactive' },
  { label: 'Data', value: 'data' },
]

// Fetch block types
const { data, refresh, status } = await useFetch<{ data: BlockTypeSummary[] }>('/api/publisher/block-types')
const blockTypes = computed(() => data.value?.data || [])

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

// Filter block types based on search
const filteredBlockTypes = computed(() => {
  let data = blockTypes.value
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase()
    data = data.filter(bt => 
      bt.displayName.toLowerCase().includes(query) ||
      bt.name.toLowerCase().includes(query) ||
      (bt.category && bt.category.toLowerCase().includes(query)) ||
      (bt.description && bt.description.toLowerCase().includes(query))
    )
  }
  return data
})

// Paginated block types
const paginatedBlockTypes = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredBlockTypes.value.slice(start, start + pageSize)
})

const totalPages = computed(() => 
  Math.ceil(filteredBlockTypes.value.length / pageSize)
)

const columns = [
  { accessorKey: 'icon', header: '' },
  { accessorKey: 'displayName', header: 'Display Name' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'name', header: 'API Name' },
  { accessorKey: 'fieldCount', header: 'Fields' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' },
]

function resetForm() {
  form.value = {
    name: '',
    displayName: '',
    category: 'text',
    icon: '',
    description: '',
    fields: {},
  }
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function openEditModal(blockType: BlockTypeSummary) {
  selectedBlockType.value = blockType
  form.value = {
    name: blockType.name,
    displayName: blockType.displayName,
    category: blockType.category || 'text',
    icon: blockType.icon || '',
    description: blockType.description || '',
    fields: { ...blockType.fields },
  }
  showEditModal.value = true
}

async function createBlockType() {
  if (!form.value.displayName.trim() || !form.value.name.trim()) {
    toast.add({ title: 'Name and display name are required', color: 'error' })
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/publisher/block-types', {
      method: 'POST',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        category: form.value.category,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        fields: form.value.fields,
      },
    })

    await refresh()
    showCreateModal.value = false
    toast.add({ title: 'Block type created', color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to create block type'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

async function updateBlockType() {
  if (!selectedBlockType.value) return

  isSubmitting.value = true

  try {
    await $fetch(`/api/publisher/block-types/${selectedBlockType.value.name}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        category: form.value.category,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        fields: form.value.fields,
      },
    })

    await refresh()
    showEditModal.value = false
    toast.add({ title: 'Block type updated', color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to update block type'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

function openDeleteModal(blockType: BlockTypeSummary) {
  selectedBlockType.value = blockType
  showDeleteModal.value = true
}

async function deleteBlockType() {
  if (!selectedBlockType.value) return

  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/block-types/${selectedBlockType.value.name}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Block type deleted', color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete block type'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isDeleting.value = false
    showDeleteModal.value = false
    selectedBlockType.value = null
  }
}

function getFieldCount(fields: Record<string, any> | undefined): number {
  return fields ? Object.keys(fields).length : 0
}

function getRows() {
  return paginatedBlockTypes.value.map(bt => ({
    ...bt,
    icon: bt.icon || 'i-heroicons-squares-2x2',
    fieldCount: getFieldCount(bt.fields),
  }))
}

// Auto-generate name from displayName
watch(() => form.value.displayName, (displayName) => {
  if (!showEditModal.value && (!form.value.name || form.value.name === slugify(form.value.name))) {
    form.value.name = slugify(displayName)
  }
})

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Block Types</h2>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Reusable components for the page builder
        </p>
      </div>
      <UButton icon="i-heroicons-plus" color="neutral" @click="openCreateModal">
        Create Block Type
      </UButton>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <UInput
        v-model="search"
        placeholder="Search block types..."
        icon="i-heroicons-magnifying-glass"
        class="w-64"
      />
    </div>

    <!-- Table -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <UTable
        :data="getRows()"
        :columns="columns"
        :loading="status === 'pending'"
      >
        <template #icon-cell="{ row }">
          <UIcon :name="row.original.icon" class="text-lg text-stone-500 dark:text-stone-400" />
        </template>

        <template #displayName-cell="{ row }">
          <div class="flex items-center gap-2">
            <button
              @click="openEditModal(row.original)"
              class="font-medium text-stone-900 dark:text-stone-100 hover:text-blue-600 dark:hover:text-blue-400"
            >
              {{ row.original.displayName }}
            </button>
            <UBadge v-if="row.original.isSystem" color="info" variant="subtle" size="xs">
              System
            </UBadge>
          </div>
        </template>

        <template #category-cell="{ row }">
          <UBadge v-if="row.original.category" color="info" variant="subtle" size="xs">
            {{ row.original.category }}
          </UBadge>
          <span v-else class="text-stone-400 dark:text-stone-500">—</span>
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
              @click="openEditModal(row.original)"
            />
            <UButton
              v-if="!row.original.isSystem"
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click="openDeleteModal(row.original)"
            />
          </div>
        </template>
      </UTable>

      <!-- Empty state -->
      <div v-if="filteredBlockTypes.length === 0 && status !== 'pending'" class="text-center py-12">
        <UIcon name="i-heroicons-squares-2x2" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p v-if="debouncedSearch" class="text-stone-500 dark:text-stone-400">No block types found.</p>
        <template v-else>
          <p class="text-stone-500 dark:text-stone-400">No block types defined.</p>
          <UButton
            variant="soft"
            color="neutral"
            icon="i-heroicons-plus"
            class="mt-4"
            @click="openCreateModal"
          >
            Create your first block type
          </UButton>
        </template>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800">
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Showing {{ ((page - 1) * pageSize) + 1 }}–{{ Math.min(page * pageSize, filteredBlockTypes.length) }} of {{ filteredBlockTypes.length }}
        </p>
        <UPagination
          v-model:page="page"
          :total="filteredBlockTypes.length"
          :items-per-page="pageSize"
        />
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6 max-h-[85vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Create Block Type</h3>

          <form @submit.prevent="createBlockType" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Display Name" required>
                <UInput v-model="form.displayName" placeholder="e.g., Hero Section" />
              </UFormField>

              <UFormField label="API Name" required>
                <UInput v-model="form.name" placeholder="e.g., hero-section" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Category">
                <USelect
                  v-model="form.category"
                  :items="categories"
                  value-key="value"
                  label-key="label"
                />
              </UFormField>

              <UFormField label="Icon">
                <UInput v-model="form.icon" placeholder="e.g., i-heroicons-photo" />
              </UFormField>
            </div>

            <UFormField label="Description">
              <UTextarea v-model="form.description" placeholder="What is this block for?" :rows="3" />
            </UFormField>

            <div class="border-t border-stone-200 dark:border-stone-700 pt-4">
              <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">Fields</h4>
              <PublisherFieldEditor v-model="form.fields" mode="block" />
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="ghost" color="neutral" @click="showCreateModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral" :loading="isSubmitting">Create</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal">
      <template #content>
        <div class="p-6 max-h-[85vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Edit Block Type</h3>

          <form @submit.prevent="updateBlockType" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Display Name" required>
                <UInput v-model="form.displayName" placeholder="e.g., Hero Section" />
              </UFormField>

              <UFormField label="API Name" required>
                <UInput v-model="form.name" placeholder="e.g., hero-section" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Category">
                <USelect
                  v-model="form.category"
                  :items="categories"
                  value-key="value"
                  label-key="label"
                />
              </UFormField>

              <UFormField label="Icon">
                <UInput v-model="form.icon" placeholder="e.g., i-heroicons-photo" />
              </UFormField>
            </div>

            <UFormField label="Description">
              <UTextarea v-model="form.description" placeholder="What is this block for?" :rows="3" />
            </UFormField>

            <div class="border-t border-stone-200 dark:border-stone-700 pt-4">
              <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">Fields</h4>
              <PublisherFieldEditor v-model="form.fields" mode="block" />
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="ghost" color="neutral" @click="showEditModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral" :loading="isSubmitting">Save</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Delete Block Type</h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to delete <span class="font-medium text-stone-700 dark:text-stone-300">{{ selectedBlockType?.displayName }}</span>?
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="error" :loading="isDeleting" @click="deleteBlockType">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
