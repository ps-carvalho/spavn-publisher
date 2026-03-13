import { getDb, getSchema } from '../../../utils/publisher/database'
import { eq, asc, isNull } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Auth check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Validate ID parameter
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid menu ID', code: 'INVALID_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherMenus, publisherMenuItems } = await getSchema()

  // Fetch the menu
  const [menu] = await db
    .select()
    .from(publisherMenus)
    .where(eq(publisherMenus.id, id))

  if (!menu) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Menu not found', code: 'NOT_FOUND' } },
    })
  }

  // Fetch all items for this menu
  // Order by: parent_id NULLS FIRST, then sort_order
  // Note: This returns a flat list - tree building happens in the frontend/builder
  const items = await db
    .select()
    .from(publisherMenuItems)
    .where(eq(publisherMenuItems.menuId, id))
    .orderBy(
      // Sort by parent_id (nulls first), then by sort_order
      // Using a custom approach for cross-dialect compatibility
      asc(publisherMenuItems.parentId),
      asc(publisherMenuItems.sortOrder)
    )

  return {
    data: {
      menu: {
        id: menu.id,
        name: menu.name,
        slug: menu.slug,
        description: menu.description,
        location: menu.location,
        createdAt: menu.createdAt,
        updatedAt: menu.updatedAt,
      },
      items: items.map((item) => ({
        id: item.id,
        menuId: item.menuId,
        parentId: item.parentId,
        sortOrder: item.sortOrder,
        label: item.label,
        type: item.type,
        url: item.url,
        target: item.target,
        icon: item.icon,
        cssClass: item.cssClass,
        visible: item.visible,
        metadata: item.metadata,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
    },
  }
})
