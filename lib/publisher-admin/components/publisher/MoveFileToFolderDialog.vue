<script setup lang="ts">
import type { FolderTreeNode } from '#server/utils/publisher/folders'

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
  <UModal v-model:open="isOpen">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
          Move to Folder
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">
          Select a destination folder for "{{ fileName }}"
        </p>

        <div class="border border-stone-200 dark:border-stone-700 rounded-lg max-h-64 overflow-y-auto mb-4">
          <!-- Root option -->
          <button
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            :class="selectedFolderId === null ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'"
            @click="selectedFolderId = null"
          >
            <UIcon name="i-heroicons-photo" class="w-5 h-5" />
            <span>Media Library (root)</span>
          </button>

          <!-- Folder options -->
          <button
            v-for="folder in flatFolders"
            :key="folder.id"
            class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            :class="selectedFolderId === folder.id ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'"
            @click="selectedFolderId = folder.id"
          >
            <UIcon name="i-heroicons-folder" class="w-5 h-5" />
            <span>{{ folder.path }}</span>
          </button>
        </div>

        <div class="flex justify-end gap-3">
          <UButton variant="ghost" color="neutral" @click="closeDialog">
            Cancel
          </UButton>
          <UButton color="neutral" @click="handleMove">
            Move
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
