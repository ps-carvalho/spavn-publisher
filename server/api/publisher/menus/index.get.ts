import { getDb, getSchema } from '../../../utils/publisher/database'
import { desc, count, eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Auth check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const db = await getDb()
  const { publisherMenus, publisherMenuItems } = await getSchema()

  // Get all menus ordered by created_at DESC
  const menus = await db
    .select()
    .from(publisherMenus)
    .orderBy(desc(publisherMenus.createdAt))

  // Get item counts for each menu
  const itemCounts = await db
    .select({
      menuId: publisherMenuItems.menuId,
      count: count(publisherMenuItems.id),
    })
    .from(publisherMenuItems)
    .groupBy(publisherMenuItems.menuId)

  // Create a map of menu ID to item count
  const countMap = new Map<number, number>()
  for (const item of itemCounts) {
    countMap.set(item.menuId as number, item.count as number)
  }

  // Combine menus with their item counts
  return {
    data: menus.map((menu) => ({
      id: menu.id,
      name: menu.name,
      slug: menu.slug,
      description: menu.description,
      location: menu.location,
      createdAt: menu.createdAt,
      itemCount: countMap.get(menu.id as number) || 0,
    })),
  }
})
