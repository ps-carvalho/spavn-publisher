import type { MediaItem, MediaListMeta, FolderTreeNodeWithCount, FolderDetail } from '~~/lib/publisher-admin/types/media'

export interface UseMediaLibraryReturn {
  // Pagination
  page: Ref<number>
  pageSize: number
  
  // Folder state
  activeFolderId: Ref<number | null>
  folderBreadcrumb: Ref<Array<{ id: number; name: string }>>
  
  // Data
  folders: ComputedRef<FolderTreeNodeWithCount[]>
  media: ComputedRef<MediaItem[]>
  pagination: ComputedRef<{ total: number; pageCount: number }>
  storageMeta: ComputedRef<MediaListMeta['storage'] | undefined>
  
  // Loading status
  status: Ref<string>
  foldersStatus: Ref<string>
  
  // Navigation
  selectFolder: (folderId: number | null) => Promise<void>
  breadcrumbItems: ComputedRef<Array<{ label: string; icon?: string; click?: () => void }>>
  
  // Refresh
  refresh: () => Promise<void>
  refreshFolders: () => Promise<void>
}

export function useMediaLibrary(): UseMediaLibraryReturn {
  const page = ref(1)
  const pageSize = 24
  
  // Folder state
  const activeFolderId = ref<number | null>(null)
  const folderBreadcrumb = ref<Array<{ id: number; name: string }>>([])
  
  // Fetch folder tree
  const { data: foldersData, refresh: refreshFolders, status: foldersStatus } = useFetch<{
    data: FolderTreeNodeWithCount[]
  }>('/api/publisher/folders', {
    query: { tree: 'true', includeMediaCount: 'true' },
  })
  
  const folders = computed(() => foldersData.value?.data || [])
  
  // Fetch media filtered by folder
  const { data, refresh, status } = useFetch<{
    data: MediaItem[]
    meta: MediaListMeta
  }>('/api/publisher/media', {
    query: computed(() => ({
      'pagination[page]': page.value,
      'pagination[pageSize]': pageSize,
      folderId: activeFolderId.value,
    })),
    watch: [page, activeFolderId],
  })
  
  const media = computed(() => data.value?.data || [])
  const pagination = computed(() => data.value?.meta?.pagination || { total: 0, pageCount: 0 })
  const storageMeta = computed(() => data.value?.meta?.storage)
  
  // Reset page when folder changes
  watch(activeFolderId, () => {
    page.value = 1
  })
  
  // Folder selection
  async function selectFolder(folderId: number | null) {
    activeFolderId.value = folderId
    
    // Update breadcrumb
    if (folderId === null) {
      folderBreadcrumb.value = []
    }
    else {
      // Fetch folder details to get breadcrumb
      try {
        const folderDetail = await $fetch<FolderDetail>(`/api/publisher/folders/${folderId}`)
        folderBreadcrumb.value = folderDetail.breadcrumb || []
      }
      catch {
        folderBreadcrumb.value = []
      }
    }
  }
  
  // Breadcrumb items for display
  const breadcrumbItems = computed(() => {
    const items: Array<{ label: string; icon?: string; click?: () => void }> = [
      { label: 'Home', icon: 'i-heroicons-home', click: () => selectFolder(null) },
    ]
    
    for (const folder of folderBreadcrumb.value) {
      items.push({
        label: folder.name,
        click: () => selectFolder(folder.id),
      })
    }
    
    return items
  })
  
  return {
    page,
    pageSize,
    activeFolderId,
    folderBreadcrumb,
    folders,
    media,
    pagination,
    storageMeta,
    status,
    foldersStatus,
    selectFolder,
    breadcrumbItems,
    refresh,
    refreshFolders,
  }
}
