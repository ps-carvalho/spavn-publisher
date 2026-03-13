import { z } from 'zod'
import { eq, and, isNull } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { generateSlug, buildFolderPath } from '../../../utils/publisher/folders'
import { checkFolderPermission } from '../../../utils/publisher/folderPermissions'

const createFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less'),
  parentId: z.number().int().positive().optional().nullable(),
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createFolderSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues } },
    })
  }

  const { name, parentId } = parsed.data
  const db = await getDb()
  const { publisherFolders } = await getSchema()
  const user = event.context.publisherUser

  // Security validations for folder name (from main's security review)
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Folder name cannot contain path separators or traversal sequences', code: 'INVALID_NAME' } },
    })
  }

  // Only allow alphanumeric, spaces, underscores, and hyphens
  if (!/^[\w\s-]+$/u.test(name)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Folder name can only contain letters, numbers, spaces, underscores, and hyphens', code: 'INVALID_NAME' } },
    })
  }

  // Validate folder name length
  if (name.length > 100) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Folder name too long (max 100 characters)', code: 'INVALID_NAME' } },
    })
  }

  // Validate parent exists if parentId provided
  if (parentId) {
    const [parent] = await db
      .select()
      .from(publisherFolders)
      .where(eq(publisherFolders.id, parentId))
      .limit(1)

    if (!parent) {
      throw createError({
        statusCode: 404,
        data: { error: { message: 'Parent folder not found', code: 'PARENT_NOT_FOUND' } },
      })
    }

    // Check write permission on parent folder
    const hasPermission = await checkFolderPermission(parentId, user.role, 'write')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        data: { error: { message: 'You do not have permission to create folders in this location', code: 'FORBIDDEN' } },
      })
    }
  }
  else {
    // Creating in root folder (id=1) - check write permission on root
    const hasPermission = await checkFolderPermission(1, user.role, 'write')
    if (!hasPermission) {
      throw createError({
        statusCode: 403,
        data: { error: { message: 'You do not have permission to create folders in the root folder', code: 'FORBIDDEN' } },
      })
    }
  }

  // Generate slug from name
  const slug = generateSlug(name)

  if (!slug) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Folder name must contain alphanumeric characters', code: 'INVALID_NAME' } },
    })
  }

  // Check for duplicate folder name in same parent
  const [existing] = await db
    .select()
    .from(publisherFolders)
    .where(
      and(
        eq(publisherFolders.slug, slug),
        parentId ? eq(publisherFolders.parentId, parentId) : isNull(publisherFolders.parentId)
      )
    )
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      data: { error: { message: 'A folder with this name already exists in this location', code: 'DUPLICATE_NAME' } },
    })
  }

  // Build full path
  const path = await buildFolderPath(db, parentId ?? null, slug)

  // Create folder
  const [folder] = await db
    .insert(publisherFolders)
    .values({
      name,
      slug,
      parentId: parentId || null,
      path,
    })
    .returning()

  setResponseStatus(event, 201)

  return { data: folder }
})
