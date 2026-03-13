import { listRows, deleteRow, updateRow } from '../../../../../utils/publisher/database/queries'
import { requireAuth } from '../../../../../utils/publisher/contentApi'
import { requireScope } from '../../../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../../../utils/publisher/scopes'
import { dispatchWebhookEvent } from '../../../../../utils/publisher/webhooks'

/**
 * DELETE /api/v1/pages/:id/blocks/:blockId
 * Delete a block from a page.
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  requireAuth(event)
  requireScope(event, SCOPES.PAGES_DELETE)

  const pageId = getRouterParam(event, 'id')
  const blockId = getRouterParam(event, 'blockId')

  if (!pageId) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  if (!blockId) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing blockId parameter', code: 'MISSING_PARAM' } },
    })
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

    // ─── Fetch block and verify it belongs to this page ────────────────
    const blocks = await listRows('publisher_page_blocks', {
      where: 'id = ? AND page_id = ?',
      params: [blockId, pageId],
      limit: 1,
      offset: 0,
    })

    const block = blocks[0]

    if (!block) {
      throw createError({
        statusCode: 404,
        data: { error: { message: 'Block not found', code: 'BLOCK_NOT_FOUND' } },
      })
    }

    const areaName = block.area_name as string

    // ─── Delete the block ──────────────────────────────────────────────
    await deleteRow('publisher_page_blocks', Number(blockId))

    // ─── Reorder remaining blocks in the same area ─────────────────────
    // Get all remaining blocks in this area, ordered by current sort_order
    const remainingBlocks = await listRows('publisher_page_blocks', {
      where: 'page_id = ? AND area_name = ?',
      params: [pageId, areaName],
      orderBy: 'sort_order ASC',
      limit: 1000,
      offset: 0,
    })

    // Update sort_order to be sequential (0, 1, 2, ...)
    for (let i = 0; i < remainingBlocks.length; i++) {
      await updateRow('publisher_page_blocks', remainingBlocks[i]!.id as number, { sort_order: i })
    }

    // Dispatch webhook event
    dispatchWebhookEvent('page.block.deleted', 'page', {
      pageId: Number(pageId),
      blockId: Number(blockId),
      blockType: block.block_type as string,
      areaName,
    })

    return {
      data: {
        message: 'Block deleted successfully',
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
          message: 'Failed to delete block',
          code: 'DB_ERROR',
          details: process.env.NODE_ENV === 'development'
            ? (err instanceof Error ? err.message : String(err))
            : undefined,
        },
      },
    })
  }
})
