<script setup lang="ts">
import type { MediaItem, FolderTreeNodeWithCount } from '~~/lib/publisher-admin/types/media'

interface FileBrowserProps {
  mode: 'single' | 'multiple' | 'folder'
  selectedIds: number[]
  allowedTypes?: string[]
  initialFolderId?: number | null
}

// ─── Props & Emits ───────────────────────────────────────────────────

const props = withDefaults(defineProps<FileBrowserProps>(), {
  mode: 'single',
  selectedIds: () => [],
  allowedTypes: () => ['image/*'],
  initialFolderId: null,
})

const emit = defineEmits<{
  select: [ids: number[]]
  selectFolder: [folderId: number | string]
  cancel: []
}>()

// ─── State ───────────────────────────────────────────────────────────

// Current folder navigation (null = root)
const currentFolderId = ref<number | null>(props.initialFolderId)

// View mode (grid or list)
type ViewMode = 'grid' | 'list'
const viewMode = ref<ViewMode>('grid')

// Search/filter query
const searchQuery = ref('')

// Selected file IDs (internal state)
const internalSelectedIds = ref<number[]>([...props.selectedIds])

// Selected folder ID (for folder mode)
const selectedFolderId = ref<number | null>(null)

// Folder tree data (from API)
const folderTree = ref<FolderTreeNodeWithCount[]>([])

// Files data (from API)
const files = ref<MediaItem[]>([])

// Loading states
const isLoadingFolders = ref(false)
const isLoadingFiles = ref(false)

// Error state
const error = ref<string | null>(null)

// Breadcrumb data (from API)
const breadcrumb = ref<Array<{ id: number; name: string }>>([])

// Pagination
const pagination = ref({
  page: 1,
  pageSize: 50,
  total: 0,
  pageCount: 1,
})

// ─── Computed ────────────────────────────────────────────────────────

// Breadcrumb items for current folder path (includes root "All Media")
const breadcrumbItems = computed(() => {
  const items: Array<{ label: string; id: number | null }> = [
    { label: 'All Media', id: null },
  ]
  for (const crumb of breadcrumb.value) {
    items.push({ label: crumb.name, id: crumb.id })
  }
  return items
})

// Filter files based on search query and allowed types
const filteredFiles = computed(() => {
  let result = files.value

  // Filter by search query
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(file =>
      file.originalName.toLowerCase().includes(query)
      || file.name.toLowerCase().includes(query),
    )
  }

  // Filter by allowed types
  if (props.allowedTypes.length > 0) {
    result = result.filter((file) => {
      return props.allowedTypes.some((allowedType) => {
        if (allowedType.endsWith('/*')) {
          const prefix = allowedType.slice(0, -2)
          return file.mimeType.startsWith(prefix)
        }
        return file.mimeType === allowedType
      })
    })
  }

  return result
})

// Selection state helpers
const hasSelection = computed(() => {
  if (props.mode === 'folder') {
    return selectedFolderId.value !== null
  }
  return internalSelectedIds.value.length > 0
})
const selectionCount = computed(() => internalSelectedIds.value.length)

// Selected folder name (for folder mode)
const selectedFolderName = computed(() => {
  if (props.mode === 'folder' && selectedFolderId.value !== null) {
    // Find the folder in the tree
    const findFolder = (folders: FolderTreeNodeWithCount[], id: number): FolderTreeNodeWithCount | null => {
      for (const folder of folders) {
        if (folder.id === id) return folder
        const found = findFolder(folder.children, id)
        if (found) return found
      }
      return null
    }
    const folder = findFolder(folderTree.value, selectedFolderId.value)
    return folder?.name ?? null
  }
  return null
})

// Current folder name (for display)
const currentFolderName = computed(() => {
  if (currentFolderId.value === null) return 'All Media'
  const last = breadcrumb.value[breadcrumb.value.length - 1]
  return last?.name ?? 'All Media'
})

// File mode for FileGrid (maps 'folder' to 'single' for display purposes)
const fileMode = computed((): 'single' | 'multiple' => {
  return props.mode === 'multiple' ? 'multiple' : 'single'
})

// ─── API Methods ──────────────────────────────────────────────────────

// Fetch folder tree from API
async function fetchFolders() {
  isLoadingFolders.value = true
  try {
    const response = await $fetch<{ data: FolderTreeNodeWithCount[] }>('/api/publisher/folders', {
      query: { tree: 'true', includeMediaCount: 'true' },
    })
    folderTree.value = response.data || []
  }
  catch (err) {
    console.error('Failed to fetch folders:', err)
    folderTree.value = []
  }
  finally {
    isLoadingFolders.value = false
  }
}

// Fetch files from API
async function fetchFiles() {
  isLoadingFiles.value = true
  error.value = null

  try {
    const query: Record<string, unknown> = {
      'pagination[page]': pagination.value.page,
      'pagination[pageSize]': pagination.value.pageSize,
      // API expects 'null' string for root folder
      folderId: currentFolderId.value ?? 'null',
    }

    // Add mime type filter if allowed types are specified
    if (props.allowedTypes.length === 1) {
      query.mimeType = props.allowedTypes[0]
    }

    const response = await $fetch<{
      data: MediaItem[]
      meta: { pagination: typeof pagination.value }
    }>('/api/publisher/media', { query })

    files.value = response.data || []
    pagination.value = response.meta?.pagination || pagination.value
  }
  catch (err) {
    console.error('Failed to fetch files:', err)
    error.value = 'Failed to load files. Please try again.'
    files.value = []
  }
  finally {
    isLoadingFiles.value = false
  }
}

