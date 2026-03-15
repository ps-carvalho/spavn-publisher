<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'
import { Button } from '@spavn/ui'
import { Check, File, Image, Cloud, Server } from 'lucide-vue-next'

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
        class="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        @click="emit('toggle-select-all')"
      >
        <div
          class="w-4 h-4 rounded border flex items-center justify-center transition-all"
          :class="allSelected
            ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
            : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary))]'"
        >
          <Check
            v-if="allSelected"
            class="w-3 h-3 text-white"
          />
        </div>
        <span>{{ allSelected ? 'Deselect all' : 'Select all' }}</span>
      </button>
      <span class="text-xs text-[hsl(var(--muted-foreground))]">
        {{ totalFiles }} file{{ totalFiles !== 1 ? 's' : '' }}
      </span>
    </div>

    <!-- Grid -->
    <div v-if="media.length > 0" class="flex flex-wrap gap-3">
      <div
        v-for="item in media"
        :key="item.id"
        class="group relative w-32 h-32 rounded-lg border border-[hsl(var(--border))] overflow-hidden cursor-pointer transition-all flex-shrink-0"
        :class="[
          isSelected(item.id)
            ? 'ring-2 ring-[hsl(var(--primary))]'
            : 'hover:ring-2 hover:ring-[hsl(var(--primary))]',
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
        <div v-else class="w-full h-full flex flex-col items-center justify-center bg-[hsl(var(--background))]">
          <File class="w-8 h-8 text-[hsl(var(--muted-foreground))]" />
          <p class="text-xs text-[hsl(var(--muted-foreground))] mt-1 truncate px-2 w-full text-center">{{ item.originalName }}</p>
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
              ? 'bg-[hsl(var(--primary))] border-2 border-[hsl(var(--primary))]'
              : 'border-2 border-white/80 bg-black/30 hover:bg-black/50'"
          >
            <Check
              v-if="isSelected(item.id)"
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
            :class="isCloudProvider(item.storageProvider) ? 'bg-blue-500/80 text-white' : 'bg-[hsl(var(--foreground))]/70 text-[hsl(var(--background))]'"
          >
            <Cloud
              v-if="isCloudProvider(item.storageProvider)"
              class="w-3 h-3"
            />
            <Server
              v-else
              class="w-3 h-3"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-else-if="status !== 'pending'"
      class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
    >
      <div class="text-center py-12">
        <Image class="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">
          {{ activeFolderId ? 'No files in this folder.' : 'No media uploaded yet.' }}
        </p>
        <Button class="mt-3" variant="outline" @click="emit('upload')">
          Upload your first file
        </Button>
      </div>
    </div>
  </div>
</template>
