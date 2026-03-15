<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'
import { Image, Video, Music, FileText, File, Check } from 'lucide-vue-next'

interface FileCardProps {
  file: MediaItem
  selected: boolean
  mode: 'single' | 'multiple'
  viewMode: 'grid' | 'list'
}

// ─── Props & Emits ───────────────────────────────────────────────────

const props = defineProps<FileCardProps>()

const emit = defineEmits<{
  click: [file: MediaItem, event: MouseEvent]
  dblclick: [file: MediaItem, event: MouseEvent]
}>()

// ─── Computed ────────────────────────────────────────────────────────

const isImage = computed(() => props.file.mimeType.startsWith('image/'))

const thumbnailUrl = computed(() => {
  if (props.file.formats?.small?.url) {
    return props.file.formats.small.url
  }
  if (props.file.formats?.thumbnail?.url) {
    return props.file.formats.thumbnail.url
  }
  return props.file.url
})

const mediaIconComponent = computed(() => {
  const mimeType = props.file.mimeType
  if (mimeType.startsWith('image/')) return Image
  if (mimeType.startsWith('video/')) return Video
  if (mimeType.startsWith('audio/')) return Music
  if (mimeType.includes('pdf')) return FileText
  return File
})

const formattedSize = computed(() => {
  const bytes = props.file.size
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
})

const formattedDate = computed(() => {
  const date = new Date(props.file.createdAt)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
})

const dimensions = computed(() => {
  if (props.file.width && props.file.height) {
    return `${props.file.width} × ${props.file.height}`
  }
  return null
})

// ─── Methods ──────────────────────────────────────────────────────────

function handleClick(event: MouseEvent) {
  emit('click', props.file, event)
}

function handleDblClick(event: MouseEvent) {
  emit('dblclick', props.file, event)
}
</script>

<template>
  <!-- Grid View Card -->
  <button
    v-if="viewMode === 'grid'"
    type="button"
    class="group relative flex flex-col rounded-lg border overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
    :class="[
      selected
        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] ring-2 ring-[hsl(var(--primary))]'
        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border))]'
    ]"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- Thumbnail -->
    <div class="aspect-square bg-[hsl(var(--muted))] relative overflow-hidden">
      <img
        v-if="isImage"
        :src="thumbnailUrl"
        :alt="file.alternativeText || file.originalName"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
      >
        <component
          :is="mediaIconComponent"
          class="w-10 h-10 text-[hsl(var(--muted-foreground))]"
        />
      </div>

      <!-- Hover Overlay with File Info -->
      <div
        class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2"
      >
        <div class="text-white text-xs space-y-0.5">
          <p v-if="dimensions">{{ dimensions }}</p>
          <p>{{ formattedSize }}</p>
        </div>
      </div>

      <!-- Selection Checkbox/Indicator -->
      <div
        v-if="mode === 'multiple'"
        class="absolute top-2 left-2"
      >
        <div
          class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
          :class="[
            selected
              ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
              : 'border-white/80 bg-black/20 group-hover:border-white'
          ]"
        >
          <Check
            v-if="selected"
            class="w-3 h-3 text-white"
          />
        </div>
      </div>

      <!-- Selection Indicator (single mode) -->
      <div
        v-if="selected && mode === 'single'"
        class="absolute top-2 right-2 w-6 h-6 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center"
      >
        <Check
          class="w-4 h-4 text-white"
        />
      </div>
    </div>

    <!-- File Info -->
    <div class="p-2 text-left">
      <p
        class="text-sm font-medium text-[hsl(var(--foreground))] truncate"
        :title="file.originalName"
      >
        {{ file.originalName }}
      </p>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">
        {{ formattedSize }}
      </p>
    </div>
  </button>

  <!-- List View Card -->
  <button
    v-else
    type="button"
    class="w-full flex items-center gap-4 px-4 py-3 rounded-lg border transition-all text-left focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2"
    :class="[
      selected
        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))]'
        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--accent))]'
    ]"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- Thumbnail/Icon -->
    <div class="w-10 h-10 flex-shrink-0 rounded border border-[hsl(var(--border))] overflow-hidden bg-[hsl(var(--muted))]">
      <img
        v-if="isImage"
        :src="thumbnailUrl"
        :alt="file.alternativeText || file.originalName"
        class="w-full h-full object-cover"
        loading="lazy"
      />
      <div
        v-else
        class="w-full h-full flex items-center justify-center"
      >
        <component
          :is="mediaIconComponent"
          class="w-5 h-5 text-[hsl(var(--muted-foreground))]"
        />
      </div>
    </div>

    <!-- File Name -->
    <div class="flex-1 min-w-0">
      <p
        class="text-sm font-medium text-[hsl(var(--foreground))] truncate"
        :title="file.originalName"
      >
        {{ file.originalName }}
      </p>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">
        {{ file.mimeType }}
      </p>
    </div>

    <!-- Dimensions (for images) -->
    <div
      v-if="dimensions"
      class="flex-shrink-0 text-sm text-[hsl(var(--muted-foreground))] hidden sm:block"
    >
      {{ dimensions }}
    </div>

    <!-- File Size -->
    <div class="flex-shrink-0 text-sm text-[hsl(var(--muted-foreground))]">
      {{ formattedSize }}
    </div>

    <!-- Date -->
    <div class="flex-shrink-0 text-sm text-[hsl(var(--muted-foreground))] hidden md:block">
      {{ formattedDate }}
    </div>

    <!-- Selection Checkbox (multiple mode) -->
    <div
      v-if="mode === 'multiple'"
      class="flex-shrink-0"
    >
      <div
        class="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
        :class="[
          selected
            ? 'bg-[hsl(var(--primary))] border-[hsl(var(--primary))]'
            : 'border-[hsl(var(--border))]'
        ]"
      >
        <Check
          v-if="selected"
          class="w-3 h-3 text-white"
        />
      </div>
    </div>

    <!-- Selection Indicator (single mode) -->
    <div
      v-if="selected && mode === 'single'"
      class="flex-shrink-0 w-5 h-5 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center"
    >
      <Check
        class="w-3 h-3 text-white"
      />
    </div>
  </button>
</template>
