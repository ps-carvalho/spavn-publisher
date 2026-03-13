<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'

interface MediaPickerProps {
  modelValue: number | number[] | null
  multiple?: boolean
  allowedTypes?: string[]  // ['image/*', 'video/*']
  allowFolderSelection?: boolean  // For gallery blocks (future)
  maxSelection?: number
  label?: string
}

const props = withDefaults(defineProps<MediaPickerProps>(), {
  multiple: false,
  allowedTypes: () => ['image/*'],
  allowFolderSelection: false,
  maxSelection: 10,
  label: 'Media',
})

const emit = defineEmits<{
  'update:modelValue': [value: number | number[] | null]
  'folderSelect': [folderId: number | string]
}>()

// Selection mode state (files or folder)
const selectionMode = ref<'files' | 'folder'>('files')

// Selected media items for preview
const selectedMedia = ref<MediaItem[]>([])

// Modal state
const isOpen = ref(false)

// Multiple selection helper
const multipleIds = computed({
  get: () => {
    if (!props.multiple) return []
    return Array.isArray(props.modelValue) ? props.modelValue : []
  },
  set: (ids: number[]) => {
    if (!props.multiple) return
    emit('update:modelValue', ids)
  },
})

// Get primary media item for single selection preview
const primaryMedia = computed(() => {
  if (props.multiple) return selectedMedia.value[0] || null
  return selectedMedia.value[0] || null
})

// Has selection
const hasSelection = computed(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) && props.modelValue.length > 0
  }
  return typeof props.modelValue === 'number' && props.modelValue !== null
})

// Format file size for display
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Format dimensions for display
function formatDimensions(width?: number, height?: number): string {
  if (!width || !height) return ''
  return `${width}×${height}`
}

// Get thumbnail URL (use small format if available)
function getThumbnailUrl(media: MediaItem): string {
  if (media.formats?.small?.url) {
    return media.formats.small.url
  }
  if (media.formats?.thumbnail?.url) {
    return media.formats.thumbnail.url
  }
  return media.url
}

// Determine icon based on mime type
function getMediaIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return 'i-heroicons-photo'
  if (mimeType.startsWith('video/')) return 'i-heroicons-video-camera'
  if (mimeType.startsWith('audio/')) return 'i-heroicons-musical-note'
  if (mimeType.includes('pdf')) return 'i-heroicons-document-text'
  return 'i-heroicons-document'
}

// Fetch media metadata for preview
async function fetchMediaMetadata(ids: number[]) {
  if (ids.length === 0) {
    selectedMedia.value = []
    return
  }

  try {
    // Fetch media items - we'll query the list endpoint and filter
    const response = await $fetch<{ data: MediaItem[] }>('/api/publisher/media', {
      query: {
        'pagination[pageSize]': 100, // Get enough to find our items
      },
    })

    if (response?.data) {
      // Filter to only the selected IDs, preserving order
      selectedMedia.value = ids
        .map(id => response.data.find(item => item.id === id))
        .filter((item): item is MediaItem => item !== undefined)
    }
  } catch (error) {
    console.error('Failed to fetch media metadata:', error)
    selectedMedia.value = []
  }
}

// Watch modelValue changes to fetch media metadata
watch(
  () => props.modelValue,
  (newValue) => {
    const ids = Array.isArray(newValue)
      ? newValue
      : typeof newValue === 'number'
        ? [newValue]
        : []

    if (ids.length > 0) {
      fetchMediaMetadata(ids)
    } else {
      selectedMedia.value = []
    }
  },
  { immediate: true },
)

// Open modal
function openModal() {
  isOpen.value = true
}

// Clear selection
function clearSelection() {
  if (props.multiple) {
    emit('update:modelValue', [])
  } else {
    emit('update:modelValue', null)
  }
  selectedMedia.value = []
}

// Handle selection from FileBrowser
function handleSelection(ids: number[]) {
  if (props.multiple) {
    // Limit to maxSelection
    const limited = ids.slice(0, props.maxSelection)
    emit('update:modelValue', limited)
  } else {
    emit('update:modelValue', ids[0] || null)
  }
  isOpen.value = false
}

// Handle folder selection from FileBrowser
function handleFolderSelect(folderId: number | string) {
  emit('folderSelect', folderId)
  isOpen.value = false
}

// Computed mode for FileBrowser
const fileBrowserMode = computed(() => {
  if (props.allowFolderSelection && selectionMode.value === 'folder') {
    return 'folder'
  }
  return props.multiple ? 'multiple' : 'single'
})
</script>

