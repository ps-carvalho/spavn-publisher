import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../../utils/publisher/database'
import { generateRegistrationOpts, getWebAuthnConfig } from '../../../../../utils/publisher/webauthn'
import { storeChallenge } from '../../../../../utils/publisher/challengeStore'
import { checkRateLimit } from '../../../../../utils/publisher/rateLimit'
import { assertFeatureEnabled } from '../../../../../utils/publisher/features'

/**
 * POST /api/publisher/auth/webauthn/register/options
 *
 * Generate WebAuthn registration options for the authenticated user.
 * The user must be logged in to register a new passkey.
 *
 * Rate limited: 5 requests per user per hour.
 * Requires the `webauthn` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag
  assertFeatureEnabled('webauthn', 'WebAuthn/Passkey')
  // Require authentication (middleware sets event.context.publisherUser)
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Rate limit: 5 registration attempts per user per hour
  await checkRateLimit(`webauthn-register:${user.id}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  })

  const db = await getDb() as any
  const { publisherWebAuthnCredentials } = await getSchema()

  // Get user's existing WebAuthn credentials
  const existingCredentials = await db
    .select({
      id: publisherWebAuthnCredentials.id,
      transports: publisherWebAuthnCredentials.transports,
    })
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.userId, user.id))

  // Generate registration options
  const options = await generateRegistrationOpts(
    user.id,
    user.email,
    existingCredentials,
  )

  // Log WebAuthn config for debugging
  const config = getWebAuthnConfig()
  console.log('[Publisher] WebAuthn registration options:', {
    rpID: config.rpID,
    origin: config.origin,
    challenge: options.challenge,
  })

  // Store the challenge for verification (60 second TTL)
  storeChallenge(`webauthn-register:${user.id}`, options.challenge, 60_000)

  return options
})
