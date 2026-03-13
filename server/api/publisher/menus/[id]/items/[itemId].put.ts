import { eq, and } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updating a menu item
const updateMenuItemSchema = z
  .object({
    label: z.string().min(1).max(255).optional(),
    type: z.enum(['page', 'external', 'label']).optional(),
    pageId: z.number().int().positive().nullable().optional(),
    url: z.string().max(500).nullable().optional(),
    target: z.enum(['_blank', '_self']).nullable().optional(),
    icon: z.string().max(100).nullable().optional(),
    cssClass: z.string().max(100).nullable().optional(),
    visible: z.boolean().optional(),
    metadata: z.record(z.any()).nullable().optional(),
    parentId: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.type === undefined) return true // Type not changing
      if (data.type === 'page' && data.pageId === null) return false
      if (data.type === 'external' && data.url === null) return false
      return true
    },
    {
      message:
        'Type-specific field cannot be null: pageId for page type, url for external type',
    }
  )

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
  const parsed = updateMenuItemSchema.safeParse(body)

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

  // Validate parent if provided and changed
  if (parsed.data.parentId !== undefined && parsed.data.parentId !== existingItem.parentId) {
    if (parsed.data.parentId !== null) {
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
    }
  }

  // Validate type-specific requirements when type is changing
  const newType = parsed.data.type ?? existingItem.type
  if (newType === 'page') {
    const pageId = parsed.data.pageId ?? existingItem.metadata?.pageId
    if (!pageId) {
      throw createError({
        statusCode: 400,
        data: {
          error: {
            message: 'pageId is required for page type items',
            code: 'VALIDATION_ERROR',
          },
        },
      })
    }
  } else if (newType === 'external') {
    const url = parsed.data.url ?? existingItem.url
    if (!url) {
      throw createError({
        statusCode: 400,
        data: {
          error: {
            message: 'url is required for external type items',
            code: 'VALIDATION_ERROR',
          },
        },
      })
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {}

  if (parsed.data.label !== undefined) updates.label = parsed.data.label
  if (parsed.data.type !== undefined) updates.type = parsed.data.type
  if (parsed.data.url !== undefined) updates.url = parsed.data.url
  if (parsed.data.target !== undefined) updates.target = parsed.data.target
  if (parsed.data.icon !== undefined) updates.icon = parsed.data.icon
  if (parsed.data.cssClass !== undefined) updates.cssClass = parsed.data.cssClass
  if (parsed.data.visible !== undefined) updates.visible = parsed.data.visible
  if (parsed.data.parentId !== undefined) updates.parentId = parsed.data.parentId
  if (parsed.data.sortOrder !== undefined) updates.sortOrder = parsed.data.sortOrder

  // Handle metadata and pageId
  if (parsed.data.metadata !== undefined || parsed.data.pageId !== undefined) {
    const existingMetadata = (existingItem.metadata as Record<string, unknown>) ?? {}
    const newMetadata = { ...existingMetadata, ...parsed.data.metadata }

    if (parsed.data.pageId !== undefined) {
      if (parsed.data.pageId === null) {
        delete newMetadata.pageId
      } else {
        newMetadata.pageId = parsed.data.pageId
      }
    }

    updates.metadata = Object.keys(newMetadata).length > 0 ? newMetadata : null
  }

  // Check if there's anything to update
  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No fields to update', code: 'EMPTY_UPDATE' } },
    })
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
