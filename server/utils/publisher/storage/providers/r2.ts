import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
  NotFound,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type {
  StorageProvider,
  R2StorageConfig,
  UploadParams,
  UploadResult,
  FileMetadata,
  UrlOptions,
} from '../types'

/**
 * Cloudflare R2 storage provider.
 *
 * Uses the S3-compatible API to store files in Cloudflare R2.
 * R2 offers zero egress fees and is ideal for frequently accessed content.
 *
 * @example
 * ```typescript
 * const provider = new CloudflareR2Provider({
 *   type: 'r2',
 *   accountId: 'abc123',
 *   accessKeyId: 'key',
 *   secretAccessKey: 'secret',
 *   bucket: 'my-bucket',
 *   customDomain: 'https://cdn.example.com',
 * })
 *
 * const result = await provider.upload({
 *   key: 'folders/123/image.jpg',
 *   data: imageBuffer,
 *   mimeType: 'image/jpeg',
 * })
 * // result.url = 'https://cdn.example.com/folders/123/image.jpg' (if customDomain set)
 * // or signed URL if no customDomain
 * ```
 */
/**
 * Default signed URL expiration time in seconds (1 hour).
 */
const DEFAULT_SIGNED_URL_EXPIRY = 3600

export class CloudflareR2Provider implements StorageProvider {
  readonly name = 'r2'
  readonly type = 'r2' as const

  private readonly config: R2StorageConfig
  private _client: S3Client | null = null

  /**
   * Creates a new CloudflareR2Provider instance.
   *
   * @param config - Configuration options for R2 storage
   */
  constructor(config: R2StorageConfig) {
    this.config = config
  }

  /**
   * Gets the S3 client instance (lazy initialization).
   *
   * @returns S3Client instance configured for R2
   */
  private get client(): S3Client {
    if (!this._client) {
      const endpoint = `https://${this.config.accountId}.r2.cloudflarestorage.com`

      this._client = new S3Client({
        region: this.config.region ?? 'auto',
        endpoint,
        credentials: {
          accessKeyId: this.config.accessKeyId ?? process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: this.config.secretAccessKey ?? process.env.R2_SECRET_ACCESS_KEY ?? '',
        },
        // R2 requires path-style addressing
        forcePathStyle: true,
      })
    }
    return this._client
  }

  /**
   * Uploads a file to Cloudflare R2.
   *
   * @param params - Upload parameters including key, data, and mimeType
   * @returns Promise resolving to upload result with key, url, and size
   * @throws Error if upload fails
   */
  async upload(params: UploadParams): Promise<UploadResult> {
    const { key, data, mimeType, contentEncoding, cacheControl, metadata } = params

    try {
      // Convert ReadableStream to Buffer if needed
      let body: Uint8Array | Buffer
      if (Buffer.isBuffer(data)) {
        body = data
      } else {
        body = await this.streamToBuffer(data)
      }

      const input: PutObjectCommandInput = {
        Bucket: this.config.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
        ContentEncoding: contentEncoding,
        CacheControl: cacheControl,
        Metadata: metadata,
      }

      const command = new PutObjectCommand(input)
      const response = await this.client.send(command)

      return {
        key,
        url: await this.getUrl(key),
        size: body.length,
        etag: response.ETag?.replace(/"/g, ''), // Remove quotes from ETag
        lastModified: new Date().toISOString(),
      }
    } catch (error) {
      const message = this.formatError(error)
      throw new Error(`Failed to upload file "${key}" to R2: ${message}`)
    }
  }

  /**
   * Deletes a file from Cloudflare R2.
   * Silently succeeds if the file doesn't exist.
   *
   * @param key - Storage key of the file to delete
   * @throws Error if deletion fails (other than file not found)
   */
  async delete(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      })

