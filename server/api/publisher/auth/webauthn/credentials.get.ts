import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'

/**
 * GET /api/publisher/auth/webauthn/credentials
 *
 * List the authenticated user's WebAuthn credentials (passkeys).
 * Used by the security settings page to display registered passkeys.
 *
 * Requires the `webauthn` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag
  // Require authentication
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const db = await getDb() as any
  const { publisherWebAuthnCredentials } = await getSchema()

  const credentials = await db
    .select({
      id: publisherWebAuthnCredentials.id,
      deviceName: publisherWebAuthnCredentials.deviceName,
      createdAt: publisherWebAuthnCredentials.createdAt,
      lastUsedAt: publisherWebAuthnCredentials.lastUsedAt,
    })
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.userId, user.id))

  return { credentials }
})
