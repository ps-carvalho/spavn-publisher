import { eq, and, sql } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for creating a menu item
const createMenuItemSchema = z
  .object({
    label: z.string().min(1).max(255),
    type: z.enum(['page', 'external', 'label']),
    pageId: z.number().int().positive().optional(),
    url: z.string().max(500).optional(),
    target: z.enum(['_blank', '_self']).optional(),
    icon: z.string().max(100).optional(),
    cssClass: z.string().max(100).optional(),
    visible: z.boolean().optional(),
    metadata: z.record(z.any()).optional(),
    parentId: z.number().int().positive().nullable().optional(),
    sortOrder: z.number().int().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'page' && !data.pageId) {
        return false // pageId required for page type
      }
      if (data.type === 'external' && !data.url) {
        return false // url required for external type
      }
      return true
    },
    {
      message: 'Type-specific field required: pageId for page type, url for external type',
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

  const body = await readBody(event)
  const parsed = createMenuItemSchema.safeParse(body)

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

  // Validate parent if provided
  if (parsed.data.parentId) {
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
  }

  // Calculate default sort order if not provided
  let sortOrder = parsed.data.sortOrder
  if (sortOrder === undefined) {
    // Get max sort_order for items in this menu with same parent
    const parentIdCondition = parsed.data.parentId
      ? sql`parent_id = ${parsed.data.parentId}`
      : sql`parent_id IS NULL`

    const [maxSortResult] = await db
      .select({ maxSort: sql<number>`COALESCE(MAX(sort_order), -1)` })
      .from(publisherMenuItems)
      .where(sql`${publisherMenuItems.menuId} = ${menuId} AND ${parentIdCondition}`)

    sortOrder = (maxSortResult?.maxSort ?? -1) + 1
  }

  // Build metadata object, including pageId if type is 'page'
  const metadata: Record<string, unknown> = {
    ...parsed.data.metadata,
  }
  if (parsed.data.type === 'page' && parsed.data.pageId) {
    metadata.pageId = parsed.data.pageId
  }

  // Create the menu item
  const result = await db.insert(publisherMenuItems).values({
    menuId,
    parentId: parsed.data.parentId ?? null,
    sortOrder,
    label: parsed.data.label,
    type: parsed.data.type,
    url: parsed.data.url ?? null,
    target: parsed.data.target ?? null,
    icon: parsed.data.icon ?? null,
    cssClass: parsed.data.cssClass ?? null,
    visible: parsed.data.visible ?? true,
    metadata: Object.keys(metadata).length > 0 ? metadata : null,
  })

  const insertedId = Number(result.lastInsertRowid)

  // Fetch the created item
  const [createdItem] = await db
    .select()
    .from(publisherMenuItems)
    .where(eq(publisherMenuItems.id, insertedId))

  // Set response status to 201 Created
  setResponseStatus(event, 201)

  return {
    data: {
      id: createdItem!.id,
      menuId: createdItem!.menuId,
      parentId: createdItem!.parentId,
      sortOrder: createdItem!.sortOrder,
      label: createdItem!.label,
      type: createdItem!.type,
      pageId: createdItem!.metadata?.pageId ?? null,
      url: createdItem!.url,
      target: createdItem!.target,
      icon: createdItem!.icon,
      cssClass: createdItem!.cssClass,
      visible: createdItem!.visible,
      metadata: createdItem!.metadata,
      createdAt: createdItem!.createdAt,
      updatedAt: createdItem!.updatedAt,
    },
  }
})
