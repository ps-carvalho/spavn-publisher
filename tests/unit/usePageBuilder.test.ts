import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ref } from 'vue'

// Mock the toast composable
const mockToastAdd = vi.fn()
vi.mock('#app', () => ({
  useToast: () => ({ add: mockToastAdd }),
  useNuxtApp: () => ({
    $fetch: vi.fn(),
  }),
}))

// Import the composable after mocks
import { usePageBuilder, PageBlock, PageData } from '../../app/composables/usePageBuilder'

describe('usePageBuilder composable', () => {
  let pageId: ReturnType<typeof ref<string>>

  // Mock page data
  const mockBlock1: PageBlock = {
    id: 1,
    blockType: 'text',
    sortOrder: 1,
    data: { content: 'Block 1 content' },
  }

  const mockBlock2: PageBlock = {
    id: 2,
    blockType: 'image',
    sortOrder: 2,
    data: { src: 'image.jpg', alt: 'An image' },
  }

  const mockPageData: PageData = {
    id: 1,
    title: 'Test Page',
    slug: 'test-page',
    status: 'draft',
    pageType: 'standard',
    areas: {
      main: [mockBlock1, mockBlock2],
      sidebar: [],
    },
    meta: {},
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  }

  beforeEach(() => {
    pageId = ref('1')
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('updateBlock', () => {
    it('should update block data locally without API call', () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      const newData = { content: 'Updated content' }
      builder.updateBlock(1, newData)

      // Verify block data was updated through blocks ref
      expect(builder.blocks.value.main[0].data.content).toBe('Updated content')
    })

    it('should merge new data with existing data', () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock2 }], sidebar: [] }

      builder.updateBlock(2, { alt: 'New alt text' })

      // Verify both old and new data are present
      expect(builder.blocks.value.main[0].data.src).toBe('image.jpg') // Original preserved
      expect(builder.blocks.value.main[0].data.alt).toBe('New alt text') // New added
    })

    it('should add block ID to dirtyBlockIds', () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }
      builder.dirtyBlockIds.value = new Set()

      builder.updateBlock(1, { content: 'Updated' })

      expect(builder.dirtyBlockIds.value.has(1)).toBe(true)
    })

    it('should handle multiple dirty blocks', () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = {
        main: [
          { ...mockBlock1 },
          { ...mockBlock2 },
        ],
        sidebar: [],
      }

      builder.updateBlock(1, { content: 'Updated 1' })
      builder.updateBlock(2, { alt: 'Updated 2' })

      expect(builder.dirtyBlockIds.value.has(1)).toBe(true)
      expect(builder.dirtyBlockIds.value.has(2)).toBe(true)
      expect(builder.dirtyBlockIds.value.size).toBe(2)
    })

    it('should not add duplicate IDs to dirtyBlockIds', () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      builder.updateBlock(1, { content: 'First update' })
      builder.updateBlock(1, { content: 'Second update' })

      expect(builder.dirtyBlockIds.value.size).toBe(1)
      expect(builder.dirtyBlockIds.value.has(1)).toBe(true)
    })

    it('should not modify dirtyBlockIds if block not found', () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      builder.updateBlock(999, { content: 'Update' })

      expect(builder.dirtyBlockIds.value.has(999)).toBe(false)
      expect(builder.dirtyBlockIds.value.size).toBe(0)
    })

    it('should not make any API calls', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      // Spy on $fetch to ensure it's not called
      const fetchSpy = vi.spyOn(global, '$fetch' as any)

      builder.updateBlock(1, { content: 'Updated' })

      expect(fetchSpy).not.toHaveBeenCalled()
    })
  })

  describe('saveBlock', () => {
    it('should save block to API successfully', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      const mockResponse = { data: { id: 1, data: { content: 'Updated' } } }
      global.$fetch = vi.fn().mockResolvedValue(mockResponse)

      await builder.saveBlock(1)

      expect(global.$fetch).toHaveBeenCalledWith(
        '/api/v1/pages/1/blocks/1',
        expect.objectContaining({
          method: 'PATCH',
          body: { data: { content: 'Block 1 content' } },
        })
      )
    })

    it('should clear block from dirtyBlockIds on success', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }
      builder.dirtyBlockIds.value.add(1)

      global.$fetch = vi.fn().mockResolvedValue({})

      await builder.saveBlock(1)

      expect(builder.dirtyBlockIds.value.has(1)).toBe(false)
    })

    it('should show success toast on successful save', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      global.$fetch = vi.fn().mockResolvedValue({})

      await builder.saveBlock(1)

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Saved',
        description: 'Block changes saved',
        color: 'success',
      })
    })

    it('should show error toast on API failure', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      global.$fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await builder.saveBlock(1)

      expect(mockToastAdd).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Failed to save block',
        color: 'error',
      })
    })

    it('should keep block in dirtyBlockIds on failure', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }
      builder.dirtyBlockIds.value.add(1)

      global.$fetch = vi.fn().mockRejectedValue(new Error('Network error'))

      await builder.saveBlock(1)

      expect(builder.dirtyBlockIds.value.has(1)).toBe(true)
    })

    it('should not attempt save if block not found', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      const fetchMock = vi.fn()
      global.$fetch = fetchMock

      await builder.saveBlock(999)

      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('should set isSaving during save operation', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }

      global.$fetch = vi.fn().mockImplementation(async () => {
        expect(builder.isSaving.value).toBe(true)
        return {}
      })

      await builder.saveBlock(1)

      expect(builder.isSaving.value).toBe(false)
    })

    it('should handle multiple concurrent saves', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = {
        main: [
          { ...mockBlock1, id: 1, data: { content: 'Block 1' } },
          { ...mockBlock2, id: 2, data: { src: 'image1.jpg' } },
        ],
        sidebar: [],
      }

      global.$fetch = vi.fn().mockResolvedValue({})

      await Promise.all([
        builder.saveBlock(1),
        builder.saveBlock(2),
      ])

      expect(global.$fetch).toHaveBeenCalledTimes(2)
      expect(builder.dirtyBlockIds.value.has(1)).toBe(false)
      expect(builder.dirtyBlockIds.value.has(2)).toBe(false)
    })
  })

  describe('dirtyBlockIds integration', () => {
    it('should track multiple blocks being edited and saved', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = {
        main: [
          { ...mockBlock1, id: 1 },
          { ...mockBlock2, id: 2 },
        ],
        sidebar: [],
      }

      // Update both blocks
      builder.updateBlock(1, { content: 'Updated 1' })
      builder.updateBlock(2, { alt: 'Updated 2' })

      expect(builder.dirtyBlockIds.value.size).toBe(2)

      // Save first block
      global.$fetch = vi.fn().mockResolvedValue({})
      await builder.saveBlock(1)

      expect(builder.dirtyBlockIds.value.size).toBe(1)
      expect(builder.dirtyBlockIds.value.has(1)).toBe(false)
      expect(builder.dirtyBlockIds.value.has(2)).toBe(true)

      // Save second block
      await builder.saveBlock(2)

      expect(builder.dirtyBlockIds.value.size).toBe(0)
    })

    it('should handle save failure for one of multiple dirty blocks', async () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = {
        main: [
          { ...mockBlock1, id: 1 },
          { ...mockBlock2, id: 2 },
        ],
        sidebar: [],
      }

      builder.updateBlock(1, { content: 'Updated 1' })
      builder.updateBlock(2, { alt: 'Updated 2' })

      // First save succeeds, second fails
      let callCount = 0
      global.$fetch = vi.fn().mockImplementation(() => {
        callCount++
        if (callCount === 1) return Promise.resolve({})
        return Promise.reject(new Error('Save failed'))
      })

      await builder.saveBlock(1)
      await builder.saveBlock(2)

      expect(builder.dirtyBlockIds.value.size).toBe(1)
      expect(builder.dirtyBlockIds.value.has(1)).toBe(false)
      expect(builder.dirtyBlockIds.value.has(2)).toBe(true)
    })

    it('should expose dirtyBlockIds for UI consumption', () => {
      const builder = usePageBuilder(pageId)
      
      // dirtyBlockIds should be exposed
      expect(builder.dirtyBlockIds).toBeDefined()
      expect(builder.dirtyBlockIds.value).toBeInstanceOf(Set)
    })

    it('should allow dirtyBlockIds to be checked for specific blocks', () => {
      const builder = usePageBuilder(pageId)
      builder.page.value = mockPageData
      builder.blocks.value = { main: [{ ...mockBlock1 }], sidebar: [] }
      builder.dirtyBlockIds.value = new Set()

      expect(builder.dirtyBlockIds.value.has(1)).toBe(false)

      builder.updateBlock(1, { content: 'Updated' })

      expect(builder.dirtyBlockIds.value.has(1)).toBe(true)
    })
  })
})
