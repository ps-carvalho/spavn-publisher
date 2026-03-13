import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for batch reorder
const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.number().int().positive(),
        sortOrder: z.number().int(),
      })
    )
    .min(1),
})

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

  const body = await readBody(event)
  const parsed = reorderSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues,
        },
      },
    })
  }

  const db = await getDb()
  const { publisherMenus, publisherMenuItems } = await getSchema()

  // Check if menu exists
  const [existingMenu] = await db
    .select()
    .from(publisherMenus)
    .where(eq(publisherMenus.id, menuId))

  if (!existingMenu) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Menu not found', code: 'NOT_FOUND' } },
    })
  }

  // Get all item IDs to update
  const itemIds = parsed.data.items.map((item) => item.id)

  // Verify all items belong to this menu
  const existingItems = await db
    .select()
    .from(publisherMenuItems)
    .where(
      and(eq(publisherMenuItems.menuId, menuId), inArray(publisherMenuItems.id, itemIds))
    )

  if (existingItems.length !== itemIds.length) {
    const foundIds = new Set(existingItems.map((item) => item.id))
    const missingIds = itemIds.filter((id) => !foundIds.has(id))

    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: `Some items do not exist or do not belong to this menu: ${missingIds.join(', ')}`,
          code: 'INVALID_ITEMS',
        },
      },
    })
  }

  // Batch update sort_order for all items
  // We do this sequentially to ensure consistency
  let updatedCount = 0
  for (const item of parsed.data.items) {
    await db
      .update(publisherMenuItems)
      .set({ sortOrder: item.sortOrder })
      .where(eq(publisherMenuItems.id, item.id))
    updatedCount++
  }

  return {
    data: {
      updated: updatedCount,
    },
  }
})
