import { eq, count, isNull } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { getDescendantFolderIds, updateDescendantPaths } from '../../../utils/publisher/folders'
import { checkFolderPermission } from '../../../utils/publisher/folderPermissions'

type DeleteMode = 'reject' | 'recursive' | 'move'

/**
 * Delete a folder and all its descendants.
 */
async function deleteRecursive(db: Awaited<ReturnType<typeof getDb>>, folderId: number): Promise<number> {
  const descendantIds = await getDescendantFolderIds(db, folderId)

  // Delete descendants first (from deepest to shallowest)
  // Since we need to delete children before parents, we'll delete in reverse order of insertion
  // Actually, for simplicity, delete all descendants by their IDs (order doesn't matter for leaf nodes)
  // But we need to delete from bottom up to maintain referential integrity

  // Sort descendants by path length (deepest first) to ensure proper deletion order
  const descendants = await db
    .select({ id: publisherFolders.id, path: publisherFolders.path })
    .from(publisherFolders)
    .where(eq(publisherFolders.parentId, folderId))

  // Recursively delete children first
  for (const child of descendants) {
    await deleteRecursive(db, child.id)
  }

  // Now delete this folder
  await db.delete(publisherFolders).where(eq(publisherFolders.id, folderId))

  return descendantIds.length + 1 // +1 for the folder itself
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing folder id', code: 'MISSING_PARAM' } },
    })
  }

  const query = getQuery(event)
  const mode: DeleteMode = (query.mode as DeleteMode) || 'reject'

  if (!['reject', 'recursive', 'move'].includes(mode)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid mode. Must be "reject", "recursive", or "move"', code: 'INVALID_MODE' } },
    })
  }

  const db = await getDb()
  const { publisherFolders, publisherMedia } = await getSchema()
  const folderId = Number(id)
  const user = event.context.publisherUser

  // Check admin permission
  const hasPermission = await checkFolderPermission(folderId, user.role, 'admin')
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'You do not have permission to delete this folder', code: 'FORBIDDEN' } },
    })
  }

  // Check if folder exists
  const [existing] = await db
    .select()
    .from(publisherFolders)
    .where(eq(publisherFolders.id, folderId))
    .limit(1)

  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Folder not found', code: 'NOT_FOUND' } },
    })
  }

  // Count children
  const [childrenCountResult] = await db
    .select({ count: count() })
    .from(publisherFolders)
    .where(eq(publisherFolders.parentId, folderId))

  const childrenCount = childrenCountResult?.count || 0

  // Count media files in this folder
  const [mediaCountResult] = await db
    .select({ count: count() })
    .from(publisherMedia)
    .where(eq(publisherMedia.folder, existing.path))

  const mediaCount = mediaCountResult?.count || 0

  // Handle default mode: reject if folder has children or media
  if (mode === 'reject') {
    if (childrenCount > 0) {
      throw createError({
        statusCode: 400,
        data: {
          error: {
            message: 'Cannot delete folder with subfolders. Use ?mode=recursive to delete all children or ?mode=move to move children to parent.',
            code: 'FOLDER_HAS_CHILDREN',
            childrenCount,
          },
        },
      })
    }

    if (mediaCount > 0) {
      throw createError({
        statusCode: 400,
        data: {
          error: {
            message: 'Cannot delete folder with media files. Move or delete the files first.',
            code: 'FOLDER_HAS_MEDIA',
            mediaCount,
          },
        },
      })
    }
  }

  // Handle recursive mode: delete all children and their media
  if (mode === 'recursive') {
    // Get all descendant paths to update media
    const descendantPaths: string[] = [existing.path]

    const collectDescendantPaths = async (parentId: number) => {
      const children = await db
        .select({ id: publisherFolders.id, path: publisherFolders.path })
        .from(publisherFolders)
        .where(eq(publisherFolders.parentId, parentId))

      for (const child of children) {
        descendantPaths.push(child.path)
        await collectDescendantPaths(child.id)
      }
    }

    await collectDescendantPaths(folderId)

    // Move all media in descendant folders to root (null)
    for (const path of descendantPaths) {
      await db
        .update(publisherMedia)
        .set({ folder: null })
        .where(eq(publisherMedia.folder, path))
    }

    // Delete folder and all descendants
    await deleteRecursive(db, folderId)

    setResponseStatus(event, 204)
    return
  }

  // Handle move mode: move children to parent before deleting
  if (mode === 'move') {
    const newParentId = existing.parentId

    // Move all subfolders to parent
    await db
      .update(publisherFolders)
      .set({
        parentId: newParentId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(publisherFolders.parentId, folderId))

    // Update paths of moved children
    const movedChildren = await db
      .select()
      .from(publisherFolders)
      .where(newParentId === null ? isNull(publisherFolders.parentId) : eq(publisherFolders.parentId, newParentId))

    for (const child of movedChildren) {
      // Only update paths that were previously under this folder
      if (child.path.startsWith(existing.path + '/')) {
        const newParentPath = newParentId
          ? (await db.select().from(publisherFolders).where(eq(publisherFolders.id, newParentId)).limit(1))[0]?.path || ''
          : ''

        const newPath = newParentPath ? `${newParentPath}/${child.slug}` : `/${child.slug}`

        await db
          .update(publisherFolders)
          .set({ path: newPath, updatedAt: new Date().toISOString() })
          .where(eq(publisherFolders.id, child.id))

        // Update descendant paths
        await updateDescendantPaths(db, child.id, child.path, newPath)
      }
    }

    // Move media to parent folder (or root)
    await db
      .update(publisherMedia)
      .set({ folder: existing.parentId ? (await db.select().from(publisherFolders).where(eq(publisherFolders.id, existing.parentId)).limit(1))[0]?.path || null : null })
      .where(eq(publisherMedia.folder, existing.path))

    // Delete the folder
    await db.delete(publisherFolders).where(eq(publisherFolders.id, folderId))

    setResponseStatus(event, 204)
    return
  }

  // Default delete (should not reach here if mode is 'reject' and checks passed)
  await db.delete(publisherFolders).where(eq(publisherFolders.id, folderId))

  setResponseStatus(event, 204)
})
