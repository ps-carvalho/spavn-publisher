import { getDb, getSchema } from '../../../utils/publisher/database'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

// Validation schema for updating a menu
// All fields are optional, and nullable fields allow null values
const updateMenuSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayName: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only')
    .optional(),
  description: z.string().max(500).nullable().optional(),
  location: z.string().max(100).nullable().optional(),
})

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

  const body = await readBody(event)
  const parsed = updateMenuSchema.safeParse(body)

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
  const { publisherMenus } = await getSchema()

  // Check if menu exists
  const [existingMenu] = await db
    .select()
    .from(publisherMenus)
    .where(eq(publisherMenus.id, id))

  if (!existingMenu) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Menu not found', code: 'NOT_FOUND' } },
    })
  }

  // Build update object - only include fields that were provided
  const updates: Record<string, unknown> = {}

  // Note: displayName is validated but not stored in the schema
  // (it's for frontend use only, mapped to 'name' field)
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.slug !== undefined) updates.slug = parsed.data.slug
  if (parsed.data.description !== undefined) updates.description = parsed.data.description
  if (parsed.data.location !== undefined) updates.location = parsed.data.location

  // Check if there's anything to update
  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No fields to update', code: 'EMPTY_UPDATE' } },
    })
  }

  // If slug is being updated, check for uniqueness
  if (parsed.data.slug !== undefined && parsed.data.slug !== existingMenu.slug) {
    const [slugExists] = await db
      .select()
      .from(publisherMenus)
      .where(eq(publisherMenus.slug, parsed.data.slug))

    if (slugExists) {
      throw createError({
        statusCode: 409,
        data: {
          error: {
            message: 'A menu with this slug already exists',
            code: 'DUPLICATE_SLUG',
          },
        },
      })
    }
  }

  // Perform the update
  await db.update(publisherMenus).set(updates).where(eq(publisherMenus.id, id))

  // Fetch the updated menu
  const [updatedMenu] = await db
    .select()
    .from(publisherMenus)
    .where(eq(publisherMenus.id, id))

  return {
    data: {
      id: updatedMenu!.id,
      name: updatedMenu!.name,
      slug: updatedMenu!.slug,
      description: updatedMenu!.description,
      location: updatedMenu!.location,
      createdAt: updatedMenu!.createdAt,
      updatedAt: updatedMenu!.updatedAt,
    },
  }
})
