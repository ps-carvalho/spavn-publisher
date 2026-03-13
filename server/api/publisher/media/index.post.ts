import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, extname } from 'path'
import { randomBytes } from 'crypto'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { getDefaultProvider, getDefaultProviderName } from '../../../utils/publisher/storage/registry'
import { processImage, shouldProcessImage, getSizeNameFromKey } from '../../../utils/publisher/imageProcessor'
import { checkFolderPermission } from '../../../utils/publisher/folderPermissions'
import type { UploadParams } from '../../../utils/publisher/storage/types'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// MIME type allowlist — matches publisher.config.ts uploads.allowedMimeTypes
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'video/mp4',
  'audio/mpeg',
])

/**
 * Generate a storage key for a file based on folder.
 * Format: folders/{folderId}/{uniqueFilename} or root/{uniqueFilename}
 */
function generateStorageKey(folderId: number | null, uniqueName: string): string {
  if (folderId) {
    return `folders/${folderId}/${uniqueName}`
  }
  return `root/${uniqueName}`
}

export default defineEventHandler(async (event) => {
  const files = await readMultipartFormData(event)

  if (!files || files.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No file uploaded', code: 'NO_FILE' } },
    })
  }

  const file = files[0]!

  // Validate file size
  if (file.data.length > MAX_FILE_SIZE) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'File too large. Maximum size is 10MB.', code: 'FILE_TOO_LARGE' } },
    })
  }

  // Validate MIME type
  const mimeType = file.type || 'application/octet-stream'
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: `File type "${mimeType}" is not allowed. Allowed types: ${Array.from(ALLOWED_MIME_TYPES).join(', ')}`, code: 'INVALID_MIME_TYPE' } },
    })
  }
  const originalName = file.filename || 'upload'
  const ext = extname(originalName) || '.bin'
  const uniqueName = `${randomBytes(16).toString('hex')}${ext}`

  // Extract folderId from form data (optional)
  let folderId: number | null = null
  const folderField = files.find(f => f.name === 'folderId')
  if (folderField && folderField.data) {
    const folderIdStr = folderField.data.toString('utf-8')
    const parsed = parseInt(folderIdStr, 10)
    if (!isNaN(parsed) && parsed > 0) {
      folderId = parsed
    }
  }

  // Check write permission on target folder
  const user = event.context.publisherUser
  const targetFolderId = folderId ?? 1 // Default to root folder (id=1)
  const hasPermission = await checkFolderPermission(targetFolderId, user.role, 'write')
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'You do not have permission to upload files to this folder', code: 'FORBIDDEN' } },
    })
  }

  // Generate storage key
  const storageKey = generateStorageKey(folderId, uniqueName)

  // Detect image dimensions (basic approach without sharp)
  let width: number | null = null
  let height: number | null = null

  if (mimeType.startsWith('image/')) {
    // Try to parse dimensions from common image formats
    const dims = getImageDimensions(file.data, mimeType)
    if (dims) {
      width = dims.width
      height = dims.height
    }
  }

  let url: string
  const storageProviderName = getDefaultProviderName()

  // Try to upload using storage provider first
  try {
    const provider = getDefaultProvider()
    const uploadParams: UploadParams = {
      key: storageKey,
      data: file.data,
      mimeType,
      size: file.data.length,
    }

    const result = await provider.upload(uploadParams)
    url = result.url
  }
  catch (storageError) {
    // Fall back to local file storage if storage provider fails
    console.warn('Storage provider upload failed, falling back to local:', storageError)

    // Ensure upload directory exists
    const uploadDir = process.env.PUBLISHER_UPLOAD_DIR || join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Save file locally (async to avoid blocking the event loop)
    const filePath = join(uploadDir, uniqueName)
    await writeFile(filePath, file.data)

    url = `/uploads/${uniqueName}`
  }

  // Process image variants if it's a processable image
  let formats: Record<string, { url: string; width: number; height: number }> | null = null

  if (shouldProcessImage(mimeType)) {
    try {
      const result = await processImage(file.data, storageKey, mimeType)

      // Use Sharp dimensions (more accurate than manual parsing)
      if (result.width) width = result.width
      if (result.height) height = result.height

      // Upload all variants in parallel using Promise.allSettled
      const provider = getDefaultProvider()
      const variantFormats: Record<string, { url: string; width: number; height: number }> = {}

      const variantResults = await Promise.allSettled(
        result.variants.map(async (variant) => {
          const variantResult = await provider.upload({
            key: variant.key,
            data: variant.data,
            mimeType: variant.mimeType,
            size: variant.size,
          })
          return {
            key: variant.key,
            url: variantResult.url,
            width: variant.width,
            height: variant.height,
          }
        }),
      )

      // Collect successful results
      for (const uploadResult of variantResults) {
        if (uploadResult.status === 'fulfilled') {
          const { key, url, width, height } = uploadResult.value
          const sizeName = getSizeNameFromKey(key)
          if (sizeName) {
            variantFormats[sizeName] = { url, width, height }
          }
        } else {
          console.warn('Failed to upload variant:', uploadResult.reason)
        }
      }

      if (Object.keys(variantFormats).length > 0) {
        formats = variantFormats
      }
    } catch (processingError) {
      console.warn('Image processing failed, continuing without variants:', processingError)
      // Non-fatal — original upload still succeeds
    }
  }

  // Store in database
  // Write to proper columns (folderId, storageProvider, storageKey, publicUrl)
  // Also write to deprecated 'folder' field for backward compatibility
  const db = await getDb()
  const { publisherMedia } = await getSchema()

  // For root folder (folderId=null), store folder_id = 1 (the root folder ID)
  const effectiveFolderId = folderId ?? 1

  const [media] = await db.insert(publisherMedia).values({
    name: uniqueName,
    originalName,
    mimeType,
    size: file.data.length,
    width,
    height,
    url,
    alternativeText: null,
    // Write to proper columns
    folderId: effectiveFolderId,
    storageProvider: storageProviderName,
    storageKey,
    publicUrl: url,
    // Image variants
    formats,
    // Deprecated: keep 'folder' field for backward compatibility
    folder: folderId
      ? `${folderId}:${storageProviderName}:${storageKey}`
      : `0:${storageProviderName}:${storageKey}`,
  }).returning()

  setResponseStatus(event, 201)

  return { data: media }
})

