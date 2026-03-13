import { getDb, getSchema } from '../../../utils/publisher/database'
import { defineBlockType } from '../../../../lib/publisher/defineBlockType'
import { registerBlockType, hasBlockType } from '../../../utils/publisher/blockRegistry'
import { eq } from 'drizzle-orm'
import type { BlockTypeConfig } from '../../../../lib/publisher/types'

/**
 * POST /api/publisher/block-types — Create a new block type
 * Validates via defineBlockType, saves to DB, registers in memory
 */
export default defineEventHandler(async (event) => {
  // Require admin auth
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
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

  // Check name uniqueness
  const [existing] = await db
    .select()
    .from(publisherBlockTypeDefs)
    .where(eq(publisherBlockTypeDefs.name, config.name))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      data: {
        error: {
          message: `Block type with name '${config.name}' already exists`,
          code: 'DUPLICATE_NAME',
        },
      },
    })
  }

  // Insert into publisher_block_type_defs
  const [inserted] = await db
    .insert(publisherBlockTypeDefs)
    .values({
      name: config.name,
      displayName: config.displayName,
      category: config.category || null,
      icon: config.icon || null,
      description: config.description || null,
      config: config as unknown as Record<string, unknown>,
      isSystem: false,
      active: true,
    })
    .returning()

  // Register in memory
  registerBlockType(config)

  setResponseStatus(event, 201)

  return {
    data: {
      id: inserted!.id,
      name: config.name,
      displayName: config.displayName,
      category: config.category,
      icon: config.icon,
      description: config.description,
      fields: config.fields,
      active: true,
      createdAt: inserted!.createdAt,
    },
  }
})
