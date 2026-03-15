<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'
import { RefreshCw, FolderOpen } from 'lucide-vue-next'

interface FileGridProps {
  files: MediaItem[]
  selectedIds: number[]
  mode: 'single' | 'multiple'
  viewMode: 'grid' | 'list'
  loading?: boolean
}

// ─── Props & Emits ───────────────────────────────────────────────────

const props = withDefaults(defineProps<FileGridProps>(), {
  loading: false,
})

const emit = defineEmits<{
  select: [file: MediaItem, event: MouseEvent]
  confirm: [file: MediaItem]
}>()

// ─── Methods ──────────────────────────────────────────────────────────

function isSelected(fileId: number): boolean {
  return props.selectedIds.includes(fileId)
}

function handleFileClick(file: MediaItem, event: MouseEvent) {
  emit('select', file, event)
}

function handleFileDblClick(file: MediaItem, event: MouseEvent) {
  emit('confirm', file)
}
</script>

<template>
  <div class="file-grid flex-1 overflow-y-auto p-4">
    <!-- Loading State -->
    <div
      v-if="loading"
      class="flex items-center justify-center h-64"
    >
      <div class="text-center">
        <RefreshCw
          class="w-8 h-8 text-[hsl(var(--muted-foreground))] animate-spin mx-auto mb-2"
        />
        <p class="text-sm text-[hsl(var(--muted-foreground))]">Loading files...</p>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-else-if="files.length === 0"
      class="flex items-center justify-center h-64"
    >
      <div class="text-center">
        <FolderOpen
          class="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3"
        />
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          No files in this folder
        </p>
      </div>
    </div>

    <!-- Grid View -->
    <div
      v-else-if="viewMode === 'grid'"
      class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
    >
      <PublisherFileCard
        v-for="file in files"
        :key="file.id"
        :file="file"
        :selected="isSelected(file.id)"
        :mode="mode"
        view-mode="grid"
        @click="handleFileClick"
        @dblclick="handleFileDblClick"
      />
    </div>

    <!-- List View -->
    <div
      v-else
      class="space-y-1"
    >
      <PublisherFileCard
        v-for="file in files"
        :key="file.id"
        :file="file"
        :selected="isSelected(file.id)"
        :mode="mode"
        view-mode="list"
        @click="handleFileClick"
        @dblclick="handleFileDblClick"
      />
    </div>
  </div>
</template>
