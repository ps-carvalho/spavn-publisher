import { getDb, getSchema } from '../../../utils/publisher/database'
import { removeBlockType, getBlockType } from '../../../utils/publisher/blockRegistry'
import { getAllPageTypes } from '../../../utils/publisher/pageTypeRegistry'
import { eq } from 'drizzle-orm'

/**
 * DELETE /api/publisher/block-types/:name — Soft-disable a block type
 * Checks for page type references before disabling
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
      data: { error: { message: 'Missing block type name', code: 'MISSING_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherBlockTypeDefs } = await getSchema()

  // Find record by name
  const [existing] = await db
    .select()
    .from(publisherBlockTypeDefs)
    .where(eq(publisherBlockTypeDefs.name, name))
    .limit(1)

  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: { message: `Block type '${name}' not found`, code: 'NOT_FOUND' } },
    })
  }

  // Don't allow disabling system types
  if (existing.isSystem) {
    throw createError({
      statusCode: 403,
      data: {
        error: {
          message: `Cannot disable system block type '${name}'`,
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
          message: `Block type '${name}' is already disabled`,
          code: 'ALREADY_DISABLED',
        },
      },
    })
  }

  // Check if any active page types reference this block in their allowedBlocks
  const pageTypes = getAllPageTypes()
  const referencingPageTypes: string[] = []

  for (const pageType of pageTypes) {
    for (const area of Object.values(pageType.areas)) {
      if (area.allowedBlocks.includes(name)) {
        referencingPageTypes.push(pageType.name)
        break // Only add page type once even if referenced in multiple areas
      }
    }
  }

  if (referencingPageTypes.length > 0) {
    throw createError({
      statusCode: 409,
      data: {
        error: {
          message: `Cannot disable block type '${name}' because it is referenced by active page types`,
          code: 'BLOCK_IN_USE',
          pageTypes: referencingPageTypes,
        },
      },
    })
  }

  // Set active: false
  await db
    .update(publisherBlockTypeDefs)
    .set({
      active: false,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(publisherBlockTypeDefs.id, existing.id))

  // Remove from in-memory registry
  removeBlockType(name)

  return {
    data: {
      name: existing.name,
      active: false,
      message: `Block type '${name}' has been disabled.`,
    },
  }
})
