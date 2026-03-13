import { listRows, updateRow, findById, findOneWhere } from '../../../../../utils/publisher/database/queries'
import { requireAuth } from '../../../../../utils/publisher/contentApi'
import { getBlockType } from '../../../../../utils/publisher/blockRegistry'
import { validateBlockData } from '../../../../../utils/publisher/blockZodBuilder'
import { requireScope } from '../../../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../../../utils/publisher/scopes'
import { dispatchWebhookEvent } from '../../../../../utils/publisher/webhooks'

/**
 * PATCH /api/v1/pages/:id/blocks/:blockId
 * Update a block's data.
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  requireAuth(event)
  requireScope(event, SCOPES.PAGES_WRITE)

  const pageId = getRouterParam(event, 'id')
  const blockId = getRouterParam(event, 'blockId')
  const body = await readBody(event)

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

  // ─── Validate body ─────────────────────────────────────────────────
  if (!body.data || typeof body.data !== 'object') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'data object is required', code: 'VALIDATION_ERROR' } },
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
    // Use custom query since we need to check both id and page_id
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

    // ─── Validate data against block type schema ───────────────────────
    const blockType = getBlockType(block.block_type as string)

    if (!blockType) {
      throw createError({
        statusCode: 500,
        data: { error: { message: `Block type "${block.block_type}" not found in registry`, code: 'BLOCK_TYPE_NOT_FOUND' } },
      })
    }

    const validation = validateBlockData(blockType.name, body.data, 'update')

    if (!validation.success) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Block data validation failed', code: 'VALIDATION_ERROR', details: validation.error?.issues } },
      })
    }

    // ─── Merge new data with existing data ─────────────────────────────
    let existingData: Record<string, unknown> = {}
    try {
      existingData = typeof block.data === 'string' ? JSON.parse(block.data) : (block.data as Record<string, unknown>) || {}
    }
    catch {
      throw createError({
        statusCode: 500,
        data: { error: { message: 'Failed to parse existing block data', code: 'PARSE_ERROR' } },
      })
    }

    // Filter out dangerous keys to prevent prototype pollution
    const safeData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(body.data)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue
      }
      safeData[key] = value
    }
    const mergedData = { ...existingData, ...safeData }

    // ─── Update block ──────────────────────────────────────────────────
    const now = new Date().toISOString()

    const updatedBlock = await updateRow('publisher_page_blocks', Number(blockId), {
      data: mergedData,
      updated_at: now,
    })

    // Dispatch webhook event
    dispatchWebhookEvent('page.block.updated', 'page', {
      pageId: Number(pageId),
      blockId: Number(blockId),
      blockType: block.block_type as string,
      data: mergedData,
    })

    // Parse updated block data safely
    let parsedData: Record<string, unknown> = {}
    try {
      parsedData = typeof updatedBlock!.data === 'string' ? JSON.parse(updatedBlock!.data) : updatedBlock!.data || {}
    }
    catch {
      throw createError({
        statusCode: 500,
        data: { error: { message: 'Failed to parse updated block data', code: 'PARSE_ERROR' } },
      })
    }

    return {
      data: {
        id: updatedBlock!.id,
        blockType: updatedBlock!.block_type,
        sortOrder: updatedBlock!.sort_order,
        data: parsedData,
        createdAt: updatedBlock!.created_at,
        updatedAt: updatedBlock!.updated_at,
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
          message: 'Failed to update block',
          code: 'DB_ERROR',
          details: process.env.NODE_ENV === 'development'
            ? (err instanceof Error ? err.message : String(err))
            : undefined,
        },
      },
    })
  }
})
