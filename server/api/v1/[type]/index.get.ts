import { resolveContentType, formatEntry, isAdminSession, toSnakeCase } from '../../../utils/publisher/contentApi'
import { getTableName } from '../../../utils/publisher/schemaCompiler'
import { countRows, listRows } from '../../../utils/publisher/database/queries'
import { requireScope } from '../../../utils/publisher/scopeGuard'
import { contentScope } from '../../../utils/publisher/scopes'

export default defineEventHandler(async (event) => {
  const contentType = resolveContentType(event)
  requireScope(event, contentScope(contentType.pluralName, 'read'))
  const tableName = getTableName(contentType.pluralName)
  const query = getQuery(event)

  // ─── Build allowed column whitelist ────────────────────────────
  const allowedFields = new Set(
    Object.keys(contentType.fields).map(f => toSnakeCase(f)),
  )
  // Add system columns that are always valid for filtering/sorting
  allowedFields.add('id')
  allowedFields.add('created_at')
  allowedFields.add('updated_at')
  if (contentType.options?.draftAndPublish) allowedFields.add('status')
  if (contentType.options?.softDelete) allowedFields.add('deleted_at')

  // ─── Build WHERE clause ────────────────────────────────────────
  const conditions: string[] = []
  const params: unknown[] = []

  // Soft delete filter
  if (contentType.options?.softDelete) {
    conditions.push('deleted_at IS NULL')
  }

  // Draft/publish filter: unauthenticated requests see only published
  if (contentType.options?.draftAndPublish) {
    if (!isAdminSession(event)) {
      conditions.push("status = 'published'")
    }
    else if (query['filters[status]']) {
      conditions.push('status = ?')
      params.push(query['filters[status]'])
    }
  }

  // Basic filters: filters[field]=value, filters[field][$contains]=value
  for (const [key, value] of Object.entries(query)) {
    const match = key.match(/^filters\[(\w+)\](?:\[(\$\w+)\])?$/)
    if (!match || key === 'filters[status]') continue

    const fieldName = match[1]!
    const operator = match[2]

    // Validate field exists in content type schema (prevents SQL injection via column names)
    const colName = toSnakeCase(fieldName)
    if (!allowedFields.has(colName)) {
      throw createError({
        statusCode: 400,
        data: { error: { message: `Invalid filter field: ${fieldName}`, code: 'INVALID_FILTER' } },
      })
    }

    if (operator === '$contains') {
      conditions.push(`${colName} LIKE ?`)
      params.push(`%${value}%`)
    }
    else if (operator === '$gt') {
      conditions.push(`${colName} > ?`)
      params.push(value)
    }
    else if (operator === '$gte') {
      conditions.push(`${colName} >= ?`)
      params.push(value)
    }
    else if (operator === '$lt') {
      conditions.push(`${colName} < ?`)
      params.push(value)
    }
    else if (operator === '$lte') {
      conditions.push(`${colName} <= ?`)
      params.push(value)
    }
    else if (operator === '$ne') {
      conditions.push(`${colName} != ?`)
      params.push(value)
    }
    else {
      // Exact match
      conditions.push(`${colName} = ?`)
      params.push(value)
    }
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''

  // ─── Sort ──────────────────────────────────────────────────────
  let orderClause = 'ORDER BY id DESC' // Default sort
  if (query.sort) {
    const sortParts = (query.sort as string).split(':')
    const sortField = toSnakeCase(sortParts[0]!)
    const sortDir = sortParts[1]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Validate sort field against whitelist
    if (!allowedFields.has(sortField)) {
      throw createError({
        statusCode: 400,
        data: { error: { message: `Invalid sort field: ${sortParts[0]}`, code: 'INVALID_SORT' } },
      })
    }

    orderClause = `ORDER BY ${sortField} ${sortDir}`
  }

  // ─── Pagination ────────────────────────────────────────────────
  const page = Math.max(1, parseInt(query['pagination[page]'] as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query['pagination[pageSize]'] as string) || 25))
  const offset = (page - 1) * pageSize

  // ─── Execute queries ──────────────────────────────────────────
  const whereCondition = conditions.length > 0 ? conditions.join(' AND ') : undefined
  const total = await countRows(tableName, whereCondition ? { where: whereCondition, params } : undefined)
  const pageCount = Math.ceil(total / pageSize)

  // Remove 'ORDER BY ' prefix for listRows (it expects just the column/dir)
  const orderBy = orderClause.replace('ORDER BY ', '')

  const rows = await listRows(tableName, {
    where: whereCondition,
    params: params.length > 0 ? params : undefined,
    orderBy,
    limit: pageSize,
    offset,
  })

  // Format entries (camelCase keys, parse JSON, filter private fields)
  const data = rows.map(row => formatEntry(row, contentType))

  return {
    data,
    meta: {
      pagination: {
        page,
        pageSize,
        total,
        pageCount,
      },
    },
  }
})
