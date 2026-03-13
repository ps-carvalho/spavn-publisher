import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../../utils/publisher/database'
import { generateAuthenticationOpts } from '../../../../../utils/publisher/webauthn'
import { storeChallenge } from '../../../../../utils/publisher/challengeStore'
import { checkRateLimit } from '../../../../../utils/publisher/rateLimit'
import { verifySessionToken } from '../../../../../utils/publisher/auth'

const optionsSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
})

/**
 * POST /api/publisher/auth/webauthn/authenticate/options
 *
 * Generate WebAuthn authentication options for a user.
 * Supports two modes:
 * 1. Email-based: User provides email (for 2FA flow after magic link)
 * 2. Pending-2FA session: User has pending-2fa cookie (for 2FA verification)
 *
 * Rate limited: 5 requests per email per hour.
 * Requires the `webauthn` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag

  const db = await getDb() as any
  const { publisherUsers, publisherWebAuthnCredentials } = await getSchema()

  let userId: number
  let userEmail: string

  // Try to get user from pending-2fa session first
  const pendingToken = getCookie(event, 'publisher-2fa-pending')
  if (pendingToken) {
    const payload = await verifySessionToken(pendingToken)
    if (payload && payload.authState === 'pending-2fa') {
      // Fetch user details
      const [user] = await db
        .select({
          id: publisherUsers.id,
          email: publisherUsers.email,
          isActive: publisherUsers.isActive,
        })
        .from(publisherUsers)
        .where(eq(publisherUsers.id, payload.userId))
        .limit(1)

      if (user && user.isActive) {
        userId = user.id
        userEmail = user.email
      } else {
        throw createError({
          statusCode: 401,
          data: { error: { message: 'Account not found', code: 'USER_NOT_FOUND' } },
        })
      }
    } else {
      throw createError({
        statusCode: 401,
        data: { error: { message: 'Invalid session', code: 'INVALID_SESSION' } },
      })
    }
  } else {
    // Fall back to email-based lookup
    const body = await readBody(event)

    // Validate input
    const parsed = optionsSchema.safeParse(body)
    if (!parsed.success || !parsed.data.email) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Invalid email address', code: 'VALIDATION_ERROR' } },
      })
    }

    const { email } = parsed.data
    userEmail = email.toLowerCase()

    // Rate limit: 5 authentication attempts per email per hour
    await checkRateLimit(`webauthn-auth:${userEmail}`, {
      max: 5,
      windowMs: 60 * 60 * 1000,
    })

    // Find user by email
    const [user] = await db
      .select({
        id: publisherUsers.id,
        email: publisherUsers.email,
        isActive: publisherUsers.isActive,
      })
      .from(publisherUsers)
      .where(eq(publisherUsers.email, userEmail))
      .limit(1)

    if (!user || !user.isActive) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'No passkeys found for this account', code: 'NO_PASSKEYS' } },
      })
    }

    userId = user.id
  }

  // Get user's WebAuthn credentials
  const credentials = await db
    .select({
      id: publisherWebAuthnCredentials.id,
      transports: publisherWebAuthnCredentials.transports,
    })
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.userId, userId))

  if (credentials.length === 0) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No passkeys found for this account', code: 'NO_PASSKEYS' } },
    })
  }

  // Generate authentication options
  const options = await generateAuthenticationOpts(credentials)

  // Store the challenge for verification (60 second TTL)
  // Key by userId so we can retrieve it during verify
  storeChallenge(`webauthn-2fa:${userId}`, options.challenge, 60_000)

  console.log('[Publisher] WebAuthn 2FA options generated:', {
    userId,
    challenge: options.challenge,
    allowCredentials: credentials.length,
  })

  return options
})
