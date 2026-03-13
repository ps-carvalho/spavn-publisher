import { resolveContentType, formatEntry } from '../../../../utils/publisher/contentApi'
import { getTableName } from '../../../../utils/publisher/schemaCompiler'
import { listRows } from '../../../../utils/publisher/database/queries'
import { requireScope } from '../../../../utils/publisher/scopeGuard'
import { contentScope } from '../../../../utils/publisher/scopes'

export default defineEventHandler(async (event) => {
  const contentType = resolveContentType(event)
  requireScope(event, contentScope(contentType.pluralName, 'read'))
  const tableName = getTableName(contentType.pluralName)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  // Build query with soft delete filter
  let where = 'id = ?'
  const params: unknown[] = [id]
  if (contentType.options?.softDelete) {
    where += ' AND deleted_at IS NULL'
  }

  const rows = await listRows(tableName, { where, params, limit: 1, offset: 0 })
  const row = rows[0]

  if (!row) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Entry not found', code: 'NOT_FOUND' } },
    })
  }

  return {
    data: formatEntry(row, contentType),
  }
})
