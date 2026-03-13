import { getDb, getSchema } from '../../../utils/publisher/database'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const db = await getDb()
  const { publisherWebhooks } = await getSchema()

  const webhooks = await db
    .select()
    .from(publisherWebhooks)
    .orderBy(desc(publisherWebhooks.createdAt))

  return {
    data: webhooks.map((wh) => ({
      id: wh.id,
      name: wh.name,
      url: wh.url,
      events: wh.events,
      isActive: wh.isActive,
      createdAt: wh.createdAt,
      // Don't expose secret in list
    })),
  }
})
