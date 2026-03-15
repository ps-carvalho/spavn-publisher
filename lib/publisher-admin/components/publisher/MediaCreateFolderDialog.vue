<script setup lang="ts">
import type { FolderTreeNodeWithCount } from '~~/lib/publisher-admin/types/media'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'

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
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create New Folder</DialogTitle>
      </DialogHeader>
      <p v-if="activeFolderId" class="text-sm text-[hsl(var(--muted-foreground))]">
        Inside: {{ folderBreadcrumb[folderBreadcrumb.length - 1]?.name || 'Current folder' }}
      </p>
      <div class="space-y-2">
        <Label>Folder Name</Label>
        <Input
          v-model="newFolderName"
          placeholder="Enter folder name"
          autofocus
          @keyup.enter="handleCreate"
        />
      </div>
      <DialogFooter>
        <Button variant="ghost" @click="emit('update:open', false)">
          Cancel
        </Button>
        <Button @click="handleCreate">
          Create
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
