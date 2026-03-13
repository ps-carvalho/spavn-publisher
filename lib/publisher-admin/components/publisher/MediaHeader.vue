<script setup lang="ts">
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
    <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Media Library</h2>
    <div class="flex items-center gap-2">
      <!-- Active storage provider indicator -->
      <div v-if="storageMeta" class="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400 mr-1">
        <span class="inline-flex items-center justify-center w-1.5 h-1.5 rounded-full" :class="isCloudProvider(storageMeta.defaultProvider) ? 'bg-blue-500' : 'bg-stone-400'"></span>
        <UIcon :name="isCloudProvider(storageMeta.defaultProvider) ? 'i-heroicons-cloud' : 'i-heroicons-server'" class="w-3.5 h-3.5" />
        <span>{{ getStorageProviderLabel(storageMeta.defaultProvider) }}</span>
      </div>
      <UButton
        icon="i-heroicons-folder-plus"
        variant="outline"
        color="neutral"
        @click="emit('create-folder')"
      >
        Create Folder
      </UButton>
      <UButton
        icon="i-heroicons-arrow-up-tray"
        color="neutral"
        :loading="isUploading"
        @click="emit('upload')"
      >
        Upload
      </UButton>
      <slot />
    </div>
  </div>
</template>
