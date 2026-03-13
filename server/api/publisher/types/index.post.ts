import { getDb, getSchema } from '../../../utils/publisher/database'
import { defineContentType } from '../../../../lib/publisher/defineContentType'
import { registerContentType, getContentType, getContentTypeByPlural } from '../../../utils/publisher/registry'
import { compileAndCreateTable } from '../../../utils/publisher/schemaCompiler'
import { eq } from 'drizzle-orm'
import type { ContentTypeConfig } from '../../../../lib/publisher/types'

/**
 * POST /api/publisher/types — Create a new content type
 * Validates via defineContentType, saves to DB, compiles table, registers in memory
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

  // Validate using defineContentType — this throws if invalid
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

  // Check name uniqueness
  const [existingByName] = await db
    .select()
    .from(publisherContentTypeDefs)
    .where(eq(publisherContentTypeDefs.name, config.name))
    .limit(1)

  if (existingByName) {
    throw createError({
      statusCode: 409,
      data: {
        error: {
          message: `Content type with name '${config.name}' already exists`,
          code: 'DUPLICATE_NAME',
        },
      },
    })
  }

  // Check pluralName uniqueness
  const [existingByPlural] = await db
    .select()
    .from(publisherContentTypeDefs)
    .where(eq(publisherContentTypeDefs.pluralName, config.pluralName))
    .limit(1)

  if (existingByPlural) {
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

  // Insert into publisher_content_type_defs
  const [inserted] = await db
    .insert(publisherContentTypeDefs)
    .values({
      name: config.name,
      displayName: config.displayName,
      pluralName: config.pluralName,
      icon: config.icon || null,
      description: config.description || null,
      config: config as unknown as Record<string, unknown>,
      isSystem: false,
      active: true,
    })
    .returning()

  // Compile and create the publisher_ct_* table
  const tableName = await compileAndCreateTable(config)

  // Register in memory
  registerContentType(config)

  setResponseStatus(event, 201)

  return {
    data: {
      id: inserted!.id,
      name: config.name,
      displayName: config.displayName,
      pluralName: config.pluralName,
      icon: config.icon,
      description: config.description,
      fields: config.fields,
      options: config.options,
      tableName,
      active: true,
      createdAt: inserted!.createdAt,
    },
  }
})
