import { eq, and } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Auth check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Validate menu ID parameter
  const menuId = Number(getRouterParam(event, 'id'))
  if (!menuId || isNaN(menuId)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid menu ID', code: 'INVALID_PARAM' } },
    })
  }

  // Validate item ID parameter
  const itemId = Number(getRouterParam(event, 'itemId'))
  if (!itemId || isNaN(itemId)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid item ID', code: 'INVALID_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherMenuItems } = await getSchema()

  // Check if item exists and belongs to the menu
  const [existingItem] = await db
    .select()
    .from(publisherMenuItems)
    .where(and(eq(publisherMenuItems.id, itemId), eq(publisherMenuItems.menuId, menuId)))

  if (!existingItem) {
    throw createError({
      statusCode: 404,
      data: {
        error: {
          message: 'Menu item not found or does not belong to this menu',
          code: 'NOT_FOUND',
        },
      },
    })
  }

  // Delete the item (children are auto-deleted via FK cascade)
  await db.delete(publisherMenuItems).where(eq(publisherMenuItems.id, itemId))

  return { data: null }
})
