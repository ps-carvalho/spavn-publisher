<script setup lang="ts">
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
  <div class="flex-shrink-0 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 px-4 py-3">
    <div class="flex items-center justify-between">
      <!-- Selection Info -->
      <div class="text-sm text-stone-500 dark:text-stone-400 flex items-center gap-2">
        <span>{{ selectionText }}</span>
        <UButton
          v-if="hasSelection"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="emit('clear')"
        >
          Clear
        </UButton>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-2">
        <UButton
          variant="ghost"
          color="neutral"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>
        <UButton
          color="neutral"
          :disabled="isConfirmDisabled"
          @click="emit('confirm')"
        >
          {{ confirmButtonText }}
        </UButton>
      </div>
    </div>
  </div>
</template>
