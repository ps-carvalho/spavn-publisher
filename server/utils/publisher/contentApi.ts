import type { H3Event } from 'h3'
import type { ContentTypeConfig } from '../../../lib/publisher/types'
import { getContentTypeByPlural } from './registry'

/**
 * Resolve a content type from the [type] route parameter.
 * Returns the config or throws 404.
 */
export function resolveContentType(event: H3Event): ContentTypeConfig {
  const typeName = getRouterParam(event, 'type')

  if (!typeName) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing type parameter', code: 'MISSING_PARAM' } },
    })
  }

  const contentType = getContentTypeByPlural(typeName)

  if (!contentType) {
    throw createError({
      statusCode: 404,
      data: { error: { message: `Content type '${typeName}' not found`, code: 'TYPE_NOT_FOUND' } },
    })
  }

  return contentType
}

/**
 * Check if the request has authentication (admin session or API token).
 */
export function requireAuth(event: H3Event): void {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }
}

/**
 * Check if the user is an admin session (not just API token).
 */
export function isAdminSession(event: H3Event): boolean {
  return event.context.publisherAuthMethod === 'session'
}

/**
 * Convert camelCase field names to snake_case for DB queries.
 */
export function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

/**
 * Convert snake_case DB column names to camelCase for API responses.
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

/**
 * Convert a DB row (snake_case keys) to API format (camelCase keys).
 * Filters out private fields and removed fields (columns that exist in DB
 * but are no longer defined in the content type config).
 */
export function formatEntry(
  row: Record<string, unknown>,
  contentType: ContentTypeConfig,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  // Build set of allowed field names from config
  const allowedFields = new Set<string>(Object.keys(contentType.fields))
  
  // Add system fields based on content type options
  allowedFields.add('id')
  if (contentType.options?.draftAndPublish) {
    allowedFields.add('status')
    allowedFields.add('publishedAt')
  }
  if (contentType.options?.timestamps !== false) {
    allowedFields.add('createdAt')
    allowedFields.add('updatedAt')
  }
  if (contentType.options?.softDelete) {
    allowedFields.add('deletedAt')
  }

  for (const [key, value] of Object.entries(row)) {
    const camelKey = toCamelCase(key)

    // Skip fields not in the allowed set (removed fields)
    if (!allowedFields.has(camelKey)) continue

    // Check if field is private
    const fieldConfig = contentType.fields[camelKey]
    if (fieldConfig?.private) continue

    // Parse JSON fields
    if (fieldConfig?.type === 'json' && typeof value === 'string') {
      try {
        result[camelKey] = JSON.parse(value)
      }
      catch {
        result[camelKey] = value
      }
    }
    else if (fieldConfig?.type === 'boolean') {
      result[camelKey] = value === 1 || value === true
    }
    else {
      result[camelKey] = value
    }
  }

  return result
}

/**
 * Build a row object for DB insert/update from API body.
 * Converts camelCase keys to snake_case.
 */
export function buildDbRow(
  body: Record<string, unknown>,
  contentType: ContentTypeConfig,
): Record<string, unknown> {
  const row: Record<string, unknown> = {}

  for (const [fieldName, value] of Object.entries(body)) {
    const fieldConfig = contentType.fields[fieldName]
    if (!fieldConfig) continue // Skip unknown fields

    const colName = toSnakeCase(fieldName)

    // Serialize JSON fields
    if (fieldConfig.type === 'json' && typeof value === 'object') {
      row[colName] = JSON.stringify(value)
    }
    // Convert booleans to integers for SQLite
    else if (fieldConfig.type === 'boolean') {
      row[colName] = value ? 1 : 0
    }
    else {
      row[colName] = value
    }
  }

  return row
}
