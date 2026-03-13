import { getDb, getSchema } from '../../../utils/publisher/database'
import { definePageType } from '../../../../lib/publisher/definePageType'
import { registerPageType, hasPageType } from '../../../utils/publisher/pageTypeRegistry'
import { hasBlockType, getAllBlockTypes } from '../../../utils/publisher/blockRegistry'
import { eq } from 'drizzle-orm'
import type { PageTypeConfig } from '../../../../lib/publisher/types'

/**
 * POST /api/publisher/page-types — Create a new page type
 * Validates via definePageType, validates allowedBlocks, saves to DB, registers in memory
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

  // Validate using definePageType
  let config: PageTypeConfig
  try {
    config = definePageType(body as PageTypeConfig)
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
  const { publisherPageTypeDefs } = await getSchema()

  // Validate that all allowedBlocks in areas reference active block types
  const invalidBlocks: string[] = []
  for (const area of Object.values(config.areas)) {
    for (const blockName of area.allowedBlocks) {
      if (!hasBlockType(blockName) && !invalidBlocks.includes(blockName)) {
        invalidBlocks.push(blockName)
      }
    }
  }

  if (invalidBlocks.length > 0) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: `Invalid block type references: ${invalidBlocks.join(', ')}`,
          code: 'INVALID_BLOCK_REFERENCE',
          invalidBlocks,
        },
      },
    })
  }

  // Check name uniqueness
  const [existing] = await db
    .select()
    .from(publisherPageTypeDefs)
    .where(eq(publisherPageTypeDefs.name, config.name))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      data: {
        error: {
          message: `Page type with name '${config.name}' already exists`,
          code: 'DUPLICATE_NAME',
        },
      },
    })
  }

  // Insert into publisher_page_type_defs
  const [inserted] = await db
    .insert(publisherPageTypeDefs)
    .values({
      name: config.name,
      displayName: config.displayName,
      icon: config.icon || null,
      description: config.description || null,
      config: config as unknown as Record<string, unknown>,
      isSystem: false,
      active: true,
    })
    .returning()

  // Register in memory
  registerPageType(config)

  setResponseStatus(event, 201)

  return {
    data: {
      id: inserted!.id,
      name: config.name,
      displayName: config.displayName,
      icon: config.icon,
      description: config.description,
      areas: config.areas,
      options: config.options,
      active: true,
      createdAt: inserted!.createdAt,
    },
  }
})
