import { z } from 'zod'
import { eq, and, isNull, not } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { generateSlug, buildFolderPath, getDescendantFolderIds, updateDescendantPaths, escapeLikePattern } from '../../../utils/publisher/folders'
import { checkFolderPermission } from '../../../utils/publisher/folderPermissions'

const updateFolderSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name must be 255 characters or less').optional(),
  parentId: z.number().int().positive().nullable().optional(),
})

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const user = event.context.publisherUser

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing folder id', code: 'MISSING_PARAM' } },
    })
  }

  const body = await readBody(event)
  const parsed = updateFolderSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues } },
    })
  }

  const { name, parentId } = parsed.data
  const db = await getDb()
  const { publisherFolders } = await getSchema()
  const folderId = Number(id)

  // Check admin permission
  const hasPermission = await checkFolderPermission(folderId, user.role, 'admin')
  if (!hasPermission) {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'You do not have permission to modify this folder', code: 'FORBIDDEN' } },
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

  // If no changes requested, return existing folder
  if (name === undefined && parentId === undefined) {
    return { data: existing }
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  }

  let newSlug = existing.slug
  let newPath = existing.path

  // Handle name change
  if (name !== undefined && name !== existing.name) {
    newSlug = generateSlug(name)

    if (!newSlug) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Folder name must contain alphanumeric characters', code: 'INVALID_NAME' } },
      })
    }

    // Check for duplicate slug in same parent
    const effectiveParentId = parentId !== undefined ? parentId : existing.parentId
    const [duplicate] = await db
      .select()
      .from(publisherFolders)
      .where(
        and(
          eq(publisherFolders.slug, newSlug),
          effectiveParentId
            ? eq(publisherFolders.parentId, effectiveParentId)
            : isNull(publisherFolders.parentId),
          not(eq(publisherFolders.id, folderId))
        )
      )
      .limit(1)

    if (duplicate) {
      throw createError({
        statusCode: 409,
        data: { error: { message: 'A folder with this name already exists in this location', code: 'DUPLICATE_NAME' } },
      })
    }

    updateData.name = name
    updateData.slug = newSlug
  }

  // Handle parent change
  if (parentId !== undefined && parentId !== existing.parentId) {
    // Check for circular reference (moving to self or descendant)
    if (parentId === folderId) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Cannot move folder to itself', code: 'CIRCULAR_REFERENCE' } },
      })
    }

    if (parentId !== null) {
      // Check if new parent exists
      const [newParent] = await db
        .select()
        .from(publisherFolders)
        .where(eq(publisherFolders.id, parentId))
        .limit(1)

      if (!newParent) {
        throw createError({
          statusCode: 404,
          data: { error: { message: 'Parent folder not found', code: 'PARENT_NOT_FOUND' } },
        })
      }

      // Check if new parent is a descendant of current folder
      const descendants = await getDescendantFolderIds(db, folderId)
      if (descendants.includes(parentId)) {
        throw createError({
          statusCode: 400,
          data: { error: { message: 'Cannot move folder to its own descendant', code: 'CIRCULAR_REFERENCE' } },
        })
      }
    }

    updateData.parentId = parentId
  }

  // Recalculate path if slug or parent changed
  const effectiveParentId = parentId !== undefined ? parentId : existing.parentId
  const effectiveSlug = newSlug

  const oldPath = existing.path
  newPath = await buildFolderPath(db, effectiveParentId, effectiveSlug)
  updateData.path = newPath

  // Check for duplicate path (should be handled by unique constraint, but check explicitly)
  if (newPath !== existing.path) {
    const [duplicatePath] = await db
      .select()
      .from(publisherFolders)
      .where(
        and(
          eq(publisherFolders.path, newPath),
          not(eq(publisherFolders.id, folderId))
        )
      )
      .limit(1)

    if (duplicatePath) {
      throw createError({
        statusCode: 409,
        data: { error: { message: 'A folder with this path already exists', code: 'DUPLICATE_PATH' } },
      })
    }
  }

  // Update the folder
  await db
    .update(publisherFolders)
    .set(updateData)
    .where(eq(publisherFolders.id, folderId))

  // Update descendant paths if path changed
  if (oldPath !== newPath) {
    await updateDescendantPaths(db, folderId, oldPath, newPath)
  }

  // Fetch and return updated folder
  const [updated] = await db
    .select()
    .from(publisherFolders)
    .where(eq(publisherFolders.id, folderId))
    .limit(1)

  return { data: updated }
})
