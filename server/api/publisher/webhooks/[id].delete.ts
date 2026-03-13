import { getDb, getSchema } from '../../../utils/publisher/database'
import { deleteWhere } from '../../../utils/publisher/database/queries'
import { eq } from 'drizzle-orm'

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

  // Delete logs first (foreign key), then webhook
  await deleteWhere('publisher_webhook_logs', 'webhook_id', id)

  await db
    .delete(publisherWebhooks)
    .where(eq(publisherWebhooks.id, id))

  return { data: null }
})