/**
 * Basic image dimension detection without external dependencies.
 * Used as fallback when Sharp processing is not available.
 */
function getImageDimensions(data: Buffer, mimeType: string): { width: number; height: number } | null {
  try {
    if (mimeType === 'image/png') {
      // PNG: width at bytes 16-19, height at bytes 20-23
      if (data.length >= 24) {
        return {
          width: data.readUInt32BE(16),
          height: data.readUInt32BE(20),
        }
      }
    }
    else if (mimeType === 'image/jpeg') {
      // JPEG: scan for SOF markers
      let offset = 2
      while (offset < data.length - 8) {
        if (data[offset] !== 0xFF) break
        const marker = data[offset + 1]!
        if (marker >= 0xC0 && marker <= 0xCF && marker !== 0xC4 && marker !== 0xC8 && marker !== 0xCC) {
          return {
            height: data.readUInt16BE(offset + 5),
            width: data.readUInt16BE(offset + 7),
          }
        }
        const segLen = data.readUInt16BE(offset + 2)
        offset += 2 + segLen
      }
    }
    else if (mimeType === 'image/gif') {
      // GIF: width at bytes 6-7, height at bytes 8-9
      if (data.length >= 10) {
        return {
          width: data.readUInt16LE(6),
          height: data.readUInt16LE(8),
        }
      }
    }
    else if (mimeType === 'image/webp') {
      // WebP: VP8 header at offset 12
      if (data.length >= 30 && data.toString('ascii', 0, 4) === 'RIFF') {
        const format = data.toString('ascii', 12, 16)
        if (format === 'VP8 ' && data.length >= 30) {
          return {
            width: data.readUInt16LE(26) & 0x3FFF,
            height: data.readUInt16LE(28) & 0x3FFF,
          }
        }
      }
    }
  }
  catch {
    // Ignore dimension parsing errors
  }
  return null
}
