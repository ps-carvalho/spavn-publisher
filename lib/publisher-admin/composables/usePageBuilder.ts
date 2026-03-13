import { onMounted, onUnmounted } from 'vue'
import type { PageTypeConfig, BlockTypeConfig, AreaConfig } from '~~/lib/publisher/types'

/**
 * Block data structure as returned from API
 */
export interface PageBlock {
  id: number
  blockType: string
  sortOrder: number
  data: Record<string, unknown>
}

/**
 * Page data structure as returned from API
 */
export interface PageData {
  id: number
  title: string
  slug: string
  status: 'draft' | 'published'
  pageType: string
  areas: Record<string, PageBlock[]>
  meta: {
    title?: string
    description?: string
    image?: string
    extra?: Record<string, unknown>
  }
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

/**
 * Composable for managing page builder editor state.
 * Single source of truth for page editing.
 */
export function usePageBuilder(pageId: Ref<string>) {
  // --- State ---
  const page = ref<PageData | null>(null)
  const blocks = ref<Record<string, PageBlock[]>>({})
  const pageType = ref<PageTypeConfig | null>(null)
  const blockTypes = ref<BlockTypeConfig[]>([])
  const selectedBlockId = ref<number | null>(null)
  const isDirty = ref(false)
  const isSaving = ref(false)
  const isLoading = ref(true)
  const error = ref<Error | null>(null)
  const dirtyBlockIds = ref<Set<number>>(new Set())

  // --- Toast (must be called synchronously during setup) ---
  const toast = useToast()

  // --- Beforeunload protection for unsaved changes ---
  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (dirtyBlockIds.value.size > 0) {
      event.preventDefault()
      event.returnValue = 'You have unsaved block changes. Are you sure you want to leave?'
      return event.returnValue
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload)
  })

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
  })

  // --- Computed ---
  const selectedBlock = computed(() => {
    if (!selectedBlockId.value) return null
    for (const areaBlocks of Object.values(blocks.value)) {
      const block = areaBlocks.find(b => b.id === selectedBlockId.value)
      if (block) return block
    }
    return null
  })

  const selectedBlockType = computed(() => {
    if (!selectedBlock.value) return null
    return blockTypes.value.find(bt => bt.name === selectedBlock.value!.blockType) || null
  })

  const pageTitle = computed({
    get: () => page.value?.title || '',
    set: (value: string) => {
      if (page.value) {
        page.value = { ...page.value, title: value }
        isDirty.value = true
      }
    },
  })

  const currentStatus = computed(() => page.value?.status || 'draft')

  // --- Helper to find a block by ID across all areas ---
  function findBlock(blockId: number): PageBlock | null {
    for (const areaBlocks of Object.values(blocks.value)) {
      const block = areaBlocks.find(b => b.id === blockId)
      if (block) return block
    }
    return null
  }

  // --- Methods ---

  /**
   * Load page data, blocks, page type config, and block types.
   */
  async function loadPage() {
    isLoading.value = true
    error.value = null

    try {
      // Fetch page with blocks
      const pageRes = await $fetch<{ data: PageData }>(`/api/v1/pages/${pageId.value}`)
      page.value = pageRes.data
      blocks.value = pageRes.data.areas || {}

      // Fetch page type config
      const pageTypesRes = await $fetch<{ data: PageTypeConfig[] }>('/api/publisher/page-types')
      pageType.value = pageTypesRes.data.find(pt => pt.name === page.value!.pageType) || null

      // Fetch all block types
      const blockTypesRes = await $fetch<{ data: BlockTypeConfig[] }>('/api/publisher/block-types')
      blockTypes.value = blockTypesRes.data

      // Ensure all areas from page type exist in blocks (even empty)
      if (pageType.value) {
        for (const areaName of Object.keys(pageType.value.areas)) {
          if (!blocks.value[areaName]) {
            blocks.value[areaName] = []
          }
        }
      }
    }
    catch (e) {
      error.value = e instanceof Error ? e : new Error('Failed to load page')
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Save page metadata (title, slug, meta fields).
   */
  async function savePage(updates: Record<string, unknown>) {
    isSaving.value = true

    try {
      const res = await $fetch<{ data: Partial<PageData> }>(`/api/v1/pages/${pageId.value}`, {
        method: 'PATCH',
        body: updates,
      })
      page.value = { ...page.value!, ...res.data }
      isDirty.value = false
      toast.add({ title: 'Saved', description: 'Page saved successfully', color: 'success' })
    }
    catch (e: unknown) {
      const err = e as { data?: { error?: { message?: string } } }
      toast.add({ title: 'Error', description: err?.data?.error?.message || 'Failed to save', color: 'error' })
    }
    finally {
      isSaving.value = false
    }
  }

  /**
   * Publish the page (set status to published).
   */
  async function publishPage() {
    isSaving.value = true

    try {
      const res = await $fetch<{ data: Partial<PageData> }>(`/api/v1/pages/${pageId.value}`, {
        method: 'PATCH',
        body: { status: 'published' },
      })
      page.value = { ...page.value!, ...res.data, status: 'published' }
      toast.add({ title: 'Published!', description: 'Page is now live', color: 'success' })
    }
    catch (e: unknown) {
      const err = e as { data?: { error?: { message?: string } } }
      toast.add({ title: 'Error', description: err?.data?.error?.message || 'Failed to publish', color: 'error' })
    }
    finally {
      isSaving.value = false
    }
  }

  /**
   * Unpublish the page (set status to draft).
   */
  async function unpublishPage() {
    isSaving.value = true

    try {
      const res = await $fetch<{ data: Partial<PageData> }>(`/api/v1/pages/${pageId.value}`, {
        method: 'PATCH',
        body: { status: 'draft' },
      })
      page.value = { ...page.value!, ...res.data, status: 'draft' }
      toast.add({ title: 'Unpublished', description: 'Page is now a draft', color: 'success' })
    }
    catch {
      toast.add({ title: 'Error', description: 'Failed to unpublish', color: 'error' })
    }
    finally {
      isSaving.value = false
    }
  }

  /**
   * Add a new block to an area.
   */
  async function addBlock(areaName: string, blockTypeName: string, position?: number) {
    try {
      const res = await $fetch<{ data: PageBlock }>(`/api/v1/pages/${pageId.value}/blocks`, {
        method: 'POST',
        body: { areaName, blockType: blockTypeName, data: {} },
      })

      // Add to local state
      if (!blocks.value[areaName]) {
        blocks.value[areaName] = []
      }

      if (position !== undefined) {
        blocks.value[areaName].splice(position, 0, res.data)
      }
      else {
        blocks.value[areaName].push(res.data)
      }

      // Auto-select the new block
      selectBlock(res.data.id)
    }
    catch (e: unknown) {
      const err = e as { data?: { error?: { message?: string } } }
      toast.add({ title: 'Error', description: err?.data?.error?.message || 'Failed to add block', color: 'error' })
    }
  }

  /**
   * Update block data locally (optimistic UI update).
   * Does NOT save to API - use saveBlock() to persist changes.
   */
  function updateBlock(blockId: number, data: Record<string, unknown>) {
    const block = findBlock(blockId)
    if (block) {
      block.data = { ...block.data, ...data }
      dirtyBlockIds.value.add(blockId)
    }
  }

  /**
   * Save block data to API.
   */
  async function saveBlock(blockId: number) {
    const block = findBlock(blockId)
    if (!block) return

    isSaving.value = true
    try {
      await $fetch(`/api/v1/pages/${pageId.value}/blocks/${blockId}`, {
        method: 'PATCH',
        body: { data: block.data },
      })
      dirtyBlockIds.value.delete(blockId)
      toast.add({ title: 'Saved', description: 'Block changes saved', color: 'success' })
    }
    catch {
      toast.add({ title: 'Error', description: 'Failed to save block', color: 'error' })
    }
    finally {
      isSaving.value = false
    }
  }

  /**
   * Delete a block.
   */
  async function deleteBlock(blockId: number) {
    try {
      await $fetch(`/api/v1/pages/${pageId.value}/blocks/${blockId}`, { method: 'DELETE' })

      // Remove from local state
      for (const [area, areaBlocks] of Object.entries(blocks.value)) {
        const idx = areaBlocks.findIndex(b => b.id === blockId)
        if (idx !== -1) {
          areaBlocks.splice(idx, 1)
          break
        }
      }

      if (selectedBlockId.value === blockId) {
        deselectBlock()
      }
    }
    catch {
      toast.add({ title: 'Error', description: 'Failed to delete block', color: 'error' })
    }
  }

  /**
   * Reorder blocks within an area.
   */
  async function reorderBlocks(areaName: string, blockIds: number[]) {
    try {
      await $fetch(`/api/v1/pages/${pageId.value}/blocks/reorder`, {
        method: 'POST',
        body: { areaName, blockIds },
      })

      // Update local order optimistically
      const areaBlocks = blocks.value[areaName]
      if (areaBlocks) {
        const reordered: PageBlock[] = []
        for (const id of blockIds) {
          const block = areaBlocks.find(b => b.id === id)
          if (block) reordered.push(block)
        }
        blocks.value[areaName] = reordered
      }
    }
    catch {
      toast.add({ title: 'Error', description: 'Failed to reorder blocks', color: 'error' })
    }
  }

  /**
   * Select a block for editing.
   */
  function selectBlock(blockId: number) {
    selectedBlockId.value = blockId
  }

  /**
   * Deselect the current block.
   */
  function deselectBlock() {
    selectedBlockId.value = null
  }

  /**
   * Get area config by name.
   */
  function getAreaConfig(areaName: string): AreaConfig | undefined {
    return pageType.value?.areas[areaName]
  }

  /**
   * Check if a block type is allowed in a specific area.
   */
  function isBlockTypeAllowed(areaName: string, blockTypeName: string): boolean {
    const area = getAreaConfig(areaName)
    return area?.allowedBlocks.includes(blockTypeName) ?? false
  }

  return {
    // State
    page,
    blocks,
    pageType,
    blockTypes,
    selectedBlockId,
    selectedBlock,
    selectedBlockType,
    isDirty,
    isSaving,
    isLoading,
    error,
    dirtyBlockIds,

    // Computed
    pageTitle,
    currentStatus,

    // Methods
    loadPage,
    savePage,
    publishPage,
    unpublishPage,
    addBlock,
    updateBlock,
    saveBlock,
    deleteBlock,
    reorderBlocks,
    selectBlock,
    deselectBlock,
    getAreaConfig,
    isBlockTypeAllowed,
  }
}
