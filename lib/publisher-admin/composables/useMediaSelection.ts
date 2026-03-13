import type { MediaItem } from '~~/lib/publisher-admin/types/media'

export interface UseMediaSelectionReturn {
  selectedIds: Ref<Set<number>>
  isSelectionMode: Ref<boolean>
  selectedCount: ComputedRef<number>
  allSelected: ComputedRef<boolean>
  toggleSelection: (id: number) => void
  toggleSelectAll: (media: MediaItem[]) => void
  clearSelection: () => void
  isSelected: (id: number) => boolean
}

export function useMediaSelection(): UseMediaSelectionReturn {
  const selectedIds = ref<Set<number>>(new Set())
  const isSelectionMode = ref(false)
  
  const selectedCount = computed(() => selectedIds.value.size)
  
  function isSelected(id: number): boolean {
    return selectedIds.value.has(id)
  }
  
  function toggleSelection(id: number) {
    if (selectedIds.value.has(id)) {
      selectedIds.value.delete(id)
    }
    else {
      selectedIds.value.add(id)
    }
    // Force reactivity
    selectedIds.value = new Set(selectedIds.value)
    
    // Enter selection mode on first selection
    if (selectedIds.value.size > 0 && !isSelectionMode.value) {
      isSelectionMode.value = true
    }
    
    // Exit selection mode when empty
    if (selectedIds.value.size === 0) {
      isSelectionMode.value = false
    }
  }
  
  function toggleSelectAll(media: MediaItem[]) {
    const allSelected = media.length > 0 && selectedIds.value.size === media.length
    
    if (allSelected) {
      selectedIds.value.clear()
      isSelectionMode.value = false
    }
    else {
      selectedIds.value = new Set(media.map(m => m.id))
      isSelectionMode.value = true
    }
    // Force reactivity
    selectedIds.value = new Set(selectedIds.value)
  }
  
  function clearSelection() {
    selectedIds.value = new Set()
    isSelectionMode.value = false
  }
  
  const allSelected = computed(() => false) // This will be computed dynamically with media
  
  return {
    selectedIds,
    isSelectionMode,
    selectedCount,
    allSelected,
    toggleSelection,
    toggleSelectAll,
    clearSelection,
    isSelected,
  }
}
