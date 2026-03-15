<script setup lang="ts">
import { Button } from '@spavn/ui'
import { FolderPlus, Upload, Cloud, Server, Loader2 } from 'lucide-vue-next'

defineProps<{
  storageMeta: {
    defaultProvider: string
    availableProviders: string[]
  } | undefined
  isUploading: boolean
}>()

const emit = defineEmits<{
  'create-folder': []
  upload: []
}>()
</script>

<template>
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Media Library</h2>
    <div class="flex items-center gap-2">
      <!-- Active storage provider indicator -->
      <div v-if="storageMeta" class="flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))] mr-1">
        <span class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full" :class="isCloudProvider(storageMeta.defaultProvider) ? 'bg-blue-500' : 'bg-[hsl(var(--muted-foreground))]'"></span>
        <Cloud
          v-if="isCloudProvider(storageMeta.defaultProvider)"
          class="w-3.5 h-3.5"
        />
        <Server
          v-else
          class="w-3.5 h-3.5"
        />
        <span>{{ getStorageProviderLabel(storageMeta.defaultProvider) }}</span>
      </div>
      <Button
        variant="outline"
        @click="emit('create-folder')"
      >
        <FolderPlus class="h-4 w-4 mr-2" />
        Create Folder
      </Button>
      <template v-if="!isUploading">
        <Button
          @click="emit('upload')"
        >
          <Upload class="h-4 w-4 mr-2" />
          Upload
        </Button>
      </template>
      <template v-else>
        <Button disabled>
          <Loader2 class="h-4 w-4 animate-spin mr-2" />
          Uploading...
        </Button>
      </template>
      <slot />
    </div>
  </div>
</template>
