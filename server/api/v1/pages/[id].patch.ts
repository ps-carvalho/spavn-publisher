import { listRows, updateRow, existsWhere } from '../../../utils/publisher/database/queries'
import { requireAuth } from '../../../utils/publisher/contentApi'
import { slugify } from '../../../utils/publisher/slug'
import { requireScope } from '../../../utils/publisher/scopeGuard'
import { SCOPES } from '../../../utils/publisher/scopes'

/**
 * Generate a unique slug for a page, excluding current page ID.
 */
async function generateUniquePageSlug(baseSlug: string, excludeId: number): Promise<string> {
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

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing id parameter', code: 'MISSING_PARAM' } },
    })
  }

  // ─── Check page exists ─────────────────────────────────────────────
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

  // ─── Build update data ─────────────────────────────────────────────
  const updateData: Record<string, unknown> = {}
  const now = new Date().toISOString()

  // Always update updated_at
  updateData.updated_at = now

  // Handle title update
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || !body.title.trim()) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Title must be a non-empty string', code: 'VALIDATION_ERROR' } },
      })
    }
    updateData.title = body.title
  }

  // Handle slug update
  if (body.slug !== undefined) {
    const newSlug = await generateUniquePageSlug(slugify(body.slug), Number(id))
    updateData.slug = newSlug
  }

  // Handle status update and publishedAt logic
  if (body.status !== undefined) {
    const oldStatus = existing.status as string
    const newStatus = body.status

    // Require publish scope if changing status to published
    if (newStatus === 'published' && oldStatus !== 'published') {
      requireScope(event, SCOPES.PAGES_PUBLISH)
    }

    updateData.status = newStatus

    // If status changes to 'published', set publishedAt
    if (newStatus === 'published' && oldStatus !== 'published') {
      updateData.published_at = now
    }
    // If status changes from 'published' to 'draft', clear publishedAt
    else if (newStatus === 'draft' && oldStatus === 'published') {
      updateData.published_at = null
    }
  }

  // Handle meta fields
  if (body.metaTitle !== undefined) updateData.meta_title = body.metaTitle
  if (body.metaDescription !== undefined) updateData.meta_description = body.metaDescription
  if (body.metaImage !== undefined) updateData.meta_image = body.metaImage
  if (body.metaExtra !== undefined) updateData.meta_extra = body.metaExtra

  // ─── Execute update ────────────────────────────────────────────────
  if (Object.keys(updateData).length === 1) {
    // Only updated_at, nothing to update
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No fields to update', code: 'EMPTY_UPDATE' } },
    })
  }

  const row = await updateRow('publisher_pages', Number(id), updateData)

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

  return {
    data: formattedPage,
  }
})
