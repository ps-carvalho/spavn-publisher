import { listRows, softDeleteRow } from '../../../utils/publisher/database/queries'
import { requireAuth } from '../../../utils/publisher/contentApi'
import { requireScope } from '../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../utils/publisher/scopes'

export default defineEventHandler(async (event) => {
  requireAuth(event)
  requireScope(event, SCOPES.PAGES_DELETE)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  // ─── Check page exists and is not already deleted ──────────────────
  const existingPages = await listRows('publisher_pages', {
    where: 'id = ? AND deleted_at IS NULL',
    params: [id],
    limit: 1,
    offset: 0,
  })

  const existing = existingPages[0]

  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Page not found', code: 'PAGE_NOT_FOUND' } },
    })
  }

  // ─── Soft delete ───────────────────────────────────────────────────
  await softDeleteRow('publisher_pages', Number(id))

  return {
    data: {
      message: 'Page deleted successfully',
    },
  }
})
