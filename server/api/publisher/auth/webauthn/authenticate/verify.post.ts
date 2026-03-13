import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../../utils/publisher/database'
import { verifyAuthentication } from '../../../../../utils/publisher/webauthn'
import { getAndDeleteChallenge } from '../../../../../utils/publisher/challengeStore'
import { createSessionToken } from '../../../../../utils/publisher/auth'
import { trackDeviceLogin } from '../../../../../utils/publisher/deviceTracking'
import { assertFeatureEnabled } from '../../../../../utils/publisher/features'

const verifySchema = z.object({
  response: z.any(),
  email: z.string().email('Invalid email address'),
})

/**
 * POST /api/publisher/auth/webauthn/authenticate/verify
 *
 * Verify a WebAuthn authentication response and create a session.
 * This completes the passkey login flow.
 *
 * Requires the `webauthn` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag
  assertFeatureEnabled('webauthn', 'WebAuthn/Passkey')
  const body = await readBody(event)

  // Validate input
  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid request', code: 'VALIDATION_ERROR' } },
    })
  }

  const { response, email } = parsed.data

  // Retrieve the stored challenge
  const expectedChallenge = getAndDeleteChallenge(`webauthn-auth:${email.toLowerCase()}`)
  if (!expectedChallenge) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Challenge expired or not found. Please try again.', code: 'CHALLENGE_EXPIRED' } },
    })
  }

  const db = await getDb() as any
  const { publisherUsers, publisherWebAuthnCredentials } = await getSchema()

  // Find user by email
  const [user] = await db
    .select()
    .from(publisherUsers)
    .where(eq(publisherUsers.email, email.toLowerCase()))
    .limit(1)

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } },
    })
  }

  // Get the credential by ID from the response
  const credentialID = response.id
  if (!credentialID) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing credential ID in response', code: 'INVALID_RESPONSE' } },
    })
  }

  const [credential] = await db
    .select()
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.id, credentialID))
    .limit(1)

  if (!credential || credential.userId !== user.id) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' } },
    })
  }

  // Verify the authentication response
  let verification
  try {
    verification = await verifyAuthentication(
      response,
      expectedChallenge,
      credential.publicKey,
      credential.counter,
      credential.id,
    )
  }
  catch (err) {
    console.error('[Publisher] WebAuthn authentication verification failed:', err)
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication verification failed', code: 'VERIFICATION_FAILED' } },
    })
  }

  if (!verification.verified) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication verification failed', code: 'VERIFICATION_FAILED' } },
    })
  }

  // Update the counter in the database (anti-replay protection)
  const { authenticationInfo } = verification
  await db
    .update(publisherWebAuthnCredentials)
    .set({
      counter: authenticationInfo.newCounter,
      lastUsedAt: new Date(),
    })
    .where(eq(publisherWebAuthnCredentials.id, credential.id))

  // Create JWT session token
  const { token } = await createSessionToken(user.id, user.role)

  // Set httpOnly cookie (same as login endpoint)
  setCookie(event, 'publisher-session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  // Track device login (async, non-blocking)
  trackDeviceLogin(event, user.id, user.email).catch(() => {})

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  }
})
