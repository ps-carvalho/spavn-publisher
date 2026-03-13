import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { getFolderPermissions, getEffectivePermission } from '../../../utils/publisher/folderPermissions'
import type { FolderPermissionLevel } from '../../../utils/publisher/folderPermissions'

// Define role order for consistent display
const ROLE_ORDER = ['super-admin', 'admin', 'editor', 'viewer']

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = event.context.publisherUser

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing folder id', code: 'MISSING_PARAM' } },
    })
  }

  // Only super-admin and admin can view/manage permissions
  if (user.role !== 'super-admin' && user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Only administrators can manage folder permissions', code: 'FORBIDDEN' } },
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

  // Get explicit permissions for this folder
  const permissions = await getFolderPermissions(folderId)

  // Build effective permissions for each role
  const effectivePermissions: Record<string, FolderPermissionLevel | null> = {}
  for (const role of ROLE_ORDER) {
    effectivePermissions[role] = await getEffectivePermission(folderId, role)
  }

  return {
    data: {
      folder: {
        id: folder.id,
        name: folder.name,
        path: folder.path,
      },
      permissions: permissions.sort((a, b) => 
        ROLE_ORDER.indexOf(a.roleId) - ROLE_ORDER.indexOf(b.roleId)
      ),
      effectivePermissions,
    },
  }
})
