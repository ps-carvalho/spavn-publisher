import { getDb, getSchema } from '../../../utils/publisher/database'
import { z } from 'zod'
import { WEBHOOK_EVENTS, isAllowedWebhookUrl } from '../../../utils/publisher/webhooks'
import { randomBytes } from 'crypto'

const createWebhookSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url().max(500),
  events: z.array(z.string()).min(1, 'At least one event is required'),
  secret: z.string().max(255).optional(),
})

export default defineEventHandler(async (event) => {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const body = await readBody(event)
  const parsed = createWebhookSchema.safeParse(body)

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

  // Validate URL is not targeting internal/private addresses (SSRF protection)
  if (!isAllowedWebhookUrl(parsed.data.url)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Webhook URL must not target private or internal addresses', code: 'INVALID_URL' } },
    })
  }

  // Auto-generate secret if not provided
  const secret = parsed.data.secret || randomBytes(32).toString('hex')

  const db = await getDb()
  const { publisherWebhooks } = await getSchema()

  const result = await db.insert(publisherWebhooks).values({
    name: parsed.data.name,
    url: parsed.data.url,
    events: parsed.data.events,
    secret,
    isActive: true,
  })

  const insertedId = Number(result.lastInsertRowid)

  setResponseStatus(event, 201)

  return {
    data: {
      id: insertedId,
      name: parsed.data.name,
      url: parsed.data.url,
      events: parsed.data.events,
      secret, // Return secret only on creation
      isActive: true,
    },
  }
})
