import { getDb, getSchema } from '../../../../utils/publisher/database'
import { eq, desc, like } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const db = await getDb()
  const { publisherFolders, publisherMedia } = await getSchema()
  const folderId = getRouterParam(event, 'id')
  const query = getQuery(event)
  const limit = Math.min(50, Math.max(1, parseInt(query.limit as string) || 50))

  if (!folderId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Folder ID is required',
    })
  }

  // Validate folder ID is a valid number
  const folderIdNum = parseInt(folderId)
  if (isNaN(folderIdNum) || folderIdNum < 1) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid folder ID',
    })
  }

  // Get folder to find its path
  const folder = await db
    .select()
    .from(publisherFolders)
    .where(eq(publisherFolders.id, folderIdNum))
    .get()

  if (!folder) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Folder not found',
    })
  }

  // Get media in this folder by matching the folder path
  const items = await db
    .select()
    .from(publisherMedia)
    .where(eq(publisherMedia.folder, folder.path))
    .orderBy(desc(publisherMedia.createdAt))
    .limit(limit)

  return {
    data: items,
    meta: {
      folder: {
        id: folder.id,
        name: folder.name,
        path: folder.path,
      },
    },
  }
})