// Fetch breadcrumb for current folder
async function fetchBreadcrumb(folderId: number | null) {
  if (folderId === null) {
    breadcrumb.value = []
    return
  }

  try {
    const data = await $fetch<{ breadcrumb: Array<{ id: number; name: string }> }>(
      `/api/publisher/folders/${folderId}`,
    )
    breadcrumb.value = data.breadcrumb || []
  }
  catch {
    breadcrumb.value = []
  }
}

// ─── Navigation Methods ───────────────────────────────────────────────

// Handle folder selection from FolderTree
function handleFolderSelect(folderId: number | null) {
  if (props.mode === 'folder') {
    // In folder mode: clicking selects the folder for confirmation
    selectedFolderId.value = folderId
  }
  // Always navigate to the folder to show its contents
  currentFolderId.value = folderId
  pagination.value.page = 1
  fetchFiles()
  fetchBreadcrumb(folderId)
}

// Handle breadcrumb click
function handleBreadcrumbClick(folderId: number | null) {
  handleFolderSelect(folderId)
}

// ─── File Selection Methods ───────────────────────────────────────────

// Handle file selection from FileGrid
function handleFileSelect(file: MediaItem, event?: MouseEvent) {
  if (props.mode === 'folder') {
    // In folder mode, clicking files doesn't select them
    return
  }

  const fileId = file.id
  const index = internalSelectedIds.value.indexOf(fileId)

  if (props.mode === 'single') {
    // Single select mode - replace selection
    internalSelectedIds.value = index === -1 ? [fileId] : []
  }
  else {
    // Multiple select mode
    if (event?.ctrlKey || event?.metaKey) {
      // Toggle selection with Ctrl/Cmd
      if (index === -1) {
        internalSelectedIds.value.push(fileId)
      }
      else {
        internalSelectedIds.value.splice(index, 1)
      }
    }
    else if (event?.shiftKey && internalSelectedIds.value.length > 0) {
      // Range selection with Shift (simplified)
      const lastId = internalSelectedIds.value[internalSelectedIds.value.length - 1]
      const lastIndex = filteredFiles.value.findIndex(f => f.id === lastId)
      const currentIndex = filteredFiles.value.findIndex(f => f.id === fileId)
      const [start, end] = [Math.min(lastIndex, currentIndex), Math.max(lastIndex, currentIndex)]

      const rangeIds = filteredFiles.value
        .slice(start, end + 1)
        .map(f => f.id)
        .filter(id => !internalSelectedIds.value.includes(id))

      internalSelectedIds.value = [...internalSelectedIds.value, ...rangeIds]
    }
    else {
      // Normal click - toggle single item
      if (index === -1) {
        internalSelectedIds.value.push(fileId)
      }
      else {
        internalSelectedIds.value.splice(index, 1)
      }
    }
  }
}

// Handle file confirm (double-click) from FileGrid
function handleFileConfirm(file: MediaItem) {
  if (props.mode !== 'folder') {
    internalSelectedIds.value = [file.id]
    emit('select', internalSelectedIds.value)
  }
}

// ─── Action Handlers ──────────────────────────────────────────────────

// Confirm selection and emit
function handleConfirm() {
  if (props.mode === 'folder') {
    emit('selectFolder', selectedFolderId.value ?? currentFolderId.value ?? 'root')
  }
  else {
    emit('select', internalSelectedIds.value)
  }
}

// Cancel selection
function handleCancel() {
  emit('cancel')
}

// Clear all selections
function clearSelection() {
  internalSelectedIds.value = []
  selectedFolderId.value = null
}

// Handle search input
function handleSearchInput(value: string) {
  searchQuery.value = value
}

// Keyboard navigation
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    handleCancel()
  }
  else if (event.key === 'Enter' && (hasSelection.value || props.mode === 'folder')) {
    handleConfirm()
  }
}

// ─── Lifecycle ───────────────────────────────────────────────────────

onMounted(async () => {
  // Load initial data
  await Promise.all([
    fetchFolders(),
    fetchFiles(),
    fetchBreadcrumb(currentFolderId.value),
  ])

  // Load view mode preference from localStorage
  const savedViewMode = localStorage.getItem('file-browser-view-mode') as ViewMode | null
  if (savedViewMode) {
    viewMode.value = savedViewMode
  }

  // Add keyboard listener
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})

// Watch view mode changes and persist to localStorage
watch(viewMode, (newMode) => {
  localStorage.setItem('file-browser-view-mode', newMode)
})

// Watch for prop changes
watch(() => props.selectedIds, (newIds) => {
  internalSelectedIds.value = [...newIds]
})

// ─── Expose for parent components ─────────────────────────────────────

