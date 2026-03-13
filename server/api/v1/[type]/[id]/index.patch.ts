import { resolveContentType, requireAuth, buildDbRow, formatEntry } from '../../../../utils/publisher/contentApi'
import { buildZodSchema } from '../../../../utils/publisher/zodBuilder'
import { getTableName } from '../../../../utils/publisher/schemaCompiler'
import { findById, updateRow } from '../../../../utils/publisher/database/queries'
import { generateUniqueSlug } from '../../../../utils/publisher/slug'
import { dispatchWebhookEvent } from '../../../../utils/publisher/webhooks'
import { requireScope } from '../../../../utils/publisher/scopeGuard'
import { contentScope } from '../../../../utils/publisher/scopes'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const contentType = resolveContentType(event)
  requireScope(event, contentScope(contentType.pluralName, 'write'))
  const tableName = getTableName(contentType.pluralName)
  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  // Check entry exists
  const existing = await findById(tableName, Number(id))
  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Entry not found', code: 'NOT_FOUND' } },
    })
  }

  // Clean up body: HTML forms send "" for empty inputs.
  // For non-text fields, empty string should be treated as "not provided".
  const textTypes = new Set(['string', 'text', 'richtext'])
  for (const [key, value] of Object.entries(body)) {
    const fieldConfig = contentType.fields[key]
    if (fieldConfig && value === '' && !textTypes.has(fieldConfig.type)) {
      delete body[key]
    }
  }

  // Validate body (update mode — all fields optional)
  const schema = buildZodSchema(contentType, 'update')
  const parsed = schema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues,
        },
      },
    })
  }

  // Handle UID regeneration
  const data = { ...parsed.data }
  
  // Require publish scope if changing status to published
  if (data.status === 'published') {
    requireScope(event, contentScope(contentType.pluralName, 'publish'))
  }
  
  for (const [fieldName, fieldConfig] of Object.entries(contentType.fields)) {
    if (fieldConfig.type === 'uid' && 'targetField' in fieldConfig) {
      const targetValue = data[fieldConfig.targetField]
      if (targetValue && !data[fieldName]) {
        data[fieldName] = await generateUniqueSlug(
          contentType.pluralName,
          fieldName,
          String(targetValue),
          Number(id),
        )
      }
    }
  }

  // Build update
  const dbRow = buildDbRow(data, contentType)

  // Add updated_at if timestamps enabled
  if (contentType.options?.timestamps !== false) {
    dbRow.updated_at = new Date().toISOString()
  }

  // Handle status + published_at on status transitions
  if (contentType.options?.draftAndPublish && body.status) {
    dbRow.status = body.status
    if (body.status === 'published') {
      dbRow.published_at = new Date().toISOString()
    } else if (body.status === 'draft' && existing.status === 'published') {
      dbRow.published_at = null
    }
  }

  if (Object.keys(dbRow).length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No fields to update', code: 'EMPTY_UPDATE' } },
    })
  }

  const row = await updateRow(tableName, Number(id), dbRow)
  const formattedEntry = formatEntry(row!, contentType)

  // Determine event type — publish if status changed to 'published'
  const wasPublished = data.status === 'published'
  const wasUnpublished = data.status === 'draft' && existing.status === 'published'

  if (wasPublished) {
    dispatchWebhookEvent('entry.publish', contentType.name, formattedEntry)
  }
  else if (wasUnpublished) {
    dispatchWebhookEvent('entry.unpublish', contentType.name, formattedEntry)
  }
  else {
    dispatchWebhookEvent('entry.update', contentType.name, formattedEntry)
  }

  return {
    data: formattedEntry,
  }
})
