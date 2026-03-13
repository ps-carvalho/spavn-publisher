import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing token id', code: 'MISSING_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherApiTokens } = await getSchema()

  const [token] = await db
    .select()
    .from(publisherApiTokens)
    .where(eq(publisherApiTokens.id, Number(id)))
    .limit(1)

  if (!token) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Token not found', code: 'NOT_FOUND' } },
    })
  }

  await db
    .delete(publisherApiTokens)
    .where(eq(publisherApiTokens.id, Number(id)))

  return { ok: true }
})
