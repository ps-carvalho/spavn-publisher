import type { MediaItem } from '~~/lib/publisher-admin/types/media'

export interface BulkOperationProgress {
  current: number
  total: number
  action: 'move' | 'delete' | null
}

export interface UseMediaOperationsReturn {
  // Upload state
  isUploading: Ref<boolean>
  fileInput: Ref<HTMLInputElement | null>
  triggerUpload: () => void
  handleUpload: (event: Event, activeFolderId: Ref<number | null>, refresh: () => Promise<void>, refreshFolders: () => Promise<void>) => Promise<void>
  
  // Detail panel state
  selectedMedia: Ref<MediaItem | null>
  showDetail: Ref<boolean>
  altText: Ref<string>
  selectMedia: (item: MediaItem) => void
  deleteMedia: (refresh: () => Promise<void>, refreshFolders: () => Promise<void>) => Promise<void>
  copyUrl: () => void
  
  // Move modal state
  showMoveModal: Ref<boolean>
  openMoveModal: () => void
  handleMoveMedia: (folderId: number | null, refresh: () => Promise<void>, refreshFolders: () => Promise<void>) => Promise<void>
  
  // Create folder modal state
  showCreateFolderModal: Ref<boolean>
  newFolderName: Ref<string>
  handleCreateFolderFromDialog: (activeFolderId: Ref<number | null>, folderBreadcrumb: Ref<Array<{ id: number; name: string }>>, refreshFolders: () => Promise<void>) => Promise<void>
  
  // Folder CRUD
  handleCreateFolder: (parentId: number | null, name: string, refreshFolders: () => Promise<void>) => Promise<void>
  handleRenameFolder: (folderId: number, name: string, refreshFolders: () => Promise<void>) => Promise<void>
  handleMoveFolder: (folderId: number, newParentId: number | null, refreshFolders: () => Promise<void>) => Promise<void>
  handleDeleteFolder: (folderId: number, mode: 'recursive' | 'move', activeFolderId: Ref<number | null>, folderBreadcrumb: Ref<Array<{ id: number; name: string }>>, refresh: () => Promise<void>, refreshFolders: () => Promise<void>) => Promise<void>
  
  // Bulk operations state
  showBulkMoveModal: Ref<boolean>
  showBulkDeleteConfirm: Ref<boolean>
  isBulkOperating: Ref<boolean>
  bulkOperationProgress: Ref<BulkOperationProgress>
  
  // Bulk operations
  handleBulkMove: (folderId: number | null, selectedIds: Set<number>, clearSelection: () => void, refresh: () => Promise<void>, refreshFolders: () => Promise<void>) => Promise<void>
  handleBulkDelete: (selectedIds: Set<number>, clearSelection: () => void, page: Ref<number>, media: MediaItem[], refresh: () => Promise<void>, refreshFolders: () => Promise<void>) => Promise<void>
}

