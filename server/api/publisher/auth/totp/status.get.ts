import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { isFeatureEnabled } from '../../../../utils/publisher/features'

/**
 * GET /api/publisher/auth/totp/status
 *
 * Check if the current user has TOTP enabled.
 * Returns { enabled: boolean, featureEnabled: boolean }.
 *
 * If the TOTP feature flag is disabled, returns { enabled: false, featureEnabled: false }.
 *
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  // If TOTP feature is disabled, return early
  if (!isFeatureEnabled('totp')) {
    return { enabled: false, featureEnabled: false }
  }
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
