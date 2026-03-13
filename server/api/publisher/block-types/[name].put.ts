import { getDb, getSchema } from '../../../utils/publisher/database'
import { defineBlockType } from '../../../../lib/publisher/defineBlockType'
import { registerBlockType, removeBlockType } from '../../../utils/publisher/blockRegistry'
import { eq } from 'drizzle-orm'
import type { BlockTypeConfig } from '../../../../lib/publisher/types'

/**
 * PUT /api/publisher/block-types/:name — Update a block type
 * Validates, saves, re-registers in memory
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

  const body = await readBody(event)

  // Validate using defineBlockType
  let config: BlockTypeConfig
  try {
    config = defineBlockType(body as BlockTypeConfig)
  } catch (err) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: err instanceof Error ? err.message : 'Validation failed',
          code: 'VALIDATION_ERROR',
        },
      },
    })
  }

  const db = await getDb()
  const { publisherBlockTypeDefs } = await getSchema()

  // Find existing record by name
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

  // Update in publisher_block_type_defs
  const [updated] = await db
    .update(publisherBlockTypeDefs)
    .set({
      name: config.name,
      displayName: config.displayName,
      category: config.category || null,
      icon: config.icon || null,
      description: config.description || null,
      config: config as unknown as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(publisherBlockTypeDefs.id, existing.id))
    .returning()

  // Re-register in memory (remove old if name changed, then register new)
  if (name !== config.name) {
    removeBlockType(name)
  }
  registerBlockType(config)

  return {
    data: {
      id: updated!.id,
      name: config.name,
      displayName: config.displayName,
      category: config.category,
      icon: config.icon,
      description: config.description,
      fields: config.fields,
      active: updated!.active,
      updatedAt: updated!.updatedAt,
    },
  }
})
