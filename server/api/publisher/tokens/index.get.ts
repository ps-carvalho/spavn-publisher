import { getDb, getSchema } from '../../../utils/publisher/database'
import { desc } from 'drizzle-orm'

export default defineEventHandler(async () => {
   const db = await getDb()
   const { publisherApiTokens } = await getSchema()

  const tokens = await db
    .select({
      id: publisherApiTokens.id,
      name: publisherApiTokens.name,
      tokenPrefix: publisherApiTokens.tokenPrefix,
      scopes: publisherApiTokens.scopes,
      lastUsedAt: publisherApiTokens.lastUsedAt,
      expiresAt: publisherApiTokens.expiresAt,
      createdAt: publisherApiTokens.createdAt,
    })
    .from(publisherApiTokens)
    .orderBy(desc(publisherApiTokens.createdAt))

  return { data: tokens }
})
