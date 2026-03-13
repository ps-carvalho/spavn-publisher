<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'

const props = defineProps<{
  media: MediaItem | null
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  delete: []
  'copy-url': []
  move: []
}>()

const altText = defineModel<string>('altText', { default: '' })
</script>

<template>
  <USlideover :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div v-if="media" class="p-6 space-y-4">
        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Media Details</h3>

        <!-- Preview -->
        <div class="rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800">
          <img
            v-if="isImage(media.mimeType)"
            :src="media.url"
            :alt="media.alternativeText || media.originalName"
            class="w-full max-h-64 object-contain"
          />
          <div v-else class="flex items-center justify-center py-12">
            <UIcon name="i-heroicons-document" class="text-5xl text-stone-400 dark:text-stone-500" />
          </div>
        </div>

        <!-- Metadata -->
        <div class="space-y-2 text-sm">
          <p class="text-stone-500 dark:text-stone-400">
            <span class="font-medium text-stone-700 dark:text-stone-300">Filename:</span> {{ media.originalName }}
          </p>
          <p class="text-stone-500 dark:text-stone-400">
            <span class="font-medium text-stone-700 dark:text-stone-300">Type:</span> {{ media.mimeType }}
          </p>
          <p class="text-stone-500 dark:text-stone-400">
            <span class="font-medium text-stone-700 dark:text-stone-300">Size:</span> {{ formatSize(media.size) }}
          </p>
          <p v-if="media.width" class="text-stone-500 dark:text-stone-400">
            <span class="font-medium text-stone-700 dark:text-stone-300">Dimensions:</span> {{ media.width }}x{{ media.height }}
          </p>
          <p v-if="media.storageProvider" class="text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
            <span class="font-medium text-stone-700 dark:text-stone-300">Storage:</span>
            <UIcon
              :name="isCloudProvider(media.storageProvider) ? 'i-heroicons-cloud' : 'i-heroicons-server'"
              class="w-4 h-4"
              :class="isCloudProvider(media.storageProvider) ? 'text-blue-500' : 'text-stone-500'"
            />
            <span :class="isCloudProvider(media.storageProvider) ? 'text-blue-600 dark:text-blue-400' : ''">
              {{ getStorageProviderLabel(media.storageProvider) }}
            </span>
          </p>
        </div>

        <!-- Alt text -->
        <UFormField label="Alternative Text">
          <UInput v-model="altText" placeholder="Describe this media" class="w-full" />
        </UFormField>

        <!-- Actions -->
        <div class="flex flex-col gap-2">
          <UButton block variant="outline" color="neutral" icon="i-heroicons-clipboard" @click="emit('copy-url')">
            Copy URL
          </UButton>
          <UButton block variant="outline" color="neutral" icon="i-heroicons-folder-arrow-right" @click="emit('move')">
            Move to Folder
          </UButton>
          <UButton block color="error" variant="ghost" icon="i-heroicons-trash" @click="emit('delete')">
            Delete
          </UButton>
        </div>
      </div>
    </template>
  </USlideover>
</template>
