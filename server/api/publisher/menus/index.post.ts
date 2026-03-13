import { getDb, getSchema } from '../../../utils/publisher/database'
import { z } from 'zod'
import { eq } from 'drizzle-orm'

// Validation schema for creating a menu
const createMenuSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  description: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
})

export default defineEventHandler(async (event) => {
  // Auth check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const body = await readBody(event)
  const parsed = createMenuSchema.safeParse(body)

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

  // Check if slug already exists
  const [existingMenu] = await db
    .select()
    .from(publisherMenus)
    .where(eq(publisherMenus.slug, parsed.data.slug))

  if (existingMenu) {
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

  // Create the menu
  const result = await db.insert(publisherMenus).values({
    name: parsed.data.name,
    slug: parsed.data.slug,
    description: parsed.data.description || null,
    location: parsed.data.location || null,
  })

  const insertedId = Number(result.lastInsertRowid)

  // Set response status to 201 Created
  setResponseStatus(event, 201)

  return {
    data: {
      id: insertedId,
      name: parsed.data.name,
      displayName: parsed.data.displayName,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
    },
  }
})
