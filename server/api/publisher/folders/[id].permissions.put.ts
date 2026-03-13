import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { setFolderPermission, type FolderPermissionLevel } from '../../../utils/publisher/folderPermissions'

const setPermissionSchema = z.object({
  roleId: z.string().min(1, 'roleId is required'),
  permission: z.enum(['read', 'write', 'admin'], {
    message: 'Permission must be one of: read, write, admin',
  }),
})

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

  // Only super-admin and admin can set permissions
  if (user.role !== 'super-admin' && user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Only administrators can manage folder permissions', code: 'FORBIDDEN' } },
    })
  }

  const body = await readBody(event)
  const parsed = setPermissionSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues } },
    })
  }

  const { roleId, permission } = parsed.data

  // Validate role ID
  if (!VALID_ROLES.includes(roleId)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`, code: 'INVALID_ROLE' } },
    })
  }

  // Prevent setting permissions for super-admin (they always have full access)
  if (roleId === 'super-admin') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Cannot set permissions for super-admin role', code: 'FORBIDDEN_ROLE' } },
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

  // Set the permission
  const result = await setFolderPermission(folderId, roleId, permission as FolderPermissionLevel)

  return {
    data: {
      ...result,
      folder: {
        id: folder.id,
        name: folder.name,
      },
    },
  }
})
