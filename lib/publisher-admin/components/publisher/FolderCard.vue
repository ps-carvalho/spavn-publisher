<script setup lang="ts">
import type { Folder } from '~~/lib/publisher-admin/types/media'

// ─── Props & Emits ───────────────────────────────────────────────────

const props = defineProps<{
  folder: Folder
  selected: boolean
  mode: 'navigation' | 'selection'
}>()

const emit = defineEmits<{
  click: [folder: Folder]
}>()

// ─── Methods ──────────────────────────────────────────────────────────

function handleClick() {
  emit('click', props.folder)
}
</script>

<template>
  <button
    class="folder-card group relative flex flex-col rounded-lg border overflow-hidden transition-all text-left"
    :class="[
      selected
        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950 ring-2 ring-amber-500'
        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600'
    ]"
    @click="handleClick"
  >
    <!-- Preview grid (2x2) -->
    <div class="aspect-square grid grid-cols-2 gap-0.5 bg-stone-100 dark:bg-stone-700">
      <template v-if="folder.previewThumbnails?.length">
        <img
          v-for="(thumb, i) in folder.previewThumbnails.slice(0, 4)"
          :key="i"
          :src="thumb"
          :alt="`Preview ${i + 1}`"
          class="w-full h-full object-cover"
        >
        <!-- Fill empty slots if less than 4 thumbnails -->
        <template v-for="i in Math.max(0, 4 - folder.previewThumbnails.length)" :key="`empty-${i}`">
          <div class="w-full h-full bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
            <UIcon name="i-heroicons-document" class="w-4 h-4 text-stone-300 dark:text-stone-600" />
          </div>
        </template>
      </template>
      <template v-else>
        <!-- Empty folder icon -->
        <div class="col-span-2 row-span-2 flex items-center justify-center">
          <UIcon name="i-heroicons-folder" class="w-12 h-12 text-stone-300 dark:text-stone-600" />
        </div>
      </template>
    </div>

    <!-- Folder info -->
    <div class="p-2.5">
      <p class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
        {{ folder.name }}
      </p>
      <p class="text-xs text-stone-500 dark:text-stone-400">
        {{ folder.itemCount ?? 0 }} item{{ (folder.itemCount ?? 0) !== 1 ? 's' : '' }}
      </p>
    </div>

    <!-- Selection indicator -->
    <div
      v-if="selected"
      class="absolute top-2 right-2 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center"
    >
      <UIcon name="i-heroicons-check" class="w-4 h-4 text-white" />
    </div>

    <!-- Selection mode hover indicator -->
    <div
      v-if="mode === 'selection' && !selected"
      class="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors pointer-events-none"
    />
  </button>
</template>
