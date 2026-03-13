import { getDb, getSchema } from '../../../utils/publisher/database'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const updateWebhookSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  url: z.string().url().max(500).optional(),
  events: z.array(z.string()).min(1).optional(),
  secret: z.string().max(255).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid webhook ID', code: 'INVALID_PARAM' } },
    })
  }

  const body = await readBody(event)
  const parsed = updateWebhookSchema.safeParse(body)

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
  const { publisherWebhooks } = await getSchema()

  // Check exists
  const [existing] = await db
    .select()
    .from(publisherWebhooks)
    .where(eq(publisherWebhooks.id, id))

  if (!existing) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Webhook not found', code: 'NOT_FOUND' } },
    })
  }

  // Build update
  const updates: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) updates.name = parsed.data.name
  if (parsed.data.url !== undefined) updates.url = parsed.data.url
  if (parsed.data.events !== undefined) updates.events = parsed.data.events
  if (parsed.data.secret !== undefined) updates.secret = parsed.data.secret
  if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive

  if (Object.keys(updates).length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No fields to update', code: 'EMPTY_UPDATE' } },
    })
  }

  await db
    .update(publisherWebhooks)
    .set(updates)
    .where(eq(publisherWebhooks.id, id))

  // Fetch updated
  const rows = await db
    .select()
    .from(publisherWebhooks)
    .where(eq(publisherWebhooks.id, id))

  const updated = rows[0]!

  return {
    data: {
      id: updated.id,
      name: updated.name,
      url: updated.url,
      events: updated.events,
      isActive: updated.isActive,
      createdAt: updated.createdAt,
    },
  }
})
