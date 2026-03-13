import { getDb, getSchema } from '../../../utils/publisher/database'
import { removePageType, getPageType } from '../../../utils/publisher/pageTypeRegistry'
import { eq, count } from 'drizzle-orm'

/**
 * DELETE /api/publisher/page-types/:name — Soft-disable a page type
 * Checks if any pages use this page type before disabling
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
      data: { error: { message: 'Missing page type name', code: 'MISSING_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherPageTypeDefs, publisherPages } = await getSchema()

  // Find record by name
  const [existing] = await db
    .select()
    .from(publisherPageTypeDefs)
    .where(eq(publisherPageTypeDefs.name, name))
    .limit(1)

  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: { message: `Page type '${name}' not found`, code: 'NOT_FOUND' } },
    })
  }

  // Don't allow disabling system types
  if (existing.isSystem) {
    throw createError({
      statusCode: 403,
      data: {
        error: {
          message: `Cannot disable system page type '${name}'`,
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
          message: `Page type '${name}' is already disabled`,
          code: 'ALREADY_DISABLED',
        },
      },
    })
  }

  // Check if any pages use this page type
  const [pageCountResult] = await db
    .select({ count: count() })
    .from(publisherPages)
    .where(eq(publisherPages.pageType, name))

  const pageCount = pageCountResult?.count ?? 0

  if (pageCount > 0) {
    throw createError({
      statusCode: 409,
      data: {
        error: {
          message: `Cannot disable page type '${name}' because ${pageCount} page(s) use it`,
          code: 'PAGE_TYPE_IN_USE',
          pageCount,
        },
      },
    })
  }

  // Set active: false
  await db
    .update(publisherPageTypeDefs)
    .set({
      active: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(publisherPageTypeDefs.id, existing.id))

  // Remove from in-memory registry
  removePageType(name)

  return {
    data: {
      name: existing.name,
      active: false,
      message: `Page type '${name}' has been disabled.`,
    },
  }
})
