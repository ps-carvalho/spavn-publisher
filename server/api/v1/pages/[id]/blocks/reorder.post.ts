import { listRows, updateRow } from '../../../../../utils/publisher/database/queries'
import { getProvider } from '../../../../../utils/publisher/database'
import { requireAuth } from '../../../../../utils/publisher/contentApi'
import { requireScope } from '../../../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../../../utils/publisher/scopes'
import { dispatchWebhookEvent } from '../../../../../utils/publisher/webhooks'

/**
 * POST /api/v1/pages/:id/blocks/reorder
 * Batch reorder blocks within an area.
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  requireAuth(event)
  requireScope(event, SCOPES.PAGES_WRITE)

  const pageId = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!pageId) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  // ─── Validate body ─────────────────────────────────────────────────
  if (!body.areaName || typeof body.areaName !== 'string') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'areaName is required', code: 'VALIDATION_ERROR' } },
    })
  }

  if (!Array.isArray(body.blockIds) || body.blockIds.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'blockIds must be a non-empty array', code: 'VALIDATION_ERROR' } },
    })
  }

  // Validate all blockIds are numbers
  for (const id of body.blockIds) {
    if (typeof id !== 'number') {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'All blockIds must be numbers', code: 'VALIDATION_ERROR' } },
      })
    }
  }

  try {
    // ─── Verify page exists ────────────────────────────────────────────
    const pages = await listRows('publisher_pages', {
      where: 'id = ? AND deleted_at IS NULL',
      params: [pageId],
      limit: 1,
      offset: 0,
    })

    if (!pages[0]) {
      throw createError({
        statusCode: 404,
        data: { error: { message: 'Page not found', code: 'PAGE_NOT_FOUND' } },
      })
    }

    // ─── Verify all blocks exist and belong to this page/area ──────────
    // Use getProvider for IN clause with dynamic placeholders
    const provider = await getProvider()
    const { dialect } = provider

    // Build placeholders for IN clause
    const inPlaceholders = body.blockIds.map((_: number, i: number) =>
      dialect === 'postgres' ? `$${i + 1}` : '?',
    ).join(',')

    const blocks = await provider.execute(
      `SELECT id, area_name FROM publisher_page_blocks WHERE id IN (${inPlaceholders}) AND page_id = ${dialect === 'postgres' ? `$${body.blockIds.length + 1}` : '?'}`,
      [...body.blockIds, pageId],
    ) as { id: number; area_name: string }[]

    // Check all blockIds were found
    if (blocks.length !== body.blockIds.length) {
      const foundIds = blocks.map(b => b.id)
      const missingIds = body.blockIds.filter((id: number) => !foundIds.includes(id))
      throw createError({
        statusCode: 400,
        data: { error: { message: `Blocks not found: ${missingIds.join(', ')}`, code: 'BLOCKS_NOT_FOUND' } },
      })
    }

    // Check all blocks are in the specified area
    const wrongAreaBlocks = blocks.filter(b => b.area_name !== body.areaName)
    if (wrongAreaBlocks.length > 0) {
      throw createError({
        statusCode: 400,
        data: { error: { message: `Some blocks are not in area "${body.areaName}"`, code: 'WRONG_AREA' } },
      })
    }

    // ─── Update sort_order for each block ──────────────────────────────
    for (let i = 0; i < body.blockIds.length; i++) {
      await updateRow('publisher_page_blocks', body.blockIds[i], { sort_order: i })
    }

    // Dispatch webhook event
    dispatchWebhookEvent('page.block.reordered', 'page', {
      pageId: Number(pageId),
      areaName: body.areaName,
      blockIds: body.blockIds,
    })

    return {
      data: {
        message: 'Blocks reordered successfully',
      },
    }
  }
  catch (err) {
    // Re-throw if already a proper error
    if (err && typeof err === 'object' && 'statusCode' in err) {
      throw err
    }
    throw createError({
      statusCode: 500,
      data: {
        error: {
          message: 'Failed to reorder blocks',
          code: 'DB_ERROR',
          details: process.env.NODE_ENV === 'development'
            ? (err instanceof Error ? err.message : String(err))
            : undefined,
        },
      },
    })
  }
})
