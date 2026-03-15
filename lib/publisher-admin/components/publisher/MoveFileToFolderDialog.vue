<script setup lang="ts">
import type { FolderTreeNode } from '#server/utils/publisher/folders'
import { Button } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Image, Folder } from 'lucide-vue-next'

// ─── Props & Emits ───────────────────────────────────────────────────────────

interface Props {
  open: boolean
  folders: FolderTreeNode[]
  currentFolderId?: number | null
  fileName?: string
}

const props = withDefaults(defineProps<Props>(), {
  currentFolderId: null,
  fileName: '',
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  move: [folderId: number | null]
}>()

// ─── State ───────────────────────────────────────────────────────────────────

const selectedFolderId = ref<number | null>(null)

// ─── Computed ────────────────────────────────────────────────────────────────

// Sync open state with parent
const isOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

// Get flat list of all folders
const flatFolders = computed(() => {
  const flatten = (folders: FolderTreeNode[]): FolderTreeNode[] => {
    return folders.flatMap(f => [f, ...flatten(f.children)])
  }
  return flatten(props.folders)
})

// ─── Methods ─────────────────────────────────────────────────────────────────

function handleMove() {
  emit('move', selectedFolderId.value)
}

function closeDialog() {
  isOpen.value = false
}

// Reset selection when dialog opens
watch(() => props.open, (newVal) => {
  if (newVal) {
    selectedFolderId.value = props.currentFolderId ?? null
  }
})
</script>

<template>
  <Dialog v-model:open="isOpen">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Move to Folder</DialogTitle>
      </DialogHeader>
      <p class="text-sm text-[hsl(var(--muted-foreground))]">
        Select a destination folder for "{{ fileName }}"
      </p>

      <div class="border border-[hsl(var(--border))] rounded-lg max-h-64 overflow-y-auto">
        <!-- Root option -->
        <button
          class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] transition-colors"
          :class="selectedFolderId === null ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'"
          @click="selectedFolderId = null"
        >
          <Image class="w-5 h-5" />
          <span>Media Library (root)</span>
        </button>

        <!-- Folder options -->
        <button
          v-for="folder in flatFolders"
          :key="folder.id"
          class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[hsl(var(--accent))] transition-colors"
          :class="selectedFolderId === folder.id ? 'bg-[hsl(var(--accent))] text-[hsl(var(--primary))]' : 'text-[hsl(var(--foreground))]'"
          @click="selectedFolderId = folder.id"
        >
          <Folder class="w-5 h-5" />
          <span>{{ folder.path }}</span>
        </button>
      </div>

      <DialogFooter>
        <Button variant="ghost" @click="closeDialog">
          Cancel
        </Button>
        <Button @click="handleMove">
          Move
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
