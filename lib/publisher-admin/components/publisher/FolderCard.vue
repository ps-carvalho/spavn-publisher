<script setup lang="ts">
import type { Folder } from '~~/lib/publisher-admin/types/media'
import { File as FileIcon, Folder as FolderIcon, Check } from 'lucide-vue-next'

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
        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] ring-2 ring-[hsl(var(--primary))]'
        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border))]'
    ]"
    @click="handleClick"
  >
    <!-- Preview grid (2x2) -->
    <div class="aspect-square grid grid-cols-2 gap-0.5 bg-[hsl(var(--muted))]">
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
          <div class="w-full h-full bg-[hsl(var(--muted))] flex items-center justify-center">
            <FileIcon class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          </div>
        </template>
      </template>
      <template v-else>
        <!-- Empty folder icon -->
        <div class="col-span-2 row-span-2 flex items-center justify-center">
          <FolderIcon class="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
        </div>
      </template>
    </div>

    <!-- Folder info -->
    <div class="p-2.5">
      <p class="text-sm font-medium text-[hsl(var(--foreground))] truncate">
        {{ folder.name }}
      </p>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">
        {{ folder.itemCount ?? 0 }} item{{ (folder.itemCount ?? 0) !== 1 ? 's' : '' }}
      </p>
    </div>

    <!-- Selection indicator -->
    <div
      v-if="selected"
      class="absolute top-2 right-2 w-6 h-6 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center"
    >
      <Check class="w-4 h-4 text-white" />
    </div>

    <!-- Selection mode hover indicator -->
    <div
      v-if="mode === 'selection' && !selected"
      class="absolute inset-0 bg-[hsl(var(--primary))]/0 group-hover:bg-[hsl(var(--primary))]/5 transition-colors pointer-events-none"
    />
  </button>
</template>
