<script setup lang="ts">
import type { LocalStorageConfig } from '~/server/utils/publisher/storage/types'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Switch } from '@spavn/ui'

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
    <div class="space-y-2">
      <Label for="localBasePath">Base Path <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">The filesystem path where uploaded files will be saved. Can be relative to the project root or an absolute path.</p>
      <Input
        id="localBasePath"
        v-model="config.basePath"
        placeholder="./public/uploads"
      />
    </div>

    <div class="space-y-2">
      <Label for="localBaseUrl">Base URL <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">The public URL path that maps to the base path. Used to generate public URLs for uploaded files.</p>
      <Input
        id="localBaseUrl"
        v-model="config.baseUrl"
        placeholder="/uploads"
      />
    </div>

    <div class="space-y-2">
      <Label>Create Directories</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">When enabled, the storage provider will automatically create the base directory and any subdirectories as needed.</p>
      <Switch v-model:checked="config.createDirectories" />
    </div>
  </div>
</template>
