import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { verifySessionToken } from '../../../utils/publisher/auth'

/**
 * GET /api/publisher/auth/second-factor-methods
 *
 * Returns the available second-factor authentication methods for the current user.
 * Requires a valid "pending-2fa" session cookie (set after magic link verification).
 */
export default defineEventHandler(async (event) => {
  // Get the pending-2fa token from cookie
  const pendingToken = getCookie(event, 'publisher-2fa-pending')

  if (!pendingToken) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Verify the pending token
  const payload = await verifySessionToken(pendingToken)

  if (!payload || payload.authState !== 'pending-2fa') {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid or expired session', code: 'INVALID_SESSION' } },
    })
  }

  const db = await getDb() as any
  const { publisherTOTPSecrets, publisherWebAuthnCredentials } = await getSchema()

  // Check what 2FA methods the user has configured
  const methods: ('totp' | 'passkey')[] = []

  // Check for TOTP
  const [totpRecord] = await db
    .select({ id: publisherTOTPSecrets.id })
    .from(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, payload.userId))
    .limit(1)

  if (totpRecord) {
    methods.push('totp')
  }

  // Check for Passkey
  const [webAuthnRecord] = await db
    .select({ id: publisherWebAuthnCredentials.id })
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.userId, payload.userId))
    .limit(1)

  if (webAuthnRecord) {
    methods.push('passkey')
  }

  return {
    methods,
  }
})
