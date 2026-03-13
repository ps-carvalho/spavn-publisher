<script setup lang="ts">
import type { FieldConfig, AreaConfig, PageTypeOptions } from '~~/lib/publisher/types'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface PageTypeSummary {
  id?: number
  name: string
  displayName: string
  icon?: string
  description?: string
  areas: Record<string, AreaConfig>
  options?: PageTypeOptions
  isSystem?: boolean
  active?: boolean
  createdAt?: string
}

interface BlockTypeSummary {
  name: string
  displayName: string
}

const toast = useToast()
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedPageType = ref<PageTypeSummary | null>(null)
const isSubmitting = ref(false)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

// Form state
const form = ref({
  name: '',
  displayName: '',
  icon: '',
  description: '',
  areas: {} as Record<string, AreaConfig>,
  options: {
    draftAndPublish: true,
    timestamps: true,
    softDelete: false,
    seo: true,
  } as PageTypeOptions,
})

// Area form state
const showAreaModal = ref(false)
const editingAreaName = ref<string | null>(null)
const areaForm = ref({
  name: '',
  displayName: '',
  allowedBlocks: [] as string[],
  minBlocks: undefined as number | undefined,
  maxBlocks: undefined as number | undefined,
})

// Fetch page types
const { data, refresh, status } = await useFetch<{ data: PageTypeSummary[] }>('/api/publisher/page-types')
const pageTypes = computed(() => data.value?.data || [])

// Fetch block types for allowedBlocks selection
const { data: blockTypesData } = await useFetch<{ data: BlockTypeSummary[] }>('/api/publisher/block-types')
const blockTypes = computed(() => blockTypesData.value?.data || [])

const blockTypeOptions = computed(() =>
  blockTypes.value.map(bt => ({
    label: bt.displayName,
    value: bt.name,
  })),
)

const columns = [
  { accessorKey: 'icon', header: '' },
  { accessorKey: 'displayName', header: 'Display Name' },
  { accessorKey: 'name', header: 'API Name' },
  { accessorKey: 'areaCount', header: 'Areas' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' },
]

function resetForm() {
  form.value = {
    name: '',
    displayName: '',
    icon: '',
    description: '',
    areas: {},
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: false,
      seo: true,
    },
  }
}

