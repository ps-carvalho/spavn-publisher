import { getDb, getSchema } from '../../../utils/publisher/database'
import { count, isNull, eq, sql } from 'drizzle-orm'

interface FolderWithChildren {
  id: number
  name: string
  slug: string
  parentId: number | null
  path: string
  createdAt: string
  updatedAt: string
  children?: FolderWithChildren[]
  mediaCount?: number
}

/**
 * Build a hierarchical tree structure from a flat list of folders.
 */
function buildFolderTree(folders: FolderWithChildren[]): FolderWithChildren[] {
  const folderMap = new Map<number, FolderWithChildren>()
  const rootFolders: FolderWithChildren[] = []

  // First pass: create map and initialize children arrays
  for (const folder of folders) {
    folderMap.set(folder.id, { ...folder, children: [] })
  }

  // Second pass: build tree structure
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!
    if (folder.parentId === null) {
      rootFolders.push(node)
    }
    else {
      const parent = folderMap.get(folder.parentId)
      if (parent) {
        parent.children!.push(node)
      }
    }
  }

  // Sort children by name
  const sortChildren = (nodes: FolderWithChildren[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        sortChildren(node.children)
      }
    }
  }

  sortChildren(rootFolders)

  return rootFolders
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const db = await getDb()
  const { publisherFolders, publisherMedia } = await getSchema()

  const treeMode = query.tree === 'true' || query.tree === '1'
  const includeMediaCount = query.includeMediaCount === 'true' || query.includeMediaCount === '1'

  // Fetch all folders
  const folders = await db
    .select()
    .from(publisherFolders)
    .orderBy(publisherFolders.name)

  // Fetch media counts per folder if requested
  const mediaCounts: Map<string, number> = new Map()

  if (includeMediaCount) {
    // Group media by folder path and count
    const counts = await db
      .select({
        path: publisherMedia.folder,
        count: count(),
      })
      .from(publisherMedia)
      .where(sql`${publisherMedia.folder} IS NOT NULL`)
      .groupBy(publisherMedia.folder)

    // Also get count for root (null folder)
    const [rootCount] = await db
      .select({ count: count() })
      .from(publisherMedia)
      .where(isNull(publisherMedia.folder))

    // Map folder paths to counts
    for (const row of counts) {
      if (row.path) {
        mediaCounts.set(row.path, row.count)
      }
    }

    // Map root folder (path = null) count - use empty string as key
    if (rootCount) {
      mediaCounts.set('', rootCount.count) // Use empty string for root
    }
  }

  // Transform folders with media counts
  const foldersWithCounts: FolderWithChildren[] = folders.map((folder) => ({
    ...folder,
    mediaCount: includeMediaCount ? (mediaCounts.get(folder.path) || 0) : undefined,
  }))

  if (treeMode) {
    const tree = buildFolderTree(foldersWithCounts)
    return { data: tree }
  }

  return { data: foldersWithCounts }
})
