<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'

const props = defineProps<{
  media: MediaItem[]
  isSelectionMode: boolean
  activeFolderId: number | null
  status: string
  allSelected: boolean
  totalFiles: number
  isSelected: (id: number) => boolean
}>()

const emit = defineEmits<{
  select: [item: MediaItem]
  'toggle-selection': [id: number]
  'toggle-select-all': []
  upload: []
}>()

function handleItemClick(item: MediaItem) {
  if (props.isSelectionMode) {
    emit('toggle-selection', item.id)
  }
  else {
    emit('select', item)
  }
}

function enterSelectionMode(id: number) {
  emit('toggle-selection', id)
}
</script>

<template>
  <div>
    <!-- Grid header with select all -->
    <div v-if="media.length > 0" class="flex items-center justify-between mb-3">
      <button
        class="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200 transition-colors"
        @click="emit('toggle-select-all')"
      >
        <div
          class="w-4 h-4 rounded border flex items-center justify-center transition-all"
          :class="allSelected
            ? 'bg-amber-500 border-amber-500'
            : 'border-stone-300 dark:border-stone-600 hover:border-amber-500'"
        >
          <UIcon
            v-if="allSelected"
            name="i-heroicons-check"
            class="w-3 h-3 text-white"
          />
        </div>
        <span>{{ allSelected ? 'Deselect all' : 'Select all' }}</span>
      </button>
      <span class="text-xs text-stone-400 dark:text-stone-500">
        {{ totalFiles }} file{{ totalFiles !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Grid -->
    <div v-if="media.length > 0" class="flex flex-wrap gap-3">
      <div
        v-for="item in media"
        :key="item.id"
        class="group relative w-32 h-32 rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden cursor-pointer transition-all flex-shrink-0"
        :class="[
          isSelected(item.id)
            ? 'ring-2 ring-amber-500 dark:ring-amber-400'
            : 'hover:ring-2 hover:ring-amber-500 dark:hover:ring-amber-400',
        ]"
        @click="handleItemClick(item)"
      >
        <!-- Image thumbnail -->
        <img
          v-if="isImage(item.mimeType)"
          :src="item.url"
          :alt="item.alternativeText || item.originalName"
          class="w-full h-full object-cover"
        />
        <!-- File icon for non-images -->
        <div v-else class="w-full h-full flex flex-col items-center justify-center bg-stone-50 dark:bg-stone-900">
          <UIcon name="i-heroicons-document" class="text-3xl text-stone-400 dark:text-stone-500" />
          <p class="text-xs text-stone-400 dark:text-stone-500 mt-1 truncate px-2 w-full text-center">{{ item.originalName }}</p>
        </div>

        <!-- Selection checkbox overlay -->
        <div
          class="absolute top-2 left-2 z-10"
          @click.stop="enterSelectionMode(item.id)"
        >
          <div
            v-if="isSelectionMode || isSelected(item.id)"
            class="w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-all"
            :class="isSelected(item.id)
              ? 'bg-amber-500 border-2 border-amber-500'
              : 'border-2 border-white/80 bg-black/30 hover:bg-black/50'"
          >
            <UIcon
              v-if="isSelected(item.id)"
              name="i-heroicons-check"
              class="w-3.5 h-3.5 text-white"
            />
          </div>
          <div
            v-else
            class="w-5 h-5 rounded border-2 border-white/50 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer hover:bg-black/40"
          />
        </div>

        <!-- Storage provider badge overlay -->
        <div
          v-if="item.storageProvider"
          class="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div
            class="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium backdrop-blur-sm"
            :class="isCloudProvider(item.storageProvider) ? 'bg-blue-500/80 text-white' : 'bg-stone-800/70 text-stone-200'"
          >
            <UIcon
              :name="isCloudProvider(item.storageProvider) ? 'i-heroicons-cloud' : 'i-heroicons-server'"
              class="w-3 h-3"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="status !== 'pending'"
      class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900"
    >
      <div class="text-center py-12">
        <UIcon name="i-heroicons-photo" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">
          {{ activeFolderId ? 'No files in this folder.' : 'No media uploaded yet.' }}
        </p>
        <UButton class="mt-3" variant="outline" color="neutral" @click="emit('upload')">
          Upload your first file
        </UButton>
      </div>
    </div>
  </div>
</template>
