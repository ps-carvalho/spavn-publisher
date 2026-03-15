<script setup lang="ts">
import { Button } from '@spavn/ui'

// ─── Types ───────────────────────────────────────────────────────────

interface SelectionBarProps {
  selectionCount: number
  mode: 'single' | 'multiple' | 'folder'
  hasSelection: boolean
  selectedFolderName?: string  // For folder mode, show selected folder name
}

// ─── Props & Emits ───────────────────────────────────────────────────

const props = defineProps<SelectionBarProps>()

const emit = defineEmits<{
  confirm: []
  cancel: []
  clear: []
}>()

// ─── Computed ────────────────────────────────────────────────────────

const confirmButtonText = computed(() => {
  if (props.mode === 'folder') {
    return 'Use This Folder'
  }
  if (props.mode === 'multiple') {
    return props.hasSelection
      ? `Select ${props.selectionCount} File${props.selectionCount !== 1 ? 's' : ''}`
      : 'Select Files'
  }
  return 'Select File'
})

const selectionText = computed(() => {
  if (props.mode === 'folder') {
    if (props.hasSelection && props.selectedFolderName) {
      return `Folder selected: ${props.selectedFolderName}`
    }
    return 'Select a folder to use'
  }
  if (props.hasSelection) {
    return `${props.selectionCount} file${props.selectionCount !== 1 ? 's' : ''} selected`
  }
  return 'No files selected'
})

const isConfirmDisabled = computed(() => {
  // In folder mode, always enable (user can select current folder)
  if (props.mode === 'folder') {
    return false
  }
  // In file modes, require selection
  return !props.hasSelection
})
</script>

<template>
  <div class="flex-shrink-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3">
    <div class="flex items-center justify-between">
      <!-- Selection Info -->
      <div class="text-sm text-[hsl(var(--muted-foreground))] flex items-center gap-2">
        <span>{{ selectionText }}</span>
        <Button
          v-if="hasSelection"
          variant="ghost"
          size="sm"
          @click="emit('clear')"
        >
          Clear
        </Button>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <Button
          variant="ghost"
          @click="emit('cancel')"
        >
          Cancel
        </Button>
        <Button
          :disabled="isConfirmDisabled"
          @click="emit('confirm')"
        >
          {{ confirmButtonText }}
        </Button>
      </div>
    </div>
  </div>
</template>
