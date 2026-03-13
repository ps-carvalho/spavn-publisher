import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../../utils/publisher/database'
import { verifyRegistration, uint8ArrayToBase64url } from '../../../../../utils/publisher/webauthn'
import { getAndDeleteChallenge } from '../../../../../utils/publisher/challengeStore'

const verifySchema = z.object({
  response: z.any(),
  deviceName: z.string().max(255).optional(),
})

/**
 * POST /api/publisher/auth/webauthn/register/verify
 *
 * Verify a WebAuthn registration response and store the new credential.
 * The user must be logged in.
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

  const body = await readBody(event)

  // Validate input
  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid request', code: 'VALIDATION_ERROR' } },
    })
  }

  const { response, deviceName } = parsed.data

  // Retrieve the stored challenge
  const expectedChallenge = getAndDeleteChallenge(`webauthn-register:${user.id}`)
  if (!expectedChallenge) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Challenge expired or not found. Please try again.', code: 'CHALLENGE_EXPIRED' } },
    })
  }

  // Get request origin for debugging
  const requestOrigin = getRequestURL(event).origin
  console.log('[Publisher] WebAuthn registration - Request origin:', requestOrigin)
  console.log('[Publisher] WebAuthn registration - Expected challenge:', expectedChallenge)

  // Verify the registration response
  let verification
  try {
    verification = await verifyRegistration(response, expectedChallenge)
  }
  catch (err: any) {
    console.error('[Publisher] WebAuthn registration verification failed:', err)
    console.error('[Publisher] WebAuthn error details:', {
      message: err?.message,
      requestOrigin,
      expectedChallenge,
      responseOrigin: response?.clientExtensionResults,
    })
    throw createError({
      statusCode: 400,
      data: { error: { message: `Registration verification failed: ${err?.message || 'Unknown error'}`, code: 'VERIFICATION_FAILED' } },
    })
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Registration verification failed', code: 'VERIFICATION_FAILED' } },
    })
  }

  const { registrationInfo } = verification
  const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo

  // Store the credential in the database
  const db = await getDb() as any
  const { publisherWebAuthnCredentials } = await getSchema()

  // Check if credential already exists
  const [existing] = await db
    .select({ id: publisherWebAuthnCredentials.id })
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.id, credential.id))
    .limit(1)

  if (existing) {
    throw createError({
      statusCode: 409,
      data: { error: { message: 'This credential is already registered', code: 'CREDENTIAL_EXISTS' } },
    })
  }

  // Encode public key as base64url for storage
  const publicKeyBase64url = uint8ArrayToBase64url(credential.publicKey)

  await db.insert(publisherWebAuthnCredentials).values({
    id: credential.id,
    userId: user.id,
    publicKey: publicKeyBase64url,
    counter: credential.counter,
    transports: credential.transports || [],
    deviceName: deviceName || `${credentialDeviceType}${credentialBackedUp ? ' (backed up)' : ''}`,
    createdAt: new Date(),
  })

  return {
    success: true,
    credential: {
      id: credential.id,
      deviceName: deviceName || credentialDeviceType,
      createdAt: new Date(),
    },
  }
})
