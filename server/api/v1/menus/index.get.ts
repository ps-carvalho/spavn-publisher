import { getDb, getSchema } from '../../../utils/publisher/database'
import { asc } from 'drizzle-orm'

/**
 * GET /api/v1/menus
 * List all public menus (no auth required)
 * Returns basic menu info without items
 */
export default defineEventHandler(async () => {
  const db = await getDb()
  const { publisherMenus } = await getSchema()

  // Fetch all menus ordered by name ASC
  const menus = await db
    .select({
      id: publisherMenus.id,
      name: publisherMenus.name,
      slug: publisherMenus.slug,
      description: publisherMenus.description,
      location: publisherMenus.location,
    })
    .from(publisherMenus)
    .orderBy(asc(publisherMenus.name))

  return {
    data: menus,
  }
})
