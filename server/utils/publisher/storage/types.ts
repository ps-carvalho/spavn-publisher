/**
 * Storage Provider Types
 *
 * This module defines the interfaces and types for the storage abstraction layer.
 * The storage layer supports multiple backends (local filesystem, Cloudflare R2, S3)
 * through a unified interface.
 *
 * @example
 * ```typescript
 * const provider: StorageProvider = createStorageProvider(config.storage)
 * const result = await provider.upload({
 *   key: 'images/photo.jpg',
 *   data: fileBuffer,
 *   mimeType: 'image/jpeg',
 * })
 * ```
 */

// ─── Upload Types ─────────────────────────────────────────────────────────────

/**
 * Data source for file uploads.
 * Can be a Buffer for small files or ReadableStream for large file streaming.
 */
export type UploadData = Buffer | ReadableStream<Uint8Array>

/**
 * Parameters for uploading a file to storage.
 */
export interface UploadParams {
  /** Unique storage key (path/filename) for the file */
  key: string

  /** File content as Buffer or ReadableStream for streaming uploads */
  data: UploadData

  /** MIME type of the file (e.g., 'image/jpeg', 'application/pdf') */
  mimeType: string

  /** Optional content encoding (e.g., 'gzip', 'br') */
  contentEncoding?: string

  /** Optional cache control header value (e.g., 'public, max-age=31536000') */
  cacheControl?: string

  /** Custom metadata key-value pairs to store with the file */
  metadata?: Record<string, string>

  /** Size of the data in bytes (required for streaming uploads) */
  size?: number
}

/**
 * Result of a successful file upload.
 */
export interface UploadResult {
  /** The storage key where the file was stored */
  key: string

  /** Public URL to access the file (if publicly accessible) */
  url: string

  /** Size of the uploaded file in bytes */
  size: number

  /** Entity tag for the file (hash/identifier for cache validation) */
  etag?: string

  /** Last modified timestamp (ISO 8601 string) */
  lastModified?: string

  /** Provider-specific additional information */
  providerData?: Record<string, unknown>
}

// ─── File Metadata Types ──────────────────────────────────────────────────────

/**
 * Metadata for a stored file.
 */
export interface FileMetadata {
  /** Storage key (path/filename) */
  key: string

  /** File size in bytes */
  size: number

  /** MIME type of the file */
  mimeType: string

  /** Content encoding if applicable */
  contentEncoding?: string

  /** Cache control header value */
  cacheControl?: string

  /** Entity tag (hash/identifier) */
  etag?: string

  /** Last modified timestamp (ISO 8601 string) */
  lastModified: string

  /** Custom metadata key-value pairs */
  metadata?: Record<string, string>
}

// ─── URL Options Types ────────────────────────────────────────────────────────

/**
 * Options for generating file URLs.
 */
export interface UrlOptions {
  /** Generate a signed URL with time-limited access */
  signed?: boolean

  /** URL expiration time in seconds (for signed URLs) */
  expiresIn?: number

  /** Response content disposition ('inline' or 'attachment') */
  contentDisposition?: 'inline' | 'attachment'

  /** Custom filename for download (used with attachment disposition) */
  downloadFilename?: string
}

// ─── Storage Provider Interface ───────────────────────────────────────────────

/**
 * Type identifier for storage providers.
 * Can be extended for additional providers.
 */
export type StorageProviderType = 'local' | 'r2' | 's3' | string

/**
 * Main interface for storage providers.
 * Implementations must support upload, delete, getUrl, exists, and getMetadata.
 * Streaming support is optional via the stream method.
 */
export interface StorageProvider {
  /** Human-readable name of the provider */
  readonly name: string

  /** Type identifier for the provider */
  readonly type: StorageProviderType

  /**
   * Upload a file to storage.
   *
   * @param params - Upload parameters including key, data, mimeType, and optional metadata
   * @returns Promise resolving to upload result with key, url, and size
   * @throws Error if upload fails
   */
  upload(params: UploadParams): Promise<UploadResult>

  /**
   * Delete a file from storage.
   * Silently succeeds if the file doesn't exist.
   *
   * @param key - Storage key of the file to delete
   * @throws Error if deletion fails (other than file not found)
   */
  delete(key: string): Promise<void>

  /**
   * Get the URL for accessing a file.
   * For public files, returns the public URL.
   * For private files, can generate signed URLs with expiration.
   *
   * @param key - Storage key of the file
   * @param options - Optional URL generation options (signed, expiry, etc.)
   * @returns Promise resolving to the file URL
   */
  getUrl(key: string, options?: UrlOptions): Promise<string>

