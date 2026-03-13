import { getDb, getSchema } from '../../../utils/publisher/database'
import { defineContentType } from '../../../../lib/publisher/defineContentType'
import { registerContentType, getContentType, removeContentType } from '../../../utils/publisher/registry'
import { safeSchemaSync } from '../../../utils/publisher/schemaMigration'
import { eq } from 'drizzle-orm'
import type { ContentTypeConfig } from '../../../../lib/publisher/types'

/**
 * PUT /api/publisher/types/:name — Update a content type
 * Validates, saves, runs safe migration, re-registers in memory
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

  const body = await readBody(event)

  // Validate using defineContentType
  let config: ContentTypeConfig
  try {
    config = defineContentType(body as ContentTypeConfig)
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
  const { publisherContentTypeDefs } = await getSchema()

  // Find existing record by name
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

  // If pluralName changed, check uniqueness
  if (config.pluralName !== existing.pluralName) {
    const [existingByPlural] = await db
      .select()
      .from(publisherContentTypeDefs)
      .where(eq(publisherContentTypeDefs.pluralName, config.pluralName))
      .limit(1)

    if (existingByPlural && existingByPlural.id !== existing.id) {
      throw createError({
        statusCode: 409,
        data: {
          error: {
            message: `Content type with pluralName '${config.pluralName}' already exists`,
            code: 'DUPLICATE_PLURAL_NAME',
          },
        },
      })
    }
  }

  // Update in publisher_content_type_defs
  const [updated] = await db
    .update(publisherContentTypeDefs)
    .set({
      name: config.name,
      displayName: config.displayName,
      pluralName: config.pluralName,
      icon: config.icon || null,
      description: config.description || null,
      config: config as unknown as Record<string, unknown>,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(publisherContentTypeDefs.id, existing.id))
    .returning()

  // Run safe schema migration for schema changes
  const migrationResult = await safeSchemaSync(config)

  // Re-register in memory (remove old if name changed, then register new)
  if (name !== config.name) {
    removeContentType(name)
  }
  registerContentType(config)

  return {
    data: {
      id: updated!.id,
      name: config.name,
      displayName: config.displayName,
      pluralName: config.pluralName,
      icon: config.icon,
      description: config.description,
      fields: config.fields,
      options: config.options,
      active: updated!.active,
      updatedAt: updated!.updatedAt,
    },
    migration: {
      added: migrationResult.added,
      removed: migrationResult.removed,
      warnings: migrationResult.warnings,
    },
  }
})