      await this.client.send(command)
    } catch (error) {
      const message = this.formatError(error)
      throw new Error(`Failed to delete file "${key}" from R2: ${message}`)
    }
  }

  /**
   * Gets the URL for accessing a file.
   * Returns public URL if customDomain is configured and file is public.
   * Otherwise, generates a signed URL for private access.
   *
   * @param key - Storage key of the file
   * @param options - URL generation options (signed, expiry, etc.)
   * @returns Promise resolving to the file URL
   */
  async getUrl(key: string, options?: UrlOptions): Promise<string> {
    const { signed, expiresIn, contentDisposition, downloadFilename } = options ?? {}

    // If signed URL is explicitly requested or no custom domain is set, generate signed URL
    if (signed === true || !this.config.customDomain) {
      return this.generateSignedUrl(key, expiresIn, contentDisposition, downloadFilename)
    }

    // Return public URL if bucket is public and custom domain is set
    const baseUrl = this.config.customDomain.replace(/\/$/, '')
    const normalizedKey = key.replace(/^\//, '')
    return `${baseUrl}/${normalizedKey}`
  }

  /**
   * Checks if a file exists in storage.
   *
   * @param key - Storage key to check
   * @returns Promise resolving to true if file exists, false otherwise
   */
  async exists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      })

      await this.client.send(command)
      return true
    } catch (error) {
      if (error instanceof NotFound) {
        return false
      }
      // For other errors, return false but log if needed
      return false
    }
  }

  /**
   * Gets metadata for a file.
   *
   * @param key - Storage key of the file
   * @returns Promise resolving to file metadata, or null if file doesn't exist
   */
  async getMetadata(key: string): Promise<FileMetadata | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      })

      const response = await this.client.send(command)

      return {
        key,
        size: response.ContentLength ?? 0,
        mimeType: response.ContentType ?? 'application/octet-stream',
        contentEncoding: response.ContentEncoding,
        cacheControl: response.CacheControl,
        etag: response.ETag?.replace(/"/g, ''),
        lastModified: response.LastModified?.toISOString() ?? new Date().toISOString(),
        metadata: response.Metadata,
      }
    } catch (error) {
      if (error instanceof NotFound) {
        return null
      }
      const message = this.formatError(error)
      throw new Error(`Failed to get metadata for file "${key}" from R2: ${message}`)
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
    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: key,
      })

      const response = await this.client.send(command)

      if (!response.Body) {
        throw new Error('No body in response')
      }

      // The AWS SDK v3 returns a Web ReadableStream in browser/node environments
      return response.Body.transformToWebStream() as ReadableStream<Uint8Array>
    } catch (error) {
      if (error instanceof NotFound) {
        throw new Error(`File not found in R2: "${key}"`)
      }
      const message = this.formatError(error)
      throw new Error(`Failed to stream file "${key}" from R2: ${message}`)
    }
  }

  // ─── Private Helper Methods ───────────────────────────────────────────────────

  /**
   * Generates a signed URL for accessing a private file.
   *
   * @param key - Storage key of the file
   * @param expiresIn - URL expiration time in seconds
   * @param contentDisposition - Content disposition ('inline' or 'attachment')
   * @param downloadFilename - Custom filename for downloads
   * @returns Promise resolving to the signed URL
   */
  private async generateSignedUrl(
    key: string,
    expiresIn?: number,
    contentDisposition?: 'inline' | 'attachment',
    downloadFilename?: string
  ): Promise<string> {
    const input: {
      Bucket: string
      Key: string
      ResponseContentDisposition?: string
    } = {
      Bucket: this.config.bucket,
      Key: key,
    }

    // Add content disposition if specified
    if (contentDisposition || downloadFilename) {
      if (contentDisposition === 'attachment' || downloadFilename) {
        const filename = downloadFilename ?? key.split('/').pop() ?? 'download'
        input.ResponseContentDisposition = `attachment; filename="${filename}"`
      } else if (contentDisposition === 'inline') {
        input.ResponseContentDisposition = 'inline'
      }
    }

    const command = new GetObjectCommand(input)
    const expiry = expiresIn ?? DEFAULT_SIGNED_URL_EXPIRY

    return getSignedUrl(this.client, command, { expiresIn: expiry })
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
   * Formats an error for user-friendly display.
   *
   * @param error - Error to format
   * @returns Formatted error message
   */
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      // Handle specific AWS SDK errors
      const awsError = error as { name?: string; message?: string; Code?: string }
      const errorCode = awsError.name ?? awsError.Code

      switch (errorCode) {
        case 'NoSuchBucket':
          return `Bucket "${this.config.bucket}" does not exist`
        case 'AccessDenied':
          return 'Access denied. Check your R2 credentials and permissions'
        case 'InvalidAccessKeyId':
          return 'Invalid R2 access key ID'
        case 'SignatureDoesNotMatch':
          return 'Invalid R2 secret access key'
        case 'EntityTooLarge':
          return 'File exceeds the maximum size allowed by R2'
        case 'NoSuchKey':
          return 'File not found'
        default:
          return error.message
      }
    }
    return String(error)
  }
}

export default CloudflareR2Provider