  /**
   * Check if a file exists in storage.
   *
   * @param key - Storage key to check
   * @returns Promise resolving to true if file exists, false otherwise
   */
  exists(key: string): Promise<boolean>

  /**
   * Get metadata for a file.
   *
   * @param key - Storage key of the file
   * @returns Promise resolving to file metadata, or null if file doesn't exist
   */
  getMetadata(key: string): Promise<FileMetadata | null>

  /**
   * Stream file content for downloads.
   * Optional method - not all providers may support streaming.
   *
   * @param key - Storage key of the file
   * @returns Promise resolving to a ReadableStream of file content
   * @throws Error if file doesn't exist or streaming not supported
   */
  stream?(key: string): Promise<ReadableStream<Uint8Array>>
}

// ─── Configuration Types ──────────────────────────────────────────────────────

/**
 * Base configuration for storage providers.
 */
export interface StorageProviderConfig {
  /** Provider type identifier */
  type: StorageProviderType

  /** Whether this provider is the default for uploads */
  default?: boolean
}

/**
 * Configuration for local filesystem storage.
 * Suitable for development and single-server deployments.
 */
export interface LocalStorageConfig extends StorageProviderConfig {
  type: 'local'

  /** Base directory for file storage (relative to project root or absolute) */
  basePath: string

  /** Base URL path for serving files (e.g., '/uploads') */
  baseUrl: string

  /** Whether to create directories automatically */
  createDirectories?: boolean
}

/**
 * Configuration for Cloudflare R2 storage.
 * R2 is S3-compatible with zero egress fees.
 */
export interface R2StorageConfig extends StorageProviderConfig {
  type: 'r2'

  /** Cloudflare account ID */
  accountId: string

  /** R2 bucket name */
  bucket: string

  /** Access key ID (or use environment variable R2_ACCESS_KEY_ID) */
  accessKeyId?: string

  /** Secret access key (or use environment variable R2_SECRET_ACCESS_KEY) */
  secretAccessKey?: string

  /** Custom domain for public URLs (optional, uses R2 public URL if not set) */
  customDomain?: string

  /** Region (default: 'auto') */
  region?: string

  /** Whether the bucket is public */
  public?: boolean
}

/**
 * Configuration for generic S3-compatible storage.
 * Works with AWS S3, MinIO, DigitalOcean Spaces, etc.
 */
export interface S3StorageConfig extends StorageProviderConfig {
  type: 's3'

  /** S3 bucket name */
  bucket: string

  /** AWS region */
  region: string

  /** Access key ID (or use environment variable AWS_ACCESS_KEY_ID) */
  accessKeyId?: string

  /** Secret access key (or use environment variable AWS_SECRET_ACCESS_KEY) */
  secretAccessKey?: string

  /** Custom endpoint for S3-compatible services */
  endpoint?: string

  /** Custom domain for public URLs */
  customDomain?: string

  /** Whether to force path-style URLs (required for MinIO) */
  forcePathStyle?: boolean

  /** Whether the bucket is public */
  public?: boolean
}

/**
 * Union type for all supported storage provider configurations.
 */
export type AnyStorageConfig = LocalStorageConfig | R2StorageConfig | S3StorageConfig

/**
 * Main storage configuration.
 * Supports multiple named providers with one default.
 */
export interface StorageConfig {
  /** Map of provider names to their configurations */
  providers: Record<string, AnyStorageConfig>

  /** Name of the default provider (must exist in providers map) */
  defaultProvider?: string

  /** Global upload settings */
  defaults?: {
    /** Default cache control header value */
    cacheControl?: string

    /** Default content encoding */
    contentEncoding?: string
  }
}

// ─── Utility Types ────────────────────────────────────────────────────────────

/**
 * Result of checking storage health/connectivity.
 */
export interface StorageHealthCheck {
  /** Whether the storage is healthy and accessible */
  healthy: boolean

  /** Timestamp of the health check */
  timestamp: string

  /** Error message if unhealthy */
  error?: string

  /** Provider-specific diagnostic information */
  details?: Record<string, unknown>
}

/**
 * Events emitted by storage providers.
 */
export type StorageEvent =
  | { type: 'upload'; key: string; size: number }
  | { type: 'delete'; key: string }
  | { type: 'error'; key?: string; error: Error }

/**
 * Callback type for storage event listeners.
 */
export type StorageEventListener = (event: StorageEvent) => void
