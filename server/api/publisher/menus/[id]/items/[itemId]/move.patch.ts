import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for moving an item
const moveSchema = z
  .object({
    parentId: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine((data) => data.parentId !== undefined || data.sortOrder !== undefined, {
    message: 'At least one of parentId or sortOrder must be provided',
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

  // Validate item ID parameter
  const itemId = Number(getRouterParam(event, 'itemId'))
  if (!itemId || isNaN(itemId)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid item ID', code: 'INVALID_PARAM' } },
    })
  }

  const body = await readBody(event)
  const parsed = moveSchema.safeParse(body)

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

  // Validate parent if provided
  if (parsed.data.parentId !== undefined && parsed.data.parentId !== null) {
    // Prevent circular reference (item cannot be its own parent)
    if (parsed.data.parentId === itemId) {
      throw createError({
        statusCode: 400,
        data: {
          error: {
            message: 'An item cannot be its own parent',
            code: 'CIRCULAR_REFERENCE',
          },
        },
      })
    }

    // Check parent exists and belongs to same menu
    const [parentItem] = await db
      .select()
      .from(publisherMenuItems)
      .where(
        and(eq(publisherMenuItems.id, parsed.data.parentId), eq(publisherMenuItems.menuId, menuId))
      )

    if (!parentItem) {
      throw createError({
        statusCode: 400,
        data: {
          error: {
            message: 'Parent item not found or does not belong to this menu',
            code: 'INVALID_PARENT',
          },
        },
      })
    }

    // Check for circular reference through ancestors
    // Walk up the parent chain to ensure the item isn't trying to become an ancestor of itself
    let currentParentId: number | null = parsed.data.parentId
    const visited = new Set<number>([itemId])
    
    while (currentParentId !== null) {
      if (visited.has(currentParentId)) {
        // This shouldn't happen with proper data, but safety check
        throw createError({
          statusCode: 400,
          data: {
            error: {
              message: 'Circular reference detected in parent chain',
              code: 'CIRCULAR_REFERENCE',
            },
          },
        })
      }
      visited.add(currentParentId)

      const [ancestor] = await db
        .select()
        .from(publisherMenuItems)
        .where(eq(publisherMenuItems.id, currentParentId))

      if (!ancestor) break

      // If we find the current item in the ancestor chain, it's a circular reference
      if (ancestor.id === itemId) {
        throw createError({
          statusCode: 400,
          data: {
            error: {
              message: 'Cannot move item: would create a circular reference',
              code: 'CIRCULAR_REFERENCE',
            },
          },
        })
      }

      currentParentId = ancestor.parentId
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {}

  if (parsed.data.parentId !== undefined) {
    updates.parentId = parsed.data.parentId
  }
  if (parsed.data.sortOrder !== undefined) {
    updates.sortOrder = parsed.data.sortOrder
  }

  // Perform the update
  await db.update(publisherMenuItems).set(updates).where(eq(publisherMenuItems.id, itemId))

  // Fetch the updated item
  const [updatedItem] = await db
    .select()
    .from(publisherMenuItems)
    .where(eq(publisherMenuItems.id, itemId))

  return {
    data: {
      id: updatedItem!.id,
      menuId: updatedItem!.menuId,
      parentId: updatedItem!.parentId,
      sortOrder: updatedItem!.sortOrder,
      label: updatedItem!.label,
      type: updatedItem!.type,
      pageId: updatedItem!.metadata?.pageId ?? null,
      url: updatedItem!.url,
      target: updatedItem!.target,
      icon: updatedItem!.icon,
      cssClass: updatedItem!.cssClass,
      visible: updatedItem!.visible,
      metadata: updatedItem!.metadata,
      createdAt: updatedItem!.createdAt,
      updatedAt: updatedItem!.updatedAt,
    },
  }
})
