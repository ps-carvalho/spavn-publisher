import { listRows, findAllWhere } from '../../../../../utils/publisher/database/queries'
import { getPageType } from '../../../../../utils/publisher/pageTypeRegistry'
import { requireScope } from '../../../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../../../utils/publisher/scopes'

/**
 * GET /api/v1/pages/:id/blocks
 * List all blocks for a page, grouped by area.
 * Public route, but unpublished pages are only visible to admins.
 */
export default defineEventHandler(async (event) => {
  requireScope(event, SCOPES.PAGES_READ)
  const pageId = getRouterParam(event, 'id')

  if (!pageId) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  // ─── Auth check ────────────────────────────────────────────────────
  const user = event.context.publisherUser
  const isAdmin = !!user

  try {
    // ─── Fetch page ────────────────────────────────────────────────────
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

    // Public requests can only see published pages
    if (!isAdmin && page.status !== 'published') {
      throw createError({
        statusCode: 404,
        data: { error: { message: 'Page not found', code: 'PAGE_NOT_FOUND' } },
      })
    }

    // ─── Fetch blocks for this page ────────────────────────────────────
    const blocks = await findAllWhere('publisher_page_blocks', 'page_id', pageId, {
      orderBy: 'area_name, sort_order ASC',
    })

    // ─── Get page type to know all defined areas ───────────────────────
    const pageType = getPageType(page.page_type as string)

    // Initialize areas object with all defined areas from page type
    const areas: Record<string, Array<{
      id: number
      blockType: string
      sortOrder: number
      data: Record<string, unknown>
      createdAt: string
      updatedAt: string
    }>> = {}

    if (pageType?.areas) {
      for (const areaName of Object.keys(pageType.areas)) {
        areas[areaName] = []
      }
    }

    // Group blocks by area
    for (const block of blocks) {
      const areaName = block.area_name as string
      if (!areas[areaName]) {
        areas[areaName] = [] // Handle blocks in undefined areas (legacy data)
      }

      // Parse block data safely
      let parsedData: Record<string, unknown> = {}
      try {
        parsedData = typeof block.data === 'string' ? JSON.parse(block.data) : (block.data as Record<string, unknown>) || {}
      }
      catch {
        throw createError({
          statusCode: 500,
          data: { error: { message: 'Failed to parse block data', code: 'PARSE_ERROR' } },
        })
      }

      areas[areaName]!.push({
        id: block.id as number,
        blockType: block.block_type as string,
        sortOrder: block.sort_order as number,
        data: parsedData,
        createdAt: block.created_at as string,
        updatedAt: block.updated_at as string,
      })
    }

    return {
      data: areas,
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
          message: 'Failed to fetch blocks',
          code: 'DB_ERROR',
          details: process.env.NODE_ENV === 'development'
            ? (err instanceof Error ? err.message : String(err))
            : undefined,
        },
      },
    })
  }
})
