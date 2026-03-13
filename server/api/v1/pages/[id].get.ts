import { listRows } from '../../../utils/publisher/database/queries'
import { getPageType } from '../../../utils/publisher/pageTypeRegistry'
import { requireScope } from '../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../utils/publisher/scopes'

export default defineEventHandler(async (event) => {
  requireScope(event, SCOPES.PAGES_READ)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  // ─── Auth check ────────────────────────────────────────────────────
  const user = event.context.publisherUser
  const isAdmin = !!user

  // ─── Fetch page ────────────────────────────────────────────────────
  const pages = await listRows('publisher_pages', {
    where: 'id = ? AND deleted_at IS NULL',
    params: [id],
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
  const blocks = await listRows('publisher_page_blocks', {
    where: 'page_id = ?',
    params: [id],
    orderBy: 'area_name, sort_order ASC',
    limit: 1000,
    offset: 0,
  })

  // ─── Get page type to know all defined areas ───────────────────────
  const pageType = getPageType(page.page_type as string)

  // Initialize areas object with all defined areas from page type
  const areas: Record<string, Array<{
    id: number
    blockType: string
    sortOrder: number
    data: Record<string, unknown>
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
      areas[areaName] = [] // Handle blocks in undefined areas
    }
    areas[areaName]!.push({
      id: block.id as number,
      blockType: block.block_type as string,
      sortOrder: block.sort_order as number,
      data: typeof block.data === 'string' ? JSON.parse(block.data) : (block.data as Record<string, unknown>) || {},
    })
  }

  // ─── Format response ───────────────────────────────────────────────
  const response = {
    id: page.id,
    title: page.title,
    slug: page.slug,
    status: page.status,
    pageType: page.page_type,
    areas,
    meta: {
      title: page.meta_title,
      description: page.meta_description,
      image: page.meta_image,
      extra: page.meta_extra,
    },
    createdAt: page.created_at,
    updatedAt: page.updated_at,
    publishedAt: page.published_at,
  }

  return {
    data: response,
  }
})
