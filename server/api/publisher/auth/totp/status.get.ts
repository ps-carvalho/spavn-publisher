import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'

/**
 * GET /api/publisher/auth/totp/status
 *
 * Check if the current user has TOTP enabled.
 * Returns { enabled: boolean }.
 *
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const db = await getDb() as any
  const { publisherTOTPSecrets } = await getSchema()

  const [totpRecord] = await db
    .select({ id: publisherTOTPSecrets.id })
    .from(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, user.id))
    .limit(1)

  return {
    enabled: !!totpRecord,
  }
})