defineExpose({
  refresh: fetchFiles,
  clearSelection,
  getSelectedIds: () => internalSelectedIds.value,
})
</script>

<template>
  <div class="file-browser flex flex-col h-full bg-white dark:bg-stone-900 rounded-lg overflow-hidden">
    <!-- Top Bar: Search + View Toggle + Breadcrumb -->
    <div class="flex-shrink-0 border-b border-stone-200 dark:border-stone-800">
      <!-- Breadcrumb Navigation -->
      <div class="flex items-center gap-2 px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <UIcon
          name="i-heroicons-folder"
          class="w-4 h-4 text-amber-600 dark:text-amber-500 flex-shrink-0"
        />
        <nav class="flex items-center gap-1 text-sm overflow-x-auto">
          <template v-for="(crumb, index) in breadcrumbItems" :key="crumb.id ?? 'root'">
            <button
              v-if="index < breadcrumbItems.length - 1"
              class="text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors whitespace-nowrap"
              @click="handleBreadcrumbClick(crumb.id)"
            >
              {{ crumb.label }}
            </button>
            <span
              v-else
              class="text-amber-700 dark:text-amber-500 font-medium whitespace-nowrap"
            >
              {{ crumb.label }}
            </span>
            <span
              v-if="index < breadcrumbItems.length - 1"
              class="text-stone-300 dark:text-stone-600"
            >
              /
            </span>
          </template>
        </nav>
      </div>

      <!-- Search + View Toggle -->
      <div class="flex items-center justify-between gap-4 px-4 py-3">
        <!-- Search Input -->
        <UInput
          :model-value="searchQuery"
          icon="i-heroicons-magnifying-glass"
          placeholder="Search files..."
          class="flex-1 max-w-md"
          @update:model-value="handleSearchInput"
        />

        <!-- View Toggle + Selection Info -->
        <div class="flex items-center gap-3">
          <!-- Selection count -->
          <span
            v-if="hasSelection"
            class="text-sm text-stone-500 dark:text-stone-400"
          >
            {{ selectionCount }} selected
          </span>

          <!-- View Toggle -->
          <div class="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
            <UButton
              :color="viewMode === 'grid' ? 'neutral' : 'neutral'"
              :variant="viewMode === 'grid' ? 'solid' : 'ghost'"
              icon="i-heroicons-squares-2x2"
              size="xs"
              class="rounded-none"
              @click="viewMode = 'grid'"
            />
            <UButton
              :color="viewMode === 'list' ? 'neutral' : 'neutral'"
              :variant="viewMode === 'list' ? 'solid' : 'ghost'"
              icon="i-heroicons-list-bullet"
              size="xs"
              class="rounded-none"
              @click="viewMode = 'list'"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Main Content: Two-Pane Layout -->
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <!-- Left Pane: Folder Tree (240px fixed) -->
      <aside class="flex-shrink-0 w-60 border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 overflow-y-auto">
        <div class="p-3">
          <PublisherFolderTree
            :folders="folderTree"
            :active-folder-id="currentFolderId"
            :loading="isLoadingFolders"
            root-name="All Media"
            @select="handleFolderSelect"
          />
        </div>
      </aside>

      <!-- Right Pane: File Grid (flex) -->
      <main class="flex-1 flex flex-col min-h-0 overflow-hidden">
        <!-- Error State -->
        <div
          v-if="error"
          class="flex-1 flex items-center justify-center p-4"
        >
          <div class="text-center">
            <UIcon
              name="i-heroicons-exclamation-triangle"
              class="w-8 h-8 text-red-500 dark:text-red-400 mx-auto mb-2"
            />
            <p class="text-sm text-stone-500 dark:text-stone-400 mb-3">{{ error }}</p>
            <UButton
              variant="outline"
              color="neutral"
              size="sm"
              @click="fetchFiles"
            >
              Retry
            </UButton>
          </div>
        </div>

        <!-- File Grid (for both file and folder modes) -->
        <template v-else>
          <!-- Folder mode: show selected folder info -->
          <div
            v-if="mode === 'folder' && selectedFolderId !== null"
            class="flex-shrink-0 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-100 dark:border-amber-900"
          >
            <div class="flex items-center gap-2 text-sm">
              <UIcon name="i-heroicons-folder" class="w-4 h-4 text-amber-600 dark:text-amber-500" />
              <span class="text-amber-700 dark:text-amber-400 font-medium">
                Selected: {{ selectedFolderName ?? 'Unknown folder' }}
              </span>
            </div>
          </div>

          <!-- File Grid -->
          <PublisherFileGrid
            :files="filteredFiles"
            :selected-ids="internalSelectedIds"
            :mode="fileMode"
            :view-mode="viewMode"
            :loading="isLoadingFiles"
            @select="handleFileSelect"
            @confirm="handleFileConfirm"
          />
        </template>
      </main>
    </div>

    <!-- Bottom Bar: Selection Actions -->
    <PublisherSelectionBar
      :selection-count="selectionCount"
      :mode="mode"
      :has-selection="hasSelection"
      :selected-folder-name="selectedFolderName ?? undefined"
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @clear="clearSelection"
    />
  </div>
</template>
