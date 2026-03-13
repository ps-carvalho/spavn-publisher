import { writeFile, mkdir, unlink, stat, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, resolve, normalize } from 'path'
import { createReadStream, type Stats } from 'fs'
import type {
  StorageProvider,
  LocalStorageConfig,
  UploadParams,
  UploadResult,
  FileMetadata,
  UrlOptions,
} from '../types'

/**
 * Local filesystem storage provider.
 *
 * Stores files on the local filesystem, suitable for development and
 * single-server deployments. Files are served from a public directory
 * accessible via HTTP.
 *
 * @example
 * ```typescript
 * const provider = new LocalFilesystemProvider({
 *   type: 'local',
 *   basePath: './public/uploads',
 *   baseUrl: '/uploads',
 *   createDirectories: true,
 * })
 *
 * const result = await provider.upload({
 *   key: 'folders/123/image.jpg',
 *   data: imageBuffer,
 *   mimeType: 'image/jpeg',
 * })
 * // result.url = '/uploads/folders/123/image.jpg'
 * ```
 */
export class LocalFilesystemProvider implements StorageProvider {
  readonly name = 'local'
  readonly type = 'local' as const

  private readonly basePath: string
  private readonly baseUrl: string
  private readonly createDirectories: boolean

  /**
   * Creates a new LocalFilesystemProvider instance.
   *
   * @param config - Configuration options for local storage
   */
  constructor(config: LocalStorageConfig) {
    this.basePath = resolve(config.basePath)
    this.baseUrl = config.baseUrl
    this.createDirectories = config.createDirectories ?? true
  }