function resetAreaForm() {
  areaForm.value = {
    name: '',
    displayName: '',
    allowedBlocks: [],
    minBlocks: undefined,
    maxBlocks: undefined,
  }
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function openEditModal(pageType: PageTypeSummary) {
  selectedPageType.value = pageType
  form.value = {
    name: pageType.name,
    displayName: pageType.displayName,
    icon: pageType.icon || '',
    description: pageType.description || '',
    areas: { ...pageType.areas },
    options: pageType.options || {
      draftAndPublish: true,
      timestamps: true,
      softDelete: false,
      seo: true,
    },
  }
  showEditModal.value = true
}

// Area management
function openAddAreaModal() {
  editingAreaName.value = null
  resetAreaForm()
  showAreaModal.value = true
}

function openEditAreaModal(areaName: string, area: AreaConfig) {
  editingAreaName.value = areaName
  areaForm.value = {
    name: areaName,
    displayName: area.displayName,
    allowedBlocks: [...area.allowedBlocks],
    minBlocks: area.minBlocks,
    maxBlocks: area.maxBlocks,
  }
  showAreaModal.value = true
}

function saveArea() {
  if (!areaForm.value.name.trim() || !areaForm.value.displayName.trim()) {
    toast.add({ title: 'Area name and display name are required', color: 'error' })
    return
  }

  if (areaForm.value.allowedBlocks.length === 0) {
    toast.add({ title: 'Select at least one allowed block type', color: 'error' })
    return
  }

  const areaConfig: AreaConfig = {
    name: areaForm.value.name,
    displayName: areaForm.value.displayName,
    allowedBlocks: areaForm.value.allowedBlocks,
    minBlocks: areaForm.value.minBlocks,
    maxBlocks: areaForm.value.maxBlocks,
  }

  // If editing and name changed, remove old key
  if (editingAreaName.value && editingAreaName.value !== areaForm.value.name) {
    delete form.value.areas[editingAreaName.value]
  }

  form.value.areas[areaForm.value.name] = areaConfig
  showAreaModal.value = false
  toast.add({ title: editingAreaName.value ? 'Area updated' : 'Area added', color: 'success' })
}

function deleteArea(areaName: string) {
  if (!confirm(`Delete area "${areaName}"?`)) return
  delete form.value.areas[areaName]
}

function getAreaCount(areas: Record<string, any> | undefined): number {
  return areas ? Object.keys(areas).length : 0
}

function getRows() {
  return pageTypes.value.map(pt => ({
    ...pt,
    icon: pt.icon || 'i-heroicons-document-duplicate',
    areaCount: getAreaCount(pt.areas),
  }))
}

async function createPageType() {
  if (!form.value.displayName.trim() || !form.value.name.trim()) {
    toast.add({ title: 'Name and display name are required', color: 'error' })
    return
  }

  if (Object.keys(form.value.areas).length === 0) {
    toast.add({ title: 'At least one area is required', color: 'error' })
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/publisher/page-types', {
      method: 'POST',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        areas: form.value.areas,
        options: form.value.options,
      },
    })

    await refresh()
    showCreateModal.value = false
    toast.add({ title: 'Page type created', color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to create page type'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

async function updatePageType() {
  if (!selectedPageType.value) return

  isSubmitting.value = true

  try {
    await $fetch(`/api/publisher/page-types/${selectedPageType.value.name}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        areas: form.value.areas,
        options: form.value.options,
      },
    })

    await refresh()
    showEditModal.value = false
    toast.add({ title: 'Page type updated', color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to update page type'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

function openDeleteModal(pageType: PageTypeSummary) {
  selectedPageType.value = pageType
  showDeleteModal.value = true
}

async function deletePageType() {
  if (!selectedPageType.value) return

  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/page-types/${selectedPageType.value.name}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'Page type deleted', color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete page type'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isDeleting.value = false
    showDeleteModal.value = false
    selectedPageType.value = null
  }
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
        <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Page Types</h2>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Page templates with configurable areas for blocks
        </p>
      </div>
      <UButton icon="i-heroicons-plus" color="neutral" @click="openCreateModal">
        Create Page Type
      </UButton>
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

        <template #name-cell="{ row }">
          <code class="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono">
            {{ row.original.name }}
          </code>
        </template>

        <template #areaCount-cell="{ row }">
          <span class="text-sm text-stone-600 dark:text-stone-400">
            {{ row.original.areaCount }} areas
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
      <div v-if="pageTypes.length === 0 && status !== 'pending'" class="text-center py-12">
        <UIcon name="i-heroicons-document-duplicate" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">No page types defined.</p>
        <UButton
          variant="soft"
          color="neutral"
          icon="i-heroicons-plus"
          class="mt-4"
          @click="openCreateModal"
        >
          Create your first page type
        </UButton>
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal">
      <template #content>
        <div class="p-6 max-h-[85vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Create Page Type</h3>

          <form @submit.prevent="createPageType" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Display Name" required>
                <UInput v-model="form.displayName" placeholder="e.g., Landing Page" />
              </UFormField>

              <UFormField label="API Name" required>
                <UInput v-model="form.name" placeholder="e.g., landing-page" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Icon">
                <UInput v-model="form.icon" placeholder="e.g., i-heroicons-document" />
              </UFormField>
            </div>

            <UFormField label="Description">
              <UTextarea v-model="form.description" placeholder="What is this page type for?" :rows="3" />
            </UFormField>

            <!-- Options -->
            <div class="border-t border-stone-200 dark:border-stone-700 pt-4">
              <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">Options</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.options.draftAndPublish"
                    class="rounded border-stone-300 dark:border-stone-600"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">Draft & Publish</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.options.seo"
                    class="rounded border-stone-300 dark:border-stone-600"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">SEO Fields</span>
                </label>
              </div>
            </div>

            <!-- Areas -->
            <div class="border-t border-stone-200 dark:border-stone-700 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100">Areas</h4>
                <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-plus" @click="openAddAreaModal">
                  Add Area
                </UButton>
              </div>

              <div v-if="Object.keys(form.areas).length > 0" class="space-y-2">
                <div
                  v-for="(area, name) in form.areas"
                  :key="name"
                  class="flex items-center justify-between p-3 border border-stone-200 dark:border-stone-700 rounded-lg"
                >
                  <div>
                    <span class="font-medium text-stone-900 dark:text-stone-100">{{ area.displayName }}</span>
                    <code class="ml-2 text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded">
                      {{ name }}
                    </code>
                    <span class="text-xs text-stone-500 dark:text-stone-400 ml-2">
                      {{ area.allowedBlocks.length }} blocks allowed
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-heroicons-pencil"
                      @click="openEditAreaModal(name as string, area)"
                    />
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="error"
                      icon="i-heroicons-trash"
                      @click="deleteArea(name as string)"
                    />
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
                <p class="text-sm text-stone-500 dark:text-stone-400">No areas defined yet</p>
              </div>
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
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Edit Page Type</h3>

          <form @submit.prevent="updatePageType" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Display Name" required>
                <UInput v-model="form.displayName" placeholder="e.g., Landing Page" />
              </UFormField>

              <UFormField label="API Name" required>
                <UInput v-model="form.name" placeholder="e.g., landing-page" />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Icon">
                <UInput v-model="form.icon" placeholder="e.g., i-heroicons-document" />
              </UFormField>
            </div>

            <UFormField label="Description">
              <UTextarea v-model="form.description" placeholder="What is this page type for?" :rows="3" />
            </UFormField>

            <!-- Options -->
            <div class="border-t border-stone-200 dark:border-stone-700 pt-4">
              <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">Options</h4>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.options.draftAndPublish"
                    class="rounded border-stone-300 dark:border-stone-600"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">Draft & Publish</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="form.options.seo"
                    class="rounded border-stone-300 dark:border-stone-600"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">SEO Fields</span>
                </label>
              </div>
            </div>

            <!-- Areas -->
            <div class="border-t border-stone-200 dark:border-stone-700 pt-4">
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100">Areas</h4>
                <UButton size="xs" variant="outline" color="neutral" icon="i-heroicons-plus" @click="openAddAreaModal">
                  Add Area
                </UButton>
              </div>

              <div v-if="Object.keys(form.areas).length > 0" class="space-y-2">
                <div
                  v-for="(area, name) in form.areas"
                  :key="name"
                  class="flex items-center justify-between p-3 border border-stone-200 dark:border-stone-700 rounded-lg"
                >
                  <div>
                    <span class="font-medium text-stone-900 dark:text-stone-100">{{ area.displayName }}</span>
                    <code class="ml-2 text-xs bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 px-1.5 py-0.5 rounded">
                      {{ name }}
                    </code>
                    <span class="text-xs text-stone-500 dark:text-stone-400 ml-2">
                      {{ area.allowedBlocks.length }} blocks allowed
                    </span>
                  </div>
                  <div class="flex items-center gap-1">
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="neutral"
                      icon="i-heroicons-pencil"
                      @click="openEditAreaModal(name as string, area)"
                    />
                    <UButton
                      size="xs"
                      variant="ghost"
                      color="error"
                      icon="i-heroicons-trash"
                      @click="deleteArea(name as string)"
                    />
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-4 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
                <p class="text-sm text-stone-500 dark:text-stone-400">No areas defined yet</p>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="ghost" color="neutral" @click="showEditModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral" :loading="isSubmitting">Save</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Area Modal -->
    <UModal v-model:open="showAreaModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
            {{ editingAreaName ? 'Edit Area' : 'Add Area' }}
          </h3>

          <form @submit.prevent="saveArea" class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Display Name" required>
                <UInput v-model="areaForm.displayName" placeholder="e.g., Main Content" />
              </UFormField>

              <UFormField label="API Name" required>
                <UInput
                  v-model="areaForm.name"
                  placeholder="e.g., main"
                  :disabled="!!editingAreaName"
                />
              </UFormField>
            </div>

            <UFormField label="Allowed Block Types" required>
              <div class="space-y-2 max-h-40 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-md p-3">
                <label
                  v-for="bt in blockTypes"
                  :key="bt.name"
                  class="flex items-center gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    :checked="areaForm.allowedBlocks.includes(bt.name)"
                    class="rounded border-stone-300 dark:border-stone-600"
                    @change="(e: Event) => {
                      const checked = (e.target as HTMLInputElement).checked
                      if (checked) areaForm.allowedBlocks.push(bt.name)
                      else areaForm.allowedBlocks = areaForm.allowedBlocks.filter((n: string) => n !== bt.name)
                    }"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">{{ bt.displayName }}</span>
                  <code class="text-xs text-stone-400 dark:text-stone-500">{{ bt.name }}</code>
                </label>
              </div>
            </UFormField>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Min Blocks" hint="Minimum blocks required">
                <UInput v-model.number="areaForm.minBlocks" type="number" min="0" />
              </UFormField>

              <UFormField label="Max Blocks" hint="Maximum blocks allowed">
                <UInput v-model.number="areaForm.maxBlocks" type="number" min="1" />
              </UFormField>
            </div>

            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="ghost" color="neutral" @click="showAreaModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral">
                {{ editingAreaName ? 'Update' : 'Add' }} Area
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Delete confirmation -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Delete Page Type</h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to delete <span class="font-medium text-stone-700 dark:text-stone-300">{{ selectedPageType?.displayName }}</span>?
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="error" :loading="isDeleting" @click="deletePageType">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
