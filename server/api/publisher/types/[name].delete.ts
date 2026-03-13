import { getDb, getSchema } from '../../../utils/publisher/database'
import { removeContentType, getContentType } from '../../../utils/publisher/registry'
import { eq } from 'drizzle-orm'

/**
 * DELETE /api/publisher/types/:name — Soft-disable a content type
 * Sets active: false, removes from registry, keeps table + data
 */
export default defineEventHandler(async (event) => {
  // Require admin auth
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const name = getRouterParam(event, 'name')
  if (!name) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing type name', code: 'MISSING_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherContentTypeDefs } = await getSchema()

  // Find record by name
  const [existing] = await db
    .select()
    .from(publisherContentTypeDefs)
    .where(eq(publisherContentTypeDefs.name, name))
    .limit(1)

  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: { message: `Content type '${name}' not found`, code: 'NOT_FOUND' } },
    })
  }

  // Don't allow disabling system types
  if (existing.isSystem) {
    throw createError({
      statusCode: 403,
      data: {
        error: {
          message: `Cannot disable system content type '${name}'`,
          code: 'SYSTEM_TYPE_PROTECTED',
        },
      },
    })
  }

  // Check if already inactive
  if (!existing.active) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: `Content type '${name}' is already disabled`,
          code: 'ALREADY_DISABLED',
        },
      },
    })
  }

  // Set active: false, updated_at: now
  await db
    .update(publisherContentTypeDefs)
    .set({
      active: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(publisherContentTypeDefs.id, existing.id))

  // Remove from in-memory registry (but keep in DB with data)
  removeContentType(name)

  return {
    data: {
      name: existing.name,
      active: false,
      entriesPreserved: true,
      message: `Content type '${name}' has been disabled. The table and all data have been preserved.`,
    },
  }
})