<template>
  <div class="media-picker">
    <!-- Label -->
    <label v-if="label" class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">
      {{ label }}
    </label>

    <!-- Closed state: preview + buttons -->
    <div class="flex items-start gap-3">
      <!-- Thumbnail / Placeholder -->
      <div
        class="w-20 h-20 flex-shrink-0 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 flex items-center justify-center overflow-hidden"
      >
        <template v-if="primaryMedia">
          <img
            v-if="primaryMedia.mimeType.startsWith('image/')"
            :src="getThumbnailUrl(primaryMedia)"
            :alt="primaryMedia.alternativeText || primaryMedia.originalName"
            class="w-full h-full object-cover"
          >
          <UIcon
            v-else
            :name="getMediaIcon(primaryMedia.mimeType)"
            class="w-8 h-8 text-stone-400 dark:text-stone-500"
          />
        </template>
        <UIcon
          v-else
          name="i-heroicons-photo"
          class="w-8 h-8 text-stone-300 dark:text-stone-600"
        />
      </div>

      <!-- Info + Actions -->
      <div class="flex-1 min-w-0">
        <!-- Selection info -->
        <div v-if="primaryMedia" class="mb-2">
          <p class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
            {{ primaryMedia.originalName }}
          </p>
          <p class="text-xs text-stone-500 dark:text-stone-400">
            <template v-if="formatDimensions(primaryMedia.width, primaryMedia.height)">
              {{ formatDimensions(primaryMedia.width, primaryMedia.height) }} •
            </template>
            {{ formatFileSize(primaryMedia.size) }}
          </p>
          <!-- Multiple selection count -->
          <p v-if="multiple && multipleIds.length > 1" class="text-xs text-stone-500 dark:text-stone-400 mt-1">
            +{{ multipleIds.length - 1 }} more selected
          </p>
        </div>
        <p v-else class="text-sm text-stone-400 dark:text-stone-500 mb-2">
          No media selected
        </p>

        <!-- Action buttons -->
        <div class="flex items-center gap-2">
          <UButton
            variant="outline"
            color="neutral"
            icon="i-heroicons-folder-open"
            size="sm"
            @click="openModal"
          >
            Browse
          </UButton>
          <UButton
            v-if="hasSelection"
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark"
            size="sm"
            @click="clearSelection"
          >
            Clear
          </UButton>
        </div>
      </div>
    </div>

    <!-- Modal -->
    <UModal v-model:open="isOpen" :ui="{ content: 'max-w-4xl', body: 'p-0' }">
      <template #content>
        <div class="h-[70vh] flex flex-col">
          <!-- Modal header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-stone-200 dark:border-stone-700 flex-shrink-0">
            <div class="flex items-center gap-3">
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
                {{ selectionMode === 'folder' ? 'Select a Folder' : (multiple ? 'Select Media' : 'Select a Media Item') }}
              </h3>
              <!-- Mode toggle button (only when folder selection is allowed) -->
              <div
                v-if="allowFolderSelection"
                class="flex items-center border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden"
              >
                <UButton
                  :color="selectionMode === 'files' ? 'neutral' : 'neutral'"
                  :variant="selectionMode === 'files' ? 'solid' : 'ghost'"
                  icon="i-heroicons-photo"
                  size="xs"
                  class="rounded-none"
                  @click="selectionMode = 'files'"
                >
                  Files
                </UButton>
                <UButton
                  :color="selectionMode === 'folder' ? 'neutral' : 'neutral'"
                  :variant="selectionMode === 'folder' ? 'solid' : 'ghost'"
                  icon="i-heroicons-folder"
                  size="xs"
                  class="rounded-none"
                  @click="selectionMode = 'folder'"
                >
                  Folder
                </UButton>
              </div>
            </div>
            <UButton
              variant="ghost"
              color="neutral"
              icon="i-heroicons-x-mark"
              size="sm"
              @click="isOpen = false"
            />
          </div>

          <!-- FileBrowser Component -->
          <div class="flex-1 min-h-0">
            <PublisherFileBrowser
              :mode="fileBrowserMode"
              :selected-ids="Array.isArray(modelValue) ? modelValue : (typeof modelValue === 'number' ? [modelValue] : [])"
              :allowed-types="allowedTypes"
              @select="handleSelection"
              @select-folder="handleFolderSelect"
              @cancel="isOpen = false"
            />
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
