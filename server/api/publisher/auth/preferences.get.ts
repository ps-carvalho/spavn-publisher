import { eq, count } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'

/**
 * GET /api/publisher/auth/preferences
 *
 * Get the current user's authentication preferences and status.
 * Returns information about which auth methods are enabled,
 * the preferred auth method, and credential counts.
 *
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const db = await getDb() as any
  const {
    publisherUsers,
    publisherWebAuthnCredentials,
    publisherTOTPSecrets,
  } = await getSchema()

  // Fetch full user record for auth fields
  const [fullUser] = await db
    .select({
      id: publisherUsers.id,
      email: publisherUsers.email,
      authMethod: publisherUsers.authMethod,
      emailVerified: publisherUsers.emailVerified,
      password: publisherUsers.password,
    })
    .from(publisherUsers)
    .where(eq(publisherUsers.id, user.id))
    .limit(1)

  if (!fullUser) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'User not found', code: 'NOT_FOUND' } },
    })
  }

  // Count WebAuthn credentials
  const [webauthnResult] = await db
    .select({ count: count() })
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.userId, user.id))

  const webauthnCount = webauthnResult?.count ?? 0

  // Check if TOTP is enabled
  const [totpRecord] = await db
    .select({ id: publisherTOTPSecrets.id })
    .from(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, user.id))
    .limit(1)

  return {
    authMethod: fullUser.authMethod || 'password',
    emailVerified: fullUser.emailVerified || null,
    hasPassword: !!fullUser.password,
    hasWebAuthn: webauthnCount > 0,
    hasTOTP: !!totpRecord,
    webauthnCredentials: webauthnCount,
  }
})
