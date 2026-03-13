<script setup lang="ts">
import type { FolderTreeNodeWithCount } from '~~/lib/publisher-admin/types/media'

const props = defineProps<{
  open: boolean
  activeFolderId: number | null
  folderBreadcrumb: Array<{ id: number; name: string }>
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  create: [parentId: number | null, name: string]
}>()

const newFolderName = defineModel<string>('newFolderName', { default: '' })

function handleCreate() {
  const name = newFolderName.value.trim()
  if (!name) return
  emit('create', props.activeFolderId, name)
  newFolderName.value = ''
  emit('update:open', false)
}
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
          Create New Folder
        </h3>
        <p v-if="activeFolderId" class="text-sm text-stone-500 dark:text-stone-400 mb-3">
          Inside: {{ folderBreadcrumb[folderBreadcrumb.length - 1]?.name || 'Current folder' }}
        </p>
        <UFormField label="Folder Name" required class="mb-4">
          <UInput
            v-model="newFolderName"
            placeholder="Enter folder name"
            autofocus
            @keyup.enter="handleCreate"
          />
        </UFormField>
        <div class="flex justify-end gap-3">
          <UButton variant="ghost" color="neutral" @click="emit('update:open', false)">
            Cancel
          </UButton>
          <UButton color="neutral" @click="handleCreate">
            Create
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
