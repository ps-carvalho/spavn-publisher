<script setup lang="ts">
import type { LocalStorageConfig } from '~/server/utils/publisher/storage/types'

// ─── Model ─────────────────────────────────────────────────────────────────────

const config = defineModel<LocalStorageConfig>('config', { required: true })

// ─── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  'update:valid': [value: boolean]
}>()

// ─── Validation ────────────────────────────────────────────────────────────────

const isValid = computed(() => {
  return !!(config.value.basePath && config.value.baseUrl)
})

// Emit validation state when it changes
watch(isValid, (valid) => emit('update:valid', valid), { immediate: true })
</script>

<template>
  <div class="space-y-4">
    <UFormField
      label="Base Path"
      required
      hint="Directory where files are stored"
      help="The filesystem path where uploaded files will be saved. Can be relative to the project root or an absolute path."
    >
      <UInput
        v-model="config.basePath"
        placeholder="./public/uploads"
      />
    </UFormField>

    <UFormField
      label="Base URL"
      required
      hint="URL path for serving files"
      help="The public URL path that maps to the base path. Used to generate public URLs for uploaded files."
    >
      <UInput
        v-model="config.baseUrl"
        placeholder="/uploads"
      />
    </UFormField>

    <UFormField
      label="Create Directories"
      hint="Automatically create directories"
      help="When enabled, the storage provider will automatically create the base directory and any subdirectories as needed."
    >
      <USwitch v-model:checked="config.createDirectories" />
    </UFormField>
  </div>
</template>
