import { listRows, insertRow, findById, placeholder } from '../../../../../utils/publisher/database/queries'
import { getProvider } from '../../../../../utils/publisher/database'
import { requireAuth } from '../../../../../utils/publisher/contentApi'
import { getPageType } from '../../../../../utils/publisher/pageTypeRegistry'
import { getBlockType } from '../../../../../utils/publisher/blockRegistry'
import { validateBlockData } from '../../../../../utils/publisher/blockZodBuilder'
import { requireScope } from '../../../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../../../utils/publisher/scopes'
import { dispatchWebhookEvent } from '../../../../../utils/publisher/webhooks'

/**
 * POST /api/v1/pages/:id/blocks
 * Add a new block to a page area.
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

  // ─── Validate required fields ──────────────────────────────────────
  if (!body.areaName || typeof body.areaName !== 'string') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'areaName is required', code: 'VALIDATION_ERROR' } },
    })
  }

  if (!body.blockType || typeof body.blockType !== 'string') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'blockType is required', code: 'VALIDATION_ERROR' } },
    })
  }

  try {
    // ─── Fetch page and verify it exists ───────────────────────────────
    const pages = await listRows('publisher_pages', {
      where: 'id = ? AND deleted_at IS NULL',
      params: [pageId],
      limit: 1,
      offset: 0,
    })

    const page = pages[0]

    if (!page) {
      throw createError({
        statusCode: 404,
        data: { error: { message: 'Page not found', code: 'PAGE_NOT_FOUND' } },
      })
    }

    // ─── Get page type and validate area ───────────────────────────────
    const pageType = getPageType(page.page_type as string)

    if (!pageType) {
      throw createError({
        statusCode: 500,
        data: { error: { message: 'Page type not found in registry', code: 'PAGE_TYPE_NOT_FOUND' } },
      })
    }

    const areaConfig = pageType.areas[body.areaName]

    if (!areaConfig) {
      throw createError({
        statusCode: 400,
        data: { error: { message: `Area "${body.areaName}" is not valid for page type "${pageType.name}"`, code: 'INVALID_AREA' } },
      })
    }

    // ─── Validate block type exists ────────────────────────────────────
    const blockType = getBlockType(body.blockType)

    if (!blockType) {
      throw createError({
        statusCode: 400,
        data: { error: { message: `Block type "${body.blockType}" not found`, code: 'BLOCK_TYPE_NOT_FOUND' } },
      })
    }

    // ─── Validate block type is allowed in this area ───────────────────
    if (!areaConfig.allowedBlocks.includes(body.blockType)) {
      throw createError({
        statusCode: 400,
        data: { error: { message: `Block type "${body.blockType}" is not allowed in area "${body.areaName}"`, code: 'BLOCK_NOT_ALLOWED' } },
      })
    }

    // ─── Check maxBlocks constraint ────────────────────────────────────
    if (areaConfig.maxBlocks !== undefined) {
      const provider = await getProvider()
      const countRows = await provider.execute(
        `SELECT COUNT(*) as count FROM publisher_page_blocks WHERE page_id = ${placeholder(provider.dialect, 1)} AND area_name = ${placeholder(provider.dialect, 2)}`,
        [pageId, body.areaName],
      )
      const existingCount = countRows[0] as { count: number }

      if (existingCount.count >= areaConfig.maxBlocks) {
        throw createError({
          statusCode: 400,
          data: { error: { message: `Area "${body.areaName}" already has the maximum of ${areaConfig.maxBlocks} blocks`, code: 'MAX_BLOCKS_EXCEEDED' } },
        })
      }
    }

    // ─── Validate block data if provided ───────────────────────────────
    const blockData = body.data || {}

    if (Object.keys(blockData).length > 0) {
      const validation = validateBlockData(body.blockType, blockData, 'create')

      if (!validation.success) {
        throw createError({
          statusCode: 400,
          data: { error: { message: 'Block data validation failed', code: 'VALIDATION_ERROR', details: validation.error?.issues } },
        })
      }
    }

    // ─── Determine sort order ──────────────────────────────────────────
    let sortOrder: number

    if (body.sortOrder !== undefined && typeof body.sortOrder === 'number') {
      sortOrder = body.sortOrder
    }
    else {
      // Auto-assign: max(sort_order) + 1 for this area
      const provider = await getProvider()
      const maxOrderRows = await provider.execute(
        `SELECT MAX(sort_order) as max FROM publisher_page_blocks WHERE page_id = ${placeholder(provider.dialect, 1)} AND area_name = ${placeholder(provider.dialect, 2)}`,
        [pageId, body.areaName],
      )
      const maxOrder = maxOrderRows[0] as { max: number | null }

      sortOrder = (maxOrder.max ?? -1) + 1
    }

    // ─── Insert block ──────────────────────────────────────────────────
    const now = new Date().toISOString()

    const { lastInsertId } = await insertRow('publisher_page_blocks', {
      page_id: pageId,
      area_name: body.areaName,
      block_type: body.blockType,
      sort_order: sortOrder,
      data: blockData,
      created_at: now,
      updated_at: now,
    })

    // ─── Fetch and return created block ────────────────────────────────
    const newBlock = await findById('publisher_page_blocks', lastInsertId)

    // Dispatch webhook event
    dispatchWebhookEvent('page.block.created', 'page', {
      pageId: Number(pageId),
      blockId: newBlock!.id,
      blockType: body.blockType,
      areaName: body.areaName,
      data: blockData,
    })

    setResponseStatus(event, 201)

    // Parse block data safely
    let parsedData: Record<string, unknown> = {}
    try {
      parsedData = typeof newBlock!.data === 'string' ? JSON.parse(newBlock!.data) : newBlock!.data || {}
    }
    catch {
      throw createError({
        statusCode: 500,
        data: { error: { message: 'Failed to parse block data', code: 'PARSE_ERROR' } },
      })
    }

    return {
      data: {
        id: newBlock!.id,
        blockType: newBlock!.block_type,
        sortOrder: newBlock!.sort_order,
        data: parsedData,
        createdAt: newBlock!.created_at,
        updatedAt: newBlock!.updated_at,
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
          message: 'Failed to create block',
          code: 'DB_ERROR',
          details: process.env.NODE_ENV === 'development'
            ? (err instanceof Error ? err.message : String(err))
            : undefined,
        },
      },
    })
  }
})
