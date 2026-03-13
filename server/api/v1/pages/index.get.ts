import { countRows, listRows } from '../../../utils/publisher/database/queries'
import { toSnakeCase } from '../../../utils/publisher/contentApi'
import { requireScope } from '../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../utils/publisher/scopes'

/**
 * Format a page row from DB to API response format
 */
function formatPage(row: Record<string, unknown>) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    pageType: row.page_type,
    status: row.status,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    metaImage: row.meta_image,
    metaExtra: row.meta_extra,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export default defineEventHandler(async (event) => {
  requireScope(event, SCOPES.PAGES_READ)
  const query = getQuery(event)

  // ─── Auth check ────────────────────────────────────────────────────
  const user = event.context.publisherUser
  const isAdmin = !!user

  // ─── Build WHERE clause ────────────────────────────────────────────
  const conditions: string[] = []
  const params: unknown[] = []

  // Soft delete filter - always exclude soft-deleted pages
  conditions.push('deleted_at IS NULL')

  // Draft/publish filter: unauthenticated requests see only published
  if (!isAdmin) {
    conditions.push("status = 'published'")
  }
  else if (query.status) {
    conditions.push('status = ?')
    params.push(query.status)
  }

  // Page type filter
  if (query.pageType) {
    conditions.push('page_type = ?')
    params.push(query.pageType)
  }

  // Search filter (searches title)
  if (query.search) {
    conditions.push('title LIKE ?')
    params.push(`%${query.search}%`)
  }

  const whereClause = conditions.join(' AND ')

  // ─── Sort ──────────────────────────────────────────────────────────
  let orderBy = 'created_at DESC' // Default sort
  if (query.sort) {
    const sortParts = (query.sort as string).split(':')
    const sortField = toSnakeCase(sortParts[0]!)
    const sortDir = sortParts[1]?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC'

    // Validate sort field against allowed fields
    const allowedSortFields = ['id', 'title', 'slug', 'status', 'page_type', 'created_at', 'updated_at', 'published_at']
    if (allowedSortFields.includes(sortField)) {
      orderBy = `${sortField} ${sortDir}`
    }
  }

  // ─── Pagination ────────────────────────────────────────────────────
  const page = Math.max(1, parseInt(query['pagination[page]'] as string) || 1)
  const pageSize = Math.min(100, Math.max(1, parseInt(query['pagination[pageSize]'] as string) || 25))
  const offset = (page - 1) * pageSize

  // ─── Execute queries ──────────────────────────────────────────────
  const total = await countRows('publisher_pages', {
    where: whereClause,
    params,
  })
  const pageCount = Math.ceil(total / pageSize)

  const rows = await listRows('publisher_pages', {
    where: whereClause,
    params,
    orderBy,
    limit: pageSize,
    offset,
  })

  // Format entries
  const data = rows.map(row => formatPage(row))

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
