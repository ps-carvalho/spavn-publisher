import { insertRow, findById, existsWhere } from '../../../utils/publisher/database/queries'
import { requireAuth } from '../../../utils/publisher/contentApi'
import { slugify } from '../../../utils/publisher/slug'
import { getPageType } from '../../../utils/publisher/pageTypeRegistry'
import { requireScope } from '../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../utils/publisher/scopes'

/**
 * Generate a unique slug for a page.
 * Appends -2, -3, etc. if the slug already exists.
 */
async function generateUniquePageSlug(baseSlug: string, excludeId?: number): Promise<string> {
  let slug = baseSlug
  let counter = 1

  while (true) {
    const exists = await existsWhere('publisher_pages', 'slug', slug, excludeId)

    if (!exists) break

    counter++
    slug = `${baseSlug}-${counter}`
  }

  return slug
}

export default defineEventHandler(async (event) => {
  requireAuth(event)
  requireScope(event, SCOPES.PAGES_WRITE)

  const body = await readBody(event)

  // ─── Validate required fields ──────────────────────────────────────
  if (!body.title || typeof body.title !== 'string') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Title is required', code: 'VALIDATION_ERROR' } },
    })
  }

  if (!body.pageType || typeof body.pageType !== 'string') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Page type is required', code: 'VALIDATION_ERROR' } },
    })
  }

  // ─── Validate pageType exists ──────────────────────────────────────
  const pageType = getPageType(body.pageType)
  if (!pageType) {
    throw createError({
      statusCode: 400,
      data: { error: { message: `Page type "${body.pageType}" not found`, code: 'PAGE_TYPE_NOT_FOUND' } },
    })
  }

  // ─── Generate or validate slug ─────────────────────────────────────
  let slug: string
  if (body.slug && typeof body.slug === 'string') {
    // Use provided slug but ensure uniqueness
    slug = await generateUniquePageSlug(slugify(body.slug))
  }
  else {
    // Auto-generate slug from title
    slug = await generateUniquePageSlug(slugify(body.title))
  }

  // ─── Build and execute INSERT ──────────────────────────────────────
  const now = new Date().toISOString()
  const status = body.status || 'draft'

  const insertData: Record<string, unknown> = {
    page_type: body.pageType,
    title: body.title,
    slug,
    status,
    created_at: now,
    updated_at: now,
  }

  // Add optional meta fields
  if (body.metaTitle !== undefined) insertData.meta_title = body.metaTitle
  if (body.metaDescription !== undefined) insertData.meta_description = body.metaDescription
  if (body.metaImage !== undefined) insertData.meta_image = body.metaImage
  if (body.metaExtra !== undefined) insertData.meta_extra = body.metaExtra

  const { lastInsertId } = await insertRow('publisher_pages', insertData)

  // ─── Fetch and return the created page ─────────────────────────────
  const row = await findById('publisher_pages', lastInsertId)

  const formattedPage = {
    id: row!.id,
    title: row!.title,
    slug: row!.slug,
    pageType: row!.page_type,
    status: row!.status,
    metaTitle: row!.meta_title,
    metaDescription: row!.meta_description,
    metaImage: row!.meta_image,
    metaExtra: row!.meta_extra,
    publishedAt: row!.published_at,
    createdAt: row!.created_at,
    updatedAt: row!.updated_at,
  }

  setResponseStatus(event, 201)

  return {
    data: formattedPage,
  }
})
