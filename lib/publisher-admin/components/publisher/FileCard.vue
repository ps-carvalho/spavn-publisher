<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'

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

const mediaIcon = computed(() => {
  const mimeType = props.file.mimeType
  if (mimeType.startsWith('image/')) return 'i-heroicons-photo'
  if (mimeType.startsWith('video/')) return 'i-heroicons-video-camera'
  if (mimeType.startsWith('audio/')) return 'i-heroicons-musical-note'
  if (mimeType.includes('pdf')) return 'i-heroicons-document-text'
  return 'i-heroicons-document'
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
    class="group relative flex flex-col rounded-lg border overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
    :class="[
      selected
        ? 'border-amber-500 dark:border-amber-500 bg-amber-50 dark:bg-amber-950 ring-2 ring-amber-500'
        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600'
    ]"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- Thumbnail -->
    <div class="aspect-square bg-stone-100 dark:bg-stone-700 relative overflow-hidden">
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
        <UIcon
          :name="mediaIcon"
          class="w-10 h-10 text-stone-400 dark:text-stone-500"
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
              ? 'bg-amber-600 border-amber-600'
              : 'border-white/80 bg-black/20 group-hover:border-white'
          ]"
        >
          <UIcon
            v-if="selected"
            name="i-heroicons-check"
            class="w-3 h-3 text-white"
          />
        </div>
      </div>

      <!-- Selection Indicator (single mode) -->
      <div
        v-if="selected && mode === 'single'"
        class="absolute top-2 right-2 w-6 h-6 bg-amber-600 rounded-full flex items-center justify-center"
      >
        <UIcon
          name="i-heroicons-check"
          class="w-4 h-4 text-white"
        />
      </div>
    </div>

    <!-- File Info -->
    <div class="p-2 text-left">
      <p
        class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate"
        :title="file.originalName"
      >
        {{ file.originalName }}
      </p>
      <p class="text-xs text-stone-500 dark:text-stone-400">
        {{ formattedSize }}
      </p>
    </div>
  </button>

  <!-- List View Card -->
  <button
    v-else
    type="button"
    class="w-full flex items-center gap-4 px-4 py-3 rounded-lg border transition-all text-left focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-stone-900"
    :class="[
      selected
        ? 'border-amber-500 dark:border-amber-500 bg-amber-50 dark:bg-amber-950'
        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-750'
    ]"
    @click="handleClick"
    @dblclick="handleDblClick"
  >
    <!-- Thumbnail/Icon -->
    <div class="w-10 h-10 flex-shrink-0 rounded border border-stone-200 dark:border-stone-600 overflow-hidden bg-stone-100 dark:bg-stone-700">
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
        <UIcon
          :name="mediaIcon"
          class="w-5 h-5 text-stone-400 dark:text-stone-500"
        />
      </div>
    </div>

    <!-- File Name -->
    <div class="flex-1 min-w-0">
      <p
        class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate"
        :title="file.originalName"
      >
        {{ file.originalName }}
      </p>
      <p class="text-xs text-stone-500 dark:text-stone-400">
        {{ file.mimeType }}
      </p>
    </div>

    <!-- Dimensions (for images) -->
    <div
      v-if="dimensions"
      class="flex-shrink-0 text-sm text-stone-500 dark:text-stone-400 hidden sm:block"
    >
      {{ dimensions }}
    </div>

    <!-- File Size -->
    <div class="flex-shrink-0 text-sm text-stone-500 dark:text-stone-400">
      {{ formattedSize }}
    </div>

    <!-- Date -->
    <div class="flex-shrink-0 text-sm text-stone-500 dark:text-stone-400 hidden md:block">
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
            ? 'bg-amber-600 border-amber-600'
            : 'border-stone-300 dark:border-stone-600'
        ]"
      >
        <UIcon
          v-if="selected"
          name="i-heroicons-check"
          class="w-3 h-3 text-white"
        />
      </div>
    </div>

    <!-- Selection Indicator (single mode) -->
    <div
      v-if="selected && mode === 'single'"
      class="flex-shrink-0 w-5 h-5 bg-amber-600 rounded-full flex items-center justify-center"
    >
      <UIcon
        name="i-heroicons-check"
        class="w-3 h-3 text-white"
      />
    </div>
  </button>
</template>
