import type { Ref } from 'vue'
import type { MediaPickerOptions, SelectionMode } from '~~/lib/publisher-admin/types/media'

/**
 * Selection mode of the picker
 */
type MediaPickerMode = SelectionMode

/**
 * Result of the picker selection
 */
type MediaPickerResult = number | number[] | null

/**
 * Composable for managing the MediaPicker modal state.
 * Provides a Promise-based API for async selection flows.
 */
export function useMediaPicker() {
  // ─── State ────────────────────────────────────────────────────────

  const isOpen = ref(false)
  const selection = ref<MediaPickerResult>(null)
  const mode = ref<MediaPickerMode>('single')
  const options = ref<MediaPickerOptions>({})

  // Promise resolver for async API
  let resolvePromise: ((value: MediaPickerResult) => void) | null = null

  // ─── Computed ──────────────────────────────────────────────────────

  /**
   * Whether the picker is in multiple selection mode
   */
  const isMultiple = computed(() => mode.value === 'multiple')

  /**
   * Whether the picker is in folder selection mode
   */
  const isFolderMode = computed(() => mode.value === 'folder')

  /**
   * Number of selected items
   */
  const selectionCount = computed(() => {
    if (Array.isArray(selection.value)) {
      return selection.value.length
    }
    return selection.value !== null ? 1 : 0
  })

  /**
   * Whether any item is selected
   */
  const hasSelection = computed(() => {
    if (Array.isArray(selection.value)) {
      return selection.value.length > 0
    }
    return selection.value !== null
  })

  // ─── Actions ───────────────────────────────────────────────────────

  /**
   * Open the media picker and return a promise that resolves with the selection.
   * Usage: const selectedId = await picker.open({ multiple: true })
   */
  function open(opts: MediaPickerOptions = {}): Promise<MediaPickerResult> {
    // Merge with defaults
    options.value = {
      multiple: false,
      allowedTypes: ['image/*'],
      allowFolderSelection: false,
      maxSelection: 10,
      ...opts,
    }

    // Determine mode
    mode.value = opts.allowFolderSelection
      ? 'folder'
      : opts.multiple
        ? 'multiple'
        : 'single'

    // Set initial selection
    if (opts.initialSelection !== undefined) {
      selection.value = opts.initialSelection
    }
    else {
      selection.value = opts.multiple ? [] : null
    }

    isOpen.value = true

    // Return promise that resolves when selection is confirmed
    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  /**
   * Close the picker without confirming selection (resolves with null)
   */
  function close(): void {
    isOpen.value = false
    selection.value = mode.value === 'multiple' ? [] : null

    if (resolvePromise) {
      resolvePromise(null)
      resolvePromise = null
    }
  }

  /**
   * Confirm the current selection and close the picker
   */
  function confirm(value?: MediaPickerResult): void {
    const finalSelection = value ?? selection.value
    isOpen.value = false

    if (resolvePromise) {
      resolvePromise(finalSelection)
      resolvePromise = null
    }
  }

  /**
   * Clear the current selection (without closing)
   */
  function clear(): void {
    selection.value = mode.value === 'multiple' ? [] : null
  }

  /**
   * Set the selection directly
   */
  function setSelection(value: MediaPickerResult): void {
    selection.value = value
  }

  /**
   * Toggle a file ID in the selection (multiple mode only)
   */
  function toggleFile(fileId: number): void {
    if (mode.value !== 'multiple') {
      selection.value = selection.value === fileId ? null : fileId
      return
    }

    const current = Array.isArray(selection.value) ? selection.value : []
    const index = current.indexOf(fileId)

    if (index === -1) {
      // Check max selection limit
      if (options.value.maxSelection && current.length >= options.value.maxSelection) {
        return
      }
      selection.value = [...current, fileId]
    }
    else {
      selection.value = current.filter(id => id !== fileId)
    }
  }

  /**
   * Check if a file ID is selected
   */
  function isSelected(fileId: number): boolean {
    if (Array.isArray(selection.value)) {
      return selection.value.includes(fileId)
    }
    return selection.value === fileId
  }

  /**
   * Select a folder (folder mode only)
   */
  function selectFolder(folderId: number): void {
    if (mode.value === 'folder') {
      selection.value = folderId
    }
  }

  return {
    // State
    isOpen,
    selection,
    mode,
    options,

    // Computed
    isMultiple,
    isFolderMode,
    selectionCount,
    hasSelection,

    // Actions
    open,
    close,
    confirm,
    clear,
    setSelection,
    toggleFile,
    isSelected,
    selectFolder,
  }
}

// Type exports for consumers
export type {
  MediaPickerMode,
  MediaPickerResult,
}
