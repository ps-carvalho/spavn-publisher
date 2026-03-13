import { getDb, getSchema } from '../../../utils/publisher/database'
import { definePageType } from '../../../../lib/publisher/definePageType'
import { registerPageType, removePageType } from '../../../utils/publisher/pageTypeRegistry'
import { hasBlockType } from '../../../utils/publisher/blockRegistry'
import { eq } from 'drizzle-orm'
import type { PageTypeConfig } from '../../../../lib/publisher/types'

/**
 * PUT /api/publisher/page-types/:name — Update a page type
 * Validates, validates allowedBlocks, saves, re-registers in memory
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

  // Find existing record by name
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

  // Update in publisher_page_type_defs
  const [updated] = await db
    .update(publisherPageTypeDefs)
    .set({
      name: config.name,
      displayName: config.displayName,
      icon: config.icon || null,
      description: config.description || null,
      config: config as unknown as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(publisherPageTypeDefs.id, existing.id))
    .returning()

  // Re-register in memory (remove old if name changed, then register new)
  if (name !== config.name) {
    removePageType(name)
  }
  registerPageType(config)

  return {
    data: {
      id: updated!.id,
      name: config.name,
      displayName: config.displayName,
      icon: config.icon,
      description: config.description,
      areas: config.areas,
      options: config.options,
      active: updated!.active,
      updatedAt: updated!.updatedAt,
    },
  }
})
