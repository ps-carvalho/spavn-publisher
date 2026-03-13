/**
 * Format bytes to human-readable size string
 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Check if MIME type is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

/**
 * Get human-readable label for storage provider
 */
export function getStorageProviderLabel(provider: string | null | undefined): string {
  if (!provider) return 'Unknown'
  switch (provider) {
    case 'local':
      return 'Local'
    case 'r2':
      return 'Cloudflare R2'
    case 's3':
      return 'Amazon S3'
    default:
      return provider
  }
}

/**
 * Check if storage provider is a cloud provider (not local)
 */
export function isCloudProvider(provider: string | null | undefined): boolean {
  return provider !== null && provider !== undefined && provider !== 'local'
}
