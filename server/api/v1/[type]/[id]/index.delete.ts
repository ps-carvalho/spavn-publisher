import { resolveContentType, requireAuth } from '../../../../utils/publisher/contentApi'
import { getTableName } from '../../../../utils/publisher/schemaCompiler'
import { findById, deleteRow, softDeleteRow } from '../../../../utils/publisher/database/queries'
import { dispatchWebhookEvent } from '../../../../utils/publisher/webhooks'
import { requireScope } from '../../../../utils/publisher/scopeGuard'
import { contentScope } from '../../../../utils/publisher/scopes'

export default defineEventHandler(async (event) => {
  requireAuth(event)

  const contentType = resolveContentType(event)
  requireScope(event, contentScope(contentType.pluralName, 'delete'))
  const tableName = getTableName(contentType.pluralName)
  const id = getRouterParam(event, 'id')

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

  // Soft delete or hard delete
  if (contentType.options?.softDelete) {
    await softDeleteRow(tableName, Number(id))
  }
  else {
    await deleteRow(tableName, Number(id))
  }

  // Fire webhook with the deleted entry's data
  dispatchWebhookEvent('entry.delete', contentType.name, existing)

  return { data: null }
})
