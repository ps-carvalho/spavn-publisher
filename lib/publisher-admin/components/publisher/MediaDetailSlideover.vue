<script setup lang="ts">
import type { MediaItem } from '~~/lib/publisher-admin/types/media'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@spavn/ui'
import { File, Clipboard, FolderInput, Trash2, Cloud, Server } from 'lucide-vue-next'

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
  <Sheet :open="open" @update:open="emit('update:open', $event)">
    <SheetContent side="right">
      <SheetHeader>
        <SheetTitle>Media Details</SheetTitle>
      </SheetHeader>
      <div v-if="media" class="space-y-4 mt-4">
        <!-- Preview -->
        <div class="rounded-lg overflow-hidden bg-[hsl(var(--muted))]">
          <img
            v-if="isImage(media.mimeType)"
            :src="media.url"
            :alt="media.alternativeText || media.originalName"
            class="w-full max-h-64 object-contain"
          />
          <div v-else class="flex items-center justify-center py-12">
            <File class="w-12 h-12 text-[hsl(var(--muted-foreground))]" />
          </div>
        </div>

        <!-- Metadata -->
        <div class="space-y-2 text-sm">
          <p class="text-[hsl(var(--muted-foreground))]">
            <span class="font-medium text-[hsl(var(--foreground))]">Filename:</span> {{ media.originalName }}
          </p>
          <p class="text-[hsl(var(--muted-foreground))]">
            <span class="font-medium text-[hsl(var(--foreground))]">Type:</span> {{ media.mimeType }}
          </p>
          <p class="text-[hsl(var(--muted-foreground))]">
            <span class="font-medium text-[hsl(var(--foreground))]">Size:</span> {{ formatSize(media.size) }}
          </p>
          <p v-if="media.width" class="text-[hsl(var(--muted-foreground))]">
            <span class="font-medium text-[hsl(var(--foreground))]">Dimensions:</span> {{ media.width }}x{{ media.height }}
          </p>
          <p v-if="media.storageProvider" class="text-[hsl(var(--muted-foreground))] flex items-center gap-1.5">
            <span class="font-medium text-[hsl(var(--foreground))]">Storage:</span>
            <Cloud
              v-if="isCloudProvider(media.storageProvider)"
              class="w-4 h-4 text-blue-500"
            />
            <Server
              v-else
              class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
            />
            <span :class="isCloudProvider(media.storageProvider) ? 'text-blue-600 dark:text-blue-400' : ''">
              {{ getStorageProviderLabel(media.storageProvider) }}
            </span>
          </p>
        </div>

        <!-- Alt text -->
        <div class="space-y-2">
          <Label>Alternative Text</Label>
          <Input v-model="altText" placeholder="Describe this media" class="w-full" />
        </div>

        <!-- Actions -->
        <div class="flex flex-col gap-2">
          <Button variant="outline" class="w-full" @click="emit('copy-url')">
            <Clipboard class="h-4 w-4 mr-2" />
            Copy URL
          </Button>
          <Button variant="outline" class="w-full" @click="emit('move')">
            <FolderInput class="h-4 w-4 mr-2" />
            Move to Folder
          </Button>
          <Button variant="ghost" class="w-full text-[hsl(var(--destructive))]" @click="emit('delete')">
            <Trash2 class="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </SheetContent>
  </Sheet>
</template>
