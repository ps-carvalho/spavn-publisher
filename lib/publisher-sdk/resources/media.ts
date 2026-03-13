import type {
  PublisherConfig,
  PaginatedResponse,
  MediaListOptions,
  MediaUploadOptions,
} from '../types'
import { request, buildAuthHeaders } from '../utils'
import { PublisherApiError } from '../errors'

/**
 * A media file in the Publisher CMS
 */
export interface Media {
  id: number
  name: string
  filename: string
  url: string
  mimeType: string
  size: number
  width?: number
  height?: number
  folder?: string
  createdAt?: string
  updatedAt?: string
}

/**
 * Resource for interacting with media files in the Publisher CMS.
 *
 * @example
 * ```ts
 * // List all media
 * const { data: files } = await client.media.list()
 *
 * // List media in a specific folder
 * const { data: images } = await client.media.list({ folder: '/images' })
 *
 * // Upload a file
 * const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
 * const media = await client.media.upload(file, { folder: '/documents' })
 *
 * // Delete a file
 * await client.media.delete(123)
 * ```
 */
export class MediaResource {
  constructor(private config: PublisherConfig) {}

  /**
   * List media files with optional filtering and pagination
   */
  async list(options?: MediaListOptions): Promise<PaginatedResponse<Media>> {
    const params = new URLSearchParams()

    if (options?.folder) {
      params.set('folder', options.folder)
    }
    if (options?.page !== undefined) {
      params.set('page', String(options.page))
    }
    if (options?.pageSize !== undefined) {
      params.set('pageSize', String(options.pageSize))
    }

    const qs = params.toString()
    return request<PaginatedResponse<Media>>(
      this.config,
      'GET',
      `/api/publisher/media${qs ? `?${qs}` : ''}`,
    )
  }

  /**
   * Upload a file to the media library
   *
   * @param file - The file to upload (File or Blob)
   * @param options - Upload options (folder, filename)
   * @returns The created media object
   */
  async upload(file: File | Blob, options?: MediaUploadOptions): Promise<Media> {
    const fetchFn = this.config.fetch || globalThis.fetch
    const url = `${this.config.baseUrl.replace(/\/$/, '')}/api/publisher/media`

    const formData = new FormData()
    formData.append('file', file, options?.filename || (file as File).name)
    if (options?.folder) {
      formData.append('folder', options.folder)
    }

    // Don't set Content-Type for FormData — browser sets it with boundary
    const headers = buildAuthHeaders(this.config)

    const response = await fetchFn(url, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (!response.ok) {
      let errorData: Record<string, unknown> = {}
      try {
        errorData = await response.json()
      } catch {
        // Response may not be JSON
      }

      const error = (errorData?.error as Record<string, unknown>) || errorData
      throw new PublisherApiError(
        response.status,
        (error?.code as string) || 'UPLOAD_ERROR',
        (error?.message as string) || 'Upload failed',
        error,
      )
    }

    return response.json() as Promise<Media>
  }

  /**
   * Delete a media file
   */
  async delete(id: number | string): Promise<void> {
    await request<void>(this.config, 'DELETE', `/api/publisher/media/${id}`)
  }
}
