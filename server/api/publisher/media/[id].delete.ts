import { unlink, access } from 'fs/promises'
import { join } from 'path'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { getStorageProvider, hasProvider } from '../../../utils/publisher/storage/registry'
import { generateVariantKeys } from '../../../utils/publisher/imageProcessor'
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
 * Delete image variants from storage in parallel.
 * Derives variant keys from the original storage key using the naming convention.
 */
async function deleteVariants(
  storageKey: string,
  storageProvider: string,
): Promise<void> {
  if (!hasProvider(storageProvider)) {
    return
  }

  const provider = getStorageProvider(storageProvider)

  // Generate all possible variant keys
  // Use default image sizes since we need to clean up regardless of current config
  const defaultImageSizes = {
    thumbnail: 245,
    small: 500,
    medium: 750,
    large: 1000,
  }

  const variantKeys = generateVariantKeys(storageKey, defaultImageSizes)

  // Delete all variants in parallel
  await Promise.allSettled(
    variantKeys.map(async (variantKey) => {
      await provider.delete(variantKey)
    }),
  )
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing media id', code: 'MISSING_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherMedia } = await getSchema()

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

  // Check write permission on the folder containing this media
  const user = event.context.publisherUser
  if (user) {
    const folderId = media.folderId ?? 1
    const hasPermission = await checkFolderPermission(folderId, user.role, 'write')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        data: { error: { message: 'You do not have permission to delete files in this folder', code: 'FORBIDDEN' } },
      })
    }
  }

  // Try to delete from storage provider first
  const storageInfo = getStorageInfo(media)
  let deletedFromStorage = false

  if (storageInfo.storageKey && storageInfo.storageProvider) {
    try {
      // Check if the provider exists and get it
      if (hasProvider(storageInfo.storageProvider)) {
        const provider = getStorageProvider(storageInfo.storageProvider)
        await provider.delete(storageInfo.storageKey)
        deletedFromStorage = true
        
        // Also delete variants
        await deleteVariants(storageInfo.storageKey, storageInfo.storageProvider)
      }
    }
    catch (storageError) {
      console.warn('Failed to delete from storage provider:', storageError)
      // Fall through to local file deletion
    }
  }

  // Fall back to local file deletion if storage provider deletion failed
  // or if this is a legacy record
  if (!deletedFromStorage) {
    try {
      const filePath = join(process.cwd(), 'public', media.url)
      try {
        await access(filePath)
        await unlink(filePath)
      } catch {
        // File may not exist
      }

      // Also try to delete local variants in parallel
      if (storageInfo.storageKey) {
        const defaultImageSizes = {
          thumbnail: 245,
          small: 500,
          medium: 750,
          large: 1000,
        }
        const variantKeys = generateVariantKeys(storageInfo.storageKey, defaultImageSizes)

        // Delete all local variants in parallel
        await Promise.allSettled(
          variantKeys.map(async (variantKey) => {
            // Derive local file path from variant key
            // Key format: "root/filename.thumb.webp" or "folders/1/filename.thumb.webp"
            const variantPath = join(process.cwd(), 'public', 'uploads', variantKey.replace(/^(root|folders\/\d+)\/(.+)$/, '$2'))
            try {
              await access(variantPath)
              await unlink(variantPath)
            } catch {
              // Variant may not exist
            }
          }),
        )
      }
    } catch {
      // File may already be deleted
    }
  }

  // Delete from DB
  await db.delete(publisherMedia).where(eq(publisherMedia.id, Number(id)))

  return { ok: true }
})
