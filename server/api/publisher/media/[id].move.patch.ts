import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { getStorageProvider, hasProvider, getDefaultProviderName } from '../../../utils/publisher/storage/registry'
import { checkFolderPermission } from '../../../utils/publisher/folderPermissions'

/**
 * Parse folder field to extract storage info (FALLBACK for old records).
 * The folder field format is: "folderId:storageProvider:storageKey"
 * Returns null for legacy records without storage info.
 */
function parseStorageInfo(folderField: string | null): { folderId: number | null; storageProvider: string; storageKey: string } | null {
  if (!folderField) return null

  // Check if it's the new format: "folderId:storageProvider:storageKey"
  if (folderField.includes(':')) {
    const parts = folderField.split(':')
    if (parts.length >= 3) {
      const folderId = parseInt(parts[0]!, 10)
      return {
        folderId: isNaN(folderId) || folderId === 0 ? null : folderId,
        storageProvider: parts[1]!,
        storageKey: parts[2]!,
      }
    }
  }

  return null
}

/**
 * Get storage info from a media row, using proper columns first,
 * falling back to parsing the deprecated folder field for old records.
 */
function getStorageInfo(row: any): { folderId: number | null; storageProvider: string | null; storageKey: string | null } {
  // Prefer proper columns if they exist
  if (row.storageKey) {
    return {
      folderId: row.folderId ?? null,
      storageProvider: row.storageProvider ?? null,
      storageKey: row.storageKey,
    }
  }
  // Fallback to parsing the deprecated folder field for old records
  const parsed = parseStorageInfo(row.folder)
  if (parsed) {
    return parsed
  }
  return { folderId: null, storageProvider: null, storageKey: null }
}

/**
 * Generate a storage key for a file based on folder.
 * Format: folders/{folderId}/{filename} or root/{filename}
 */
function generateStorageKey(folderId: number | null, filename: string): string {
  if (folderId) {
    return `folders/${folderId}/${filename}`
  }
  return `root/${filename}`
}

/**
 * Build deprecated folder field value for backward compatibility.
 * Format: "folderId:storageProvider:storageKey"
 */
function buildFolderField(folderId: number | null, storageProvider: string, storageKey: string): string {
  return `${folderId || 0}:${storageProvider}:${storageKey}`
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing media id', code: 'MISSING_PARAM' } },
    })
  }

  // Parse request body
  const body = await readBody(event)

  if (body === null || body === undefined) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Request body is required', code: 'MISSING_BODY' } },
    })
  }

  // Parse target folderId (null means root → folder_id = 1)
  let targetFolderId: number | null = null
  if (body.folderId !== null && body.folderId !== undefined) {
    const parsed = parseInt(body.folderId, 10)
    if (isNaN(parsed) || parsed < 0) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'folderId must be a positive number or null', code: 'INVALID_FOLDER_ID' } },
      })
    }
    targetFolderId = parsed === 0 ? null : parsed
  }

  // Check write permission on target folder
  const user = event.context.publisherUser
  const effectiveTargetFolderId = targetFolderId ?? 1
  const hasPermission = await checkFolderPermission(effectiveTargetFolderId, user.role, 'write')
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'You do not have permission to move files to this folder', code: 'FORBIDDEN' } },
    })
  }

  const db = await getDb()
  const { publisherMedia } = await getSchema()

  // Fetch the media item
  const [media] = await db
    .select()
    .from(publisherMedia)
    .where(eq(publisherMedia.id, Number(id)))
    .limit(1)

  if (!media) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Media not found', code: 'NOT_FOUND' } },
    })
  }

  const storageInfo = getStorageInfo(media)
  const currentFolderId = storageInfo.folderId

  // Check if already in the target folder
  if (currentFolderId === targetFolderId) {
    // No change needed, return current item with folderId
    return {
      data: {
        ...media,
        folderId: currentFolderId,
      },
    }
  }

  // Generate new storage key
  const newStorageKey = generateStorageKey(targetFolderId, media.name)
  const storageProvider = storageInfo.storageProvider ?? getDefaultProviderName()

  // For root folder (targetFolderId=null), store folder_id = 1
  const effectiveFolderId = targetFolderId ?? 1

  // Try to move file in storage if we have storage info
  let movedInStorage = false
  if (storageInfo.storageKey) {
    try {
      if (hasProvider(storageProvider)) {
        const provider = getStorageProvider(storageProvider)

        // Check if file exists in current location
        const exists = await provider.exists(storageInfo.storageKey)

        if (exists) {
          // Get metadata to preserve content type
          const metadata = await provider.getMetadata(storageInfo.storageKey)

          // Download, re-upload to new location, delete old
          // Note: For R2/S3, a copy+delete would be more efficient
          // but we'll use download/upload for provider-agnostic approach
          if (provider.stream) {
            const stream = await provider.stream(storageInfo.storageKey)
            const chunks: Uint8Array[] = []
            const reader = stream.getReader()

            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              if (value) chunks.push(value)
            }

            const data = Buffer.concat(chunks)

            // Upload to new location
            await provider.upload({
              key: newStorageKey,
              data,
              mimeType: metadata?.mimeType ?? media.mimeType,
              size: data.length,
            })

            // Delete from old location
            await provider.delete(storageInfo.storageKey)
            movedInStorage = true
          }
        }
      }
    }
    catch (storageError) {
      console.warn('Failed to move file in storage:', storageError)
      // Continue with database update even if storage move fails
    }
  }

  // Build deprecated folder field for backward compatibility
  const newFolderField = buildFolderField(targetFolderId, storageProvider, newStorageKey)

  // Update database with new folder info - write to proper columns
  const [updatedMedia] = await db
    .update(publisherMedia)
    .set({
      folderId: effectiveFolderId,
      storageProvider,
      storageKey: newStorageKey,
      folder: newFolderField, // Keep for backward compatibility
    })
    .where(eq(publisherMedia.id, Number(id)))
    .returning()

  return {
    data: {
      ...updatedMedia,
      folderId: targetFolderId,
      moved: movedInStorage,
    },
  }
})
