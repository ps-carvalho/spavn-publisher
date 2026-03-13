import type { Ref } from 'vue'
import type { MediaPreview, MediaFormat } from '~~/lib/publisher-admin/types/media'

/**
 * Media item with format variants
 */
interface MediaWithFormats {
  url: string
  formats?: Record<string, MediaFormat>
  mimeType?: string
}

/**
 * Composable for media preview utilities.
 * Provides thumbnail URL extraction, size formatting, and metadata caching.
 */
export function useMediaPreview() {
  // ─── Cache ─────────────────────────────────────────────────────────

  const cache = new Map<number, MediaPreview>()
  const loadingIds = new Set<number>()

  // Reactive loading state for UI feedback
  const loadingPreviews = ref<Set<number>>(new Set())

  // ─── Preview Fetching ───────────────────────────────────────────────

  /**
   * Fetch preview data for a single media item by ID.
   * Uses caching to avoid repeated requests.
   */
  async function getMediaPreview(id: number | null | undefined): Promise<MediaPreview | null> {
    if (!id)
      return null

    // Check cache first
    if (cache.has(id)) {
      return cache.get(id)!
    }

    // Prevent duplicate requests
    if (loadingIds.has(id)) {
      return null
    }

    loadingIds.add(id)
    loadingPreviews.value.add(id)

    try {
      // Fetch media items - query the list endpoint and filter
      const response = await $fetch<{ data: any[] }>('/api/publisher/media', {
        query: {
          'pagination[pageSize]': 100,
        },
      })

      const item = response.data?.find(m => m.id === id)
      if (!item)
        return null

      const preview: MediaPreview = {
        id: item.id,
        name: item.name,
        originalName: item.originalName,
        mimeType: item.mimeType,
        thumbnailUrl: getThumbnailUrl(item),
        fullUrl: item.url,
        width: item.width,
        height: item.height,
        size: item.size,
        alternativeText: item.alternativeText,
      }

      cache.set(id, preview)
      return preview
    }
    catch (error) {
      console.error('Failed to fetch media preview:', error)
      return null
    }
    finally {
      loadingIds.delete(id)
      loadingPreviews.value.delete(id)
    }
  }

  /**
   * Fetch preview data for multiple media items by ID.
   * Returns a map of ID to preview data.
   */
  async function getMediaPreviews(ids: number[]): Promise<Map<number, MediaPreview>> {
    const result = new Map<number, MediaPreview>()

    if (!ids.length)
      return result

    // Check which IDs need to be fetched
    const uncachedIds = ids.filter(id => !cache.has(id))

    if (uncachedIds.length > 0) {
      try {
        const response = await $fetch<{ data: any[] }>('/api/publisher/media', {
          query: {
            'pagination[pageSize]': 100,
          },
        })

        // Cache all fetched items
        for (const item of response.data || []) {
          const preview: MediaPreview = {
            id: item.id,
            name: item.name,
            originalName: item.originalName,
            mimeType: item.mimeType,
            thumbnailUrl: getThumbnailUrl(item),
            fullUrl: item.url,
            width: item.width,
            height: item.height,
            size: item.size,
            alternativeText: item.alternativeText,
          }
          cache.set(item.id, preview)
        }
      }
      catch (error) {
        console.error('Failed to fetch media previews:', error)
      }
    }

    // Build result from cache
    for (const id of ids) {
      const preview = cache.get(id)
      if (preview) {
        result.set(id, preview)
      }
    }

    return result
  }

  // ─── URL Helpers ────────────────────────────────────────────────────

  /**
   * Get the best available thumbnail URL from a media object.
   * Prefers 'small' format, then 'thumbnail', then falls back to full URL.
   */
  function getThumbnailUrl(media: MediaWithFormats | null | undefined): string {
    if (!media)
      return ''

    if (media.formats?.small?.url) {
      return media.formats.small.url
    }
    if (media.formats?.thumbnail?.url) {
      return media.formats.thumbnail.url
    }
    return media.url
  }

  /**
   * Get the best available format URL for a given size preference.
   * Useful for responsive images.
   */
  function getFormatUrl(
    media: MediaWithFormats | null | undefined,
    preferredFormat: 'thumbnail' | 'small' | 'medium' | 'large' = 'small',
  ): string {
    if (!media)
      return ''

    if (media.formats?.[preferredFormat]?.url) {
      return media.formats[preferredFormat].url
    }

    // Fallback chain
    const fallbacks: (keyof NonNullable<MediaWithFormats['formats']>)[] = ['small', 'thumbnail', 'medium', 'large']
    for (const format of fallbacks) {
      if (media.formats?.[format]?.url) {
        return media.formats[format].url
      }
    }

    return media.url
  }

  // ─── Formatting Helpers ─────────────────────────────────────────────

  /**
   * Format file size in human-readable format.
   */
  function formatFileSize(bytes: number): string {
    if (bytes < 1024)
      return `${bytes} B`
    if (bytes < 1024 * 1024)
      return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /**
   * Format image dimensions as "W×H".
   */
  function formatDimensions(width?: number, height?: number): string {
    if (!width || !height)
      return ''
    return `${width}×${height}`
  }

  /**
   * Get a human-readable MIME type label.
   */
  function getMimeTypeLabel(mimeType: string): string {
    if (mimeType.startsWith('image/'))
      return 'Image'
    if (mimeType.startsWith('video/'))
      return 'Video'
    if (mimeType.startsWith('audio/'))
      return 'Audio'
    if (mimeType.includes('pdf'))
      return 'PDF'
    if (mimeType.includes('word') || mimeType.includes('document'))
      return 'Document'
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
      return 'Spreadsheet'
    return 'File'
  }

  /**
   * Get an icon name based on MIME type for UI components.
   */
  function getMediaIcon(mimeType: string): string {
    if (mimeType.startsWith('image/'))
      return 'i-heroicons-photo'
    if (mimeType.startsWith('video/'))
      return 'i-heroicons-video-camera'
    if (mimeType.startsWith('audio/'))
      return 'i-heroicons-musical-note'
    if (mimeType.includes('pdf'))
      return 'i-heroicons-document-text'
    return 'i-heroicons-document'
  }

  // ─── Cache Management ───────────────────────────────────────────────

  /**
   * Clear the preview cache.
   */
  function clearCache(): void {
    cache.clear()
  }

  /**
   * Remove a specific item from the cache.
   */
  function invalidateCache(id: number): void {
    cache.delete(id)
  }

  /**
   * Check if a preview is currently being loaded.
   */
  function isLoading(id: number): boolean {
    return loadingPreviews.value.has(id)
  }

  return {
    // State
    loadingPreviews: readonly(loadingPreviews),

    // Preview fetching
    getMediaPreview,
    getMediaPreviews,

    // URL helpers
    getThumbnailUrl,
    getFormatUrl,

    // Formatting helpers
    formatFileSize,
    formatDimensions,
    getMimeTypeLabel,
    getMediaIcon,

    // Cache management
    clearCache,
    invalidateCache,
    isLoading,
  }
}

// Make loadingPreviews readonly
function readonly<T>(ref: Ref<T>): Readonly<Ref<T>> {
  return ref as Readonly<Ref<T>>
}

// Type exports for consumers
export type {
  MediaWithFormats,
}
