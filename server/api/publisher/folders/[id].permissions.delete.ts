import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { removeFolderPermission } from '../../../utils/publisher/folderPermissions'

// Valid role IDs from publisher.config.ts
const VALID_ROLES = ['super-admin', 'admin', 'editor', 'viewer']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = event.context.publisherUser

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing folder id', code: 'MISSING_PARAM' } },
    })
  }

  // Only super-admin and admin can remove permissions
  if (user.role !== 'super-admin' && user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Only administrators can manage folder permissions', code: 'FORBIDDEN' } },
    })
  }

  const query = getQuery(event)
  const roleId = query.roleId as string

  if (!roleId) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing roleId query parameter', code: 'MISSING_PARAM' } },
    })
  }

  // Validate role ID
  if (!VALID_ROLES.includes(roleId)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, code: 'INVALID_ROLE' } },
    })
  }

  // Prevent removing permissions for super-admin (they always have full access)
  if (roleId === 'super-admin') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Cannot remove permissions for super-admin role', code: 'FORBIDDEN_ROLE' } },
    })
  }

  const db = await getDb()
  const { publisherFolders } = await getSchema()
  const folderId = Number(id)

  // Check if folder exists
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

  // Remove the permission
  await removeFolderPermission(folderId, roleId)

  setResponseStatus(event, 204)
})
