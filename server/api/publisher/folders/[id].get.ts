import { eq, count } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { checkFolderPermission } from '../../../utils/publisher/folderPermissions'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = event.context.publisherUser

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing folder id', code: 'MISSING_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherFolders, publisherMedia } = await getSchema()
  const folderId = Number(id)

  // Check read permission
  const hasPermission = await checkFolderPermission(folderId, user.role, 'read')
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'You do not have permission to access this folder', code: 'FORBIDDEN' } },
    })
  }

  // Get folder
  const [folder] = await db
    .select()
    .from(publisherFolders)
    .where(eq(publisherFolders.id, folderId))
    .limit(1)

  if (!folder) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Folder not found', code: 'NOT_FOUND' } },
    })
  }

  // Get parent folder info if exists
  let parent = null
  if (folder.parentId) {
    const [parentFolder] = await db
      .select({
        id: publisherFolders.id,
        name: publisherFolders.name,
        slug: publisherFolders.slug,
        path: publisherFolders.path,
      })
      .from(publisherFolders)
      .where(eq(publisherFolders.id, folder.parentId))
      .limit(1)

    parent = parentFolder || null
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
    .where(eq(publisherMedia.folder, folder.path))

  const mediaCount = mediaCountResult?.count || 0

  return {
    data: {
      ...folder,
      parent,
      childrenCount,
      mediaCount,
    },
  }
})
