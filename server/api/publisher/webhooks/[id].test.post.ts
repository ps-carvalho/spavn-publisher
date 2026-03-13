import { getDb, getSchema } from '../../../utils/publisher/database'
import { eq } from 'drizzle-orm'
import { sendTestWebhook } from '../../../utils/publisher/webhooks'

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

  const [webhook] = await db
    .select()
    .from(publisherWebhooks)
    .where(eq(publisherWebhooks.id, id))

  if (!webhook) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Webhook not found', code: 'NOT_FOUND' } },
    })
  }

  const result = await sendTestWebhook(webhook)

  return {
    data: {
      statusCode: result.statusCode,
      responseBody: result.responseBody,
      success: result.statusCode >= 200 && result.statusCode < 300,
    },
  }
})