  /**
   * Uploads a file to the local filesystem.
   *
   * @param params - Upload parameters including key, data, and mimeType
   * @returns Promise resolving to upload result with key, url, and size
   * @throws Error if the file cannot be written
   */
  async upload(params: UploadParams): Promise<UploadResult> {
    const { key, data, mimeType } = params
    const fullPath = this.getFullPath(key)

    try {
      // Ensure directory exists if createDirectories is enabled
      if (this.createDirectories) {
        const dir = fullPath.substring(0, fullPath.lastIndexOf('/'))
        if (dir && !existsSync(dir)) {
          await mkdir(dir, { recursive: true, mode: 0o755 })
        }
      }

      // Handle Buffer or ReadableStream data
      let buffer: Buffer
      if (Buffer.isBuffer(data)) {
        buffer = data
      } else {
        // Convert ReadableStream to Buffer
        buffer = await this.streamToBuffer(data)
      }

      // Write file to disk
      await writeFile(fullPath, buffer)

      // Get file stats for size and lastModified
      const stats = await stat(fullPath)

      return {
        key,
        url: this.buildPublicUrl(key),
        size: stats.size,
        lastModified: stats.mtime.toISOString(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to upload file: ${message}`)
    }
  }

  /**
   * Deletes a file from the local filesystem.
   * Silently succeeds if the file doesn't exist.
   *
   * @param key - Storage key of the file to delete
   * @throws Error if deletion fails (other than file not found)
   */
  async delete(key: string): Promise<void> {
    const fullPath = this.getFullPath(key)

    try {
      // Check if file exists before attempting deletion
      if (existsSync(fullPath)) {
        await unlink(fullPath)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to delete file: ${message}`)
    }
  }

  /**
   * Gets the URL for accessing a file.
   * For local storage, returns the URL relative to the baseUrl.
   *
   * @param key - Storage key of the file
   * @param _options - URL options (not used for local storage)
   * @returns Promise resolving to the file URL
   */
  async getUrl(key: string, _options?: UrlOptions): Promise<string> {
    // Local storage doesn't support signed URLs, so we return the public URL
    return this.buildPublicUrl(key)
  }

  /**
   * Checks if a file exists in storage.
   *
   * @param key - Storage key to check
   * @returns Promise resolving to true if file exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    const fullPath = this.getFullPath(key)
    return existsSync(fullPath)
  }

  /**
   * Gets metadata for a file.
   *
   * @param key - Storage key of the file
   * @returns Promise resolving to file metadata, or null if file doesn't exist
   */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    const fullPath = this.getFullPath(key)

    try {
      if (!existsSync(fullPath)) {
        return null
      }

      const stats = await stat(fullPath)

      return {
        key,
        size: stats.size,
        mimeType: this.getMimeTypeFromPath(key),
        lastModified: stats.mtime.toISOString(),
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to get metadata: ${message}`)
    }
  }

  /**
   * Streams file content for downloads.
   *
   * @param key - Storage key of the file
   * @returns Promise resolving to a ReadableStream of file content
   * @throws Error if file doesn't exist
   */
  async stream(key: string): Promise<ReadableStream<Uint8Array>> {
    const fullPath = this.getFullPath(key)

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: "${key}"`)
    }

    // Create a Node.js ReadStream and convert to Web ReadableStream
    const nodeStream = createReadStream(fullPath)

    return new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk))
        })

        nodeStream.on('end', () => {
          controller.close()
        })

        nodeStream.on('error', (error: Error) => {
          controller.error(error)
        })
      },

      cancel() {
        nodeStream.destroy()
      },
    })
  }

  // ─── Private Helper Methods ───────────────────────────────────────────────────

  /**
   * Gets the full filesystem path for a storage key.
   *
   * @param key - Storage key (relative path)
   * @returns Absolute filesystem path
   * @throws Error if key is invalid or resolves outside base path
   */
  private getFullPath(key: string): string {
    // Validate key format — only allow safe characters
    if (!/^[a-zA-Z0-9._\-\/]+$/.test(key)) {
      throw new Error(`Invalid storage key: "${key}"`)
    }

    // Normalize and resolve to absolute path
    const normalizedKey = normalize(key)
    const fullPath = resolve(this.basePath, normalizedKey)

    // Defense in depth: ensure resolved path is within basePath
    const resolvedBase = resolve(this.basePath)
    if (!fullPath.startsWith(resolvedBase + '/') && fullPath !== resolvedBase) {
      throw new Error(`Storage key "${key}" resolves outside base path`)
    }

    return fullPath
  }

  /**
   * Builds the public URL for a storage key.
   *
   * @param key - Storage key (relative path)
   * @returns Public URL path
   */
  private buildPublicUrl(key: string): string {
    // Ensure baseUrl doesn't have trailing slash and key doesn't have leading slash
    const baseUrl = this.baseUrl.replace(/\/$/, '')
    const normalizedKey = key.replace(/^\//, '')
    return `${baseUrl}/${normalizedKey}`
  }

  /**
   * Converts a ReadableStream to a Buffer.
   *
   * @param stream - ReadableStream to convert
   * @returns Promise resolving to Buffer
   */
  private async streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
    const chunks: Uint8Array[] = []
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) {
          chunks.push(value)
        }
      }

      // Calculate total length
      const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)

      // Combine all chunks into a single Buffer
      const result = Buffer.alloc(totalLength)
      let offset = 0
      for (const chunk of chunks) {
        result.set(chunk, offset)
        offset += chunk.length
      }

      return result
    } finally {
      reader.releaseLock()
    }
  }

  /**
   * Attempts to determine MIME type from file extension.
   *
   * @param path - File path or key
   * @returns MIME type string
   */
  private getMimeTypeFromPath(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase()

    const mimeTypes: Record<string, string> = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      ico: 'image/x-icon',
      bmp: 'image/bmp',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',

      // Text
      txt: 'text/plain',
      html: 'text/html',
      css: 'text/css',
      js: 'application/javascript',
      json: 'application/json',
      xml: 'application/xml',
      csv: 'text/csv',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',

      // Video
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mkv: 'video/x-matroska',

      // Archives
      zip: 'application/zip',
      gz: 'application/gzip',
      tar: 'application/x-tar',
      rar: 'application/vnd.rar',
      '7z': 'application/x-7z-compressed',
    }

    return (ext && mimeTypes[ext]) || 'application/octet-stream'
  }
}

export default LocalFilesystemProvider