export function useMediaOperations(): UseMediaOperationsReturn {
  const toast = useToast()
  
  // Upload state
  const isUploading = ref(false)
  const fileInput = ref<HTMLInputElement | null>(null)
  
  // Detail panel state
  const selectedMedia = ref<MediaItem | null>(null)
  const showDetail = ref(false)
  const altText = ref('')
  
  // Move modal state
  const showMoveModal = ref(false)
  
  // Create folder modal state
  const showCreateFolderModal = ref(false)
  const newFolderName = ref('')
  
  // Bulk operation state
  const showBulkMoveModal = ref(false)
  const showBulkDeleteConfirm = ref(false)
  const bulkOperationProgress = ref<BulkOperationProgress>({ current: 0, total: 0, action: null })
  const isBulkOperating = ref(false)
  
  // Upload handling
  function triggerUpload() {
    fileInput.value?.click()
  }
  
  async function handleUpload(
    event: Event,
    activeFolderId: Ref<number | null>,
    refresh: () => Promise<void>,
    refreshFolders: () => Promise<void>,
  ) {
    const input = event.target as HTMLInputElement
    const files = input.files
    if (!files?.length) return
    
    isUploading.value = true
    
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        
        // Include folderId if a folder is selected
        if (activeFolderId.value !== null) {
          formData.append('folderId', String(activeFolderId.value))
        }
        
        await $fetch('/api/publisher/media', {
          method: 'POST',
          body: formData,
        })
      }
      
      await refresh()
      await refreshFolders()
      toast.add({ title: `${files.length} file(s) uploaded`, color: 'success' })
    }
    catch (e: any) {
      toast.add({ title: e?.data?.data?.error?.message || 'Upload failed', color: 'error' })
    }
    finally {
      isUploading.value = false
      input.value = '' // Reset input
    }
  }
  
  function selectMedia(item: MediaItem) {
    selectedMedia.value = item
    altText.value = item.alternativeText || ''
    showDetail.value = true
  }
  
  async function deleteMedia(
    refresh: () => Promise<void>,
    refreshFolders: () => Promise<void>,
  ) {
    if (!selectedMedia.value) return
    
    try {
      await $fetch(`/api/publisher/media/${selectedMedia.value.id}`, { method: 'DELETE' })
      showDetail.value = false
      selectedMedia.value = null
      await refresh()
      await refreshFolders()
      toast.add({ title: 'File deleted', color: 'success' })
    }
    catch {
      toast.add({ title: 'Failed to delete', color: 'error' })
    }
  }
  
  function copyUrl() {
    if (selectedMedia.value) {
      navigator.clipboard.writeText(selectedMedia.value.url)
      toast.add({ title: 'URL copied', color: 'success' })
    }
  }
  
  function openMoveModal() {
    showMoveModal.value = true
  }
  
  async function handleMoveMedia(
    folderId: number | null,
    refresh: () => Promise<void>,
    refreshFolders: () => Promise<void>,
  ) {
    if (!selectedMedia.value) return
    
    try {
      await $fetch(`/api/publisher/media/${selectedMedia.value.id}/move`, {
        method: 'PATCH',
        body: { folderId },
      })
      
      showMoveModal.value = false
      
      // Update the selected media's folderId locally
      if (selectedMedia.value) {
        selectedMedia.value.folderId = folderId
      }
      
      await refresh()
      await refreshFolders()
      toast.add({ title: 'File moved', color: 'success' })
    }
    catch (e: any) {
      toast.add({ title: e?.data?.data?.error?.message || 'Failed to move file', color: 'error' })
    }
  }
  
  // Create folder from header dialog
  async function handleCreateFolderFromDialog(
    activeFolderId: Ref<number | null>,
    folderBreadcrumb: Ref<Array<{ id: number; name: string }>>,
    refreshFolders: () => Promise<void>,
  ) {
    const name = newFolderName.value.trim()
    if (!name) {
      toast.add({ title: 'Folder name is required', color: 'error' })
      return
    }
    
    await handleCreateFolder(activeFolderId.value, name, refreshFolders)
    showCreateFolderModal.value = false
    newFolderName.value = ''
  }
  
  // Folder CRUD handlers
  async function handleCreateFolder(
    parentId: number | null,
    name: string,
    refreshFolders: () => Promise<void>,
  ) {
    try {
      await $fetch('/api/publisher/folders', {
        method: 'POST',
        body: { name, parentId: parentId ?? undefined },
      })
      await refreshFolders()
      toast.add({ title: 'Folder created', color: 'success' })
    }
    catch (e: any) {
      toast.add({ title: e?.data?.data?.error?.message || 'Failed to create folder', color: 'error' })
    }
  }
  
  async function handleRenameFolder(
    folderId: number,
    name: string,
    refreshFolders: () => Promise<void>,
  ) {
    try {
      await $fetch(`/api/publisher/folders/${folderId}`, {
        method: 'PUT',
        body: { name },
      })
      await refreshFolders()
      toast.add({ title: 'Folder renamed', color: 'success' })
    }
    catch (e: any) {
      toast.add({ title: e?.data?.data?.error?.message || 'Failed to rename folder', color: 'error' })
    }
  }
  
  async function handleMoveFolder(
    folderId: number,
    newParentId: number | null,
    refreshFolders: () => Promise<void>,
  ) {
    try {
      await $fetch(`/api/publisher/folders/${folderId}`, {
        method: 'PUT',
        body: { parentId: newParentId },
      })
      await refreshFolders()
      toast.add({ title: 'Folder moved', color: 'success' })
    }
    catch (e: any) {
      toast.add({ title: e?.data?.data?.error?.message || 'Failed to move folder', color: 'error' })
    }
  }
  
  async function handleDeleteFolder(
    folderId: number,
    mode: 'recursive' | 'move',
    activeFolderId: Ref<number | null>,
    folderBreadcrumb: Ref<Array<{ id: number; name: string }>>,
    refresh: () => Promise<void>,
    refreshFolders: () => Promise<void>,
  ) {
    try {
      await $fetch(`/api/publisher/folders/${folderId}`, {
        method: 'DELETE',
        query: { mode },
      })
      
      // If we deleted the current folder, go back to root
      if (activeFolderId.value === folderId) {
        activeFolderId.value = null
        folderBreadcrumb.value = []
      }
      
      await refreshFolders()
      await refresh()
      toast.add({ title: 'Folder deleted', color: 'success' })
    }
    catch (e: any) {
      toast.add({ title: e?.data?.data?.error?.message || 'Failed to delete folder', color: 'error' })
    }
  }
  
  // Bulk move handler
  async function handleBulkMove(
    folderId: number | null,
    selectedIds: Set<number>,
    clearSelection: () => void,
    refresh: () => Promise<void>,
    refreshFolders: () => Promise<void>,
  ) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    
    isBulkOperating.value = true
    bulkOperationProgress.value = { current: 0, total: ids.length, action: 'move' }
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < ids.length; i++) {
      bulkOperationProgress.value.current = i + 1
      
      try {
        await $fetch(`/api/publisher/media/${ids[i]}/move`, {
          method: 'PATCH',
          body: { folderId },
        })
        successCount++
      }
      catch {
        failCount++
      }
    }
    
    isBulkOperating.value = false
    bulkOperationProgress.value = { current: 0, total: 0, action: null }
    showBulkMoveModal.value = false
    clearSelection()
    
    await refresh()
    await refreshFolders()
    
    if (failCount === 0) {
      toast.add({ title: `${successCount} file(s) moved`, color: 'success' })
    }
    else {
      toast.add({
        title: `${successCount} moved, ${failCount} failed`,
        color: 'warning',
      })
    }
  }
  
  // Bulk delete handler
  async function handleBulkDelete(
    selectedIds: Set<number>,
    clearSelection: () => void,
    page: Ref<number>,
    media: MediaItem[],
    refresh: () => Promise<void>,
    refreshFolders: () => Promise<void>,
  ) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return
    
    isBulkOperating.value = true
    bulkOperationProgress.value = { current: 0, total: ids.length, action: 'delete' }
    
    let successCount = 0
    let failCount = 0
    
    for (let i = 0; i < ids.length; i++) {
      bulkOperationProgress.value.current = i + 1
      
      try {
        await $fetch(`/api/publisher/media/${ids[i]}`, { method: 'DELETE' })
        successCount++
      }
      catch {
        failCount++
      }
    }
    
    isBulkOperating.value = false
    bulkOperationProgress.value = { current: 0, total: 0, action: null }
    showBulkDeleteConfirm.value = false
    clearSelection()
    
    // Check if current page might be empty now
    const remainingOnPage = media.length - successCount
    if (remainingOnPage <= 0 && page.value > 1) {
      page.value = page.value - 1
    }
    
    await refresh()
    await refreshFolders()
    
    if (failCount === 0) {
      toast.add({ title: `${successCount} file(s) deleted`, color: 'success' })
    }
    else {
      toast.add({
        title: `${successCount} deleted, ${failCount} failed`,
        color: 'warning',
      })
    }
  }
  
  return {
    isUploading,
    fileInput,
    triggerUpload,
    handleUpload,
    selectedMedia,
    showDetail,
    altText,
    selectMedia,
    deleteMedia,
    copyUrl,
    showMoveModal,
    openMoveModal,
    handleMoveMedia,
    showCreateFolderModal,
    newFolderName,
    handleCreateFolderFromDialog,
    handleCreateFolder,
    handleRenameFolder,
    handleMoveFolder,
    handleDeleteFolder,
    showBulkMoveModal,
    showBulkDeleteConfirm,
    isBulkOperating,
    bulkOperationProgress,
    handleBulkMove,
    handleBulkDelete,
  }
}
