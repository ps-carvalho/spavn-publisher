import { resolveContentType, requireAuth, buildDbRow, formatEntry, toSnakeCase } from '../../../utils/publisher/contentApi'
import { buildZodSchema } from '../../../utils/publisher/zodBuilder'
import { getTableName } from '../../../utils/publisher/schemaCompiler'
import { insertRow, findById } from '../../../utils/publisher/database/queries'
import { generateUniqueSlug } from '../../../utils/publisher/slug'
import { dispatchWebhookEvent } from '../../../utils/publisher/webhooks'
import { requireScope } from '../../../utils/publisher/scopeGuard'
import { contentScope } from '../../../utils/publisher/scopes'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const contentType = resolveContentType(event)
  requireScope(event, contentScope(contentType.pluralName, 'write'))
  const tableName = getTableName(contentType.pluralName)
  const body = await readBody(event)

  // Clean up body: HTML forms send "" for empty inputs.
  // For non-text fields, empty string should be treated as "not provided".
  const textTypes = new Set(['string', 'text', 'richtext'])
  for (const [key, value] of Object.entries(body)) {
    const fieldConfig = contentType.fields[key]
    if (fieldConfig && value === '' && !textTypes.has(fieldConfig.type)) {
      delete body[key]
    }
  }

  // ─── Validate body ─────────────────────────────────────────────
  const schema = buildZodSchema(contentType, 'create')
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

  // ─── Handle UID auto-generation ────────────────────────────────
  const data = { ...parsed.data }

  for (const [fieldName, fieldConfig] of Object.entries(contentType.fields)) {
    if (fieldConfig.type === 'uid' && 'targetField' in fieldConfig) {
      const targetValue = data[fieldConfig.targetField]
      if (targetValue && !data[fieldName]) {
        data[fieldName] = await generateUniqueSlug(
          contentType.pluralName,
          fieldName,
          String(targetValue),
        )
      }
    }
  }

  // ─── Build and execute INSERT ──────────────────────────────────
  const dbRow = buildDbRow(data, contentType)

  // Add draftAndPublish defaults
  if (contentType.options?.draftAndPublish && !dbRow.status) {
    dbRow.status = 'draft'
  }

  const { lastInsertId } = await insertRow(tableName, dbRow)

  // ─── Fetch and return the created entry ─────────────────────────
  const row = await findById(tableName, lastInsertId)

  const formattedEntry = formatEntry(row!, contentType)

  // Fire webhook
  dispatchWebhookEvent('entry.create', contentType.name, formattedEntry)

  setResponseStatus(event, 201)

  return {
    data: formattedEntry,
  }
})
