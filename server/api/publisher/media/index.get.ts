import { getDb, getSchema } from '../../../utils/publisher/database'
import { desc, like, count, eq, or, and, isNull } from 'drizzle-orm'
import { getDefaultProviderName, getProviderNames } from '../../../utils/publisher/storage/registry'

/**
 * Parsed storage info from the folder field.
 */
interface StorageInfo {
  folderId: number | null
  storageProvider: string | null
  storageKey: string | null
}

/**
 * Parse folder field to extract folderId, storageProvider, and storageKey.
 * The folder field format is: "folderId:storageProvider:storageKey"
 * This is now a FALLBACK for old records where proper columns are NULL.
 */
function parseStorageInfo(folderField: string | null): StorageInfo {
  if (!folderField) {
    return { folderId: null, storageProvider: null, storageKey: null }
  }

  // Check if it's the new format: "folderId:storageProvider:storageKey"
  if (folderField.includes(':')) {
    const parts = folderField.split(':')
    const folderId = parseInt(parts[0]!, 10)
    return {
      folderId: isNaN(folderId) || folderId === 0 ? null : folderId,
      storageProvider: parts[1] || null,
      storageKey: parts[2] || null,
    }
  }

  // Legacy format: plain folder path - return null (no folder ID available)
  return { folderId: null, storageProvider: null, storageKey: null }
}

/**
 * Get storage info from a media row, using proper columns first,
 * falling back to parsing the deprecated folder field for old records.
 */
function getStorageInfo(row: any): StorageInfo {
  // Prefer proper columns if they exist
  if (row.storageKey) {
    return {
      folderId: row.folderId ?? null,
      storageProvider: row.storageProvider ?? null,
      storageKey: row.storageKey,
    }
  }
  // Fallback to parsing the deprecated folder field for old records
  return parseStorageInfo(row.folder)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = await getDb()
  const { publisherMedia, publisherFolders } = await getSchema()

  const page = Math.max(1, parseInt(query['pagination[page]'] as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query['pagination[pageSize]'] as string) || 25))
  const offset = (page - 1) * pageSize

  // Parse folderId filter
  // Support folderId=null, folderId=0 for root, or folderId=<number>
  let filterFolderId: number | null | undefined = undefined
  if (query.folderId !== undefined) {
    const folderIdValue = query.folderId as string
    if (folderIdValue === 'null' || folderIdValue === '0' || folderIdValue === '') {
      filterFolderId = null // Root folder
    }
    else {
      const parsed = parseInt(folderIdValue, 10)
      if (!isNaN(parsed) && parsed > 0) {
        filterFolderId = parsed
      }
    }
  }

  // Check if we should include folder info
  const includeFolder = query.includeFolder === 'true'

  // Build query conditions
  const conditions: any[] = []

  // MIME type filter
  if (query.mimeType) {
    const mimeFilter = (query.mimeType as string).replace('*', '%')
    conditions.push(like(publisherMedia.mimeType, mimeFilter))
  }

  // Add folderId filter at DB level (not in-memory!)
  // For root folder (filterFolderId=null): match folder_id = 1 (root) OR folder_id IS NULL (legacy unorganized)
  // For specific folder: match folder_id = filterFolderId
  if (filterFolderId !== undefined) {
    if (filterFolderId === null) {
      // Root folder: include items with folder_id = 1 (root) OR folder_id IS NULL (legacy)
      conditions.push(or(eq(publisherMedia.folderId, 1), isNull(publisherMedia.folderId))!)
    }
    else {
      conditions.push(eq(publisherMedia.folderId, filterFolderId))
    }
  }

  // Build where clause from conditions
  const whereClause = conditions.length > 0
    ? and(...conditions)
    : undefined

  // Count total with folder filter applied at DB level
  const [totalResult] = await db
    .select({ value: count() })
    .from(publisherMedia)
    .where(whereClause)

  const total = totalResult?.value || 0

  // Fetch items with pagination (DB-level filtering)
  const items = await db
    .select()
    .from(publisherMedia)
    .where(whereClause)
    .orderBy(desc(publisherMedia.createdAt))
    .limit(pageSize)
    .offset(offset)

  // Include folder info if requested
  let folderMap: Map<number, { id: number; name: string; path: string }> | null = null
  if (includeFolder) {
    // Collect all unique folder IDs
    const folderIds = new Set<number>()
    for (const item of items) {
      const { folderId: fid } = getStorageInfo(item)
      if (fid) {
        folderIds.add(fid)
      }
    }

    // Fetch folder details
    if (folderIds.size > 0) {
      folderMap = new Map()
      const folders = await db
        .select({
          id: publisherFolders.id,
          name: publisherFolders.name,
          path: publisherFolders.path,
        })
        .from(publisherFolders)
        .where(
          // Build OR condition for multiple folder IDs
          or(...Array.from(folderIds).map(id => eq(publisherFolders.id, id)))
        )

      for (const folder of folders) {
        folderMap.set(folder.id, folder)
      }
    }
  }

  // Transform items to include folder info and storage info
  const data = items.map((item) => {
    const { folderId: itemFolderId, storageProvider, storageKey } = getStorageInfo(item)

    if (includeFolder && itemFolderId && folderMap) {
      const folderInfo = folderMap.get(itemFolderId)
      return {
        ...item,
        folderId: itemFolderId,
        storageProvider,
        storageKey,
        folder: folderInfo || null,
      }
    }

    return {
      ...item,
      folderId: itemFolderId,
      storageProvider,
      storageKey,
    }
  })

  return {
    data,
    meta: {
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
      storage: {
        defaultProvider: getDefaultProviderName(),
        availableProviders: getProviderNames(),
      },
    },
  }
})
