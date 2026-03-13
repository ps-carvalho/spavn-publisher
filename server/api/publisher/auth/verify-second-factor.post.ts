import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { verifySessionToken, createSessionToken } from '../../../utils/publisher/auth'
import { verifyTOTP, verifyBackupCode } from '../../../utils/publisher/totp'
import { trackDeviceLogin } from '../../../utils/publisher/deviceTracking'
import { verifyAuthentication } from '../../../utils/publisher/webauthn'
import { getAndDeleteChallenge } from '../../../utils/publisher/challengeStore'

const verifySchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('totp'),
    code: z.string().min(1, 'Code is required'),
  }),
  z.object({
    type: z.literal('passkey'),
    response: z.any(),
  }),
])

/**
 * POST /api/publisher/auth/verify-second-factor
 *
 * Verifies the second factor (TOTP or Passkey) and completes login.
 * Requires a valid "pending-2fa" session cookie.
 *
 * On success:
 * - Validates the second factor
 * - Creates a full session
 * - Clears the pending-2fa cookie
 * - Sets the publisher-session cookie
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

  // Parse and validate request body
  const body = await readBody(event)
  const parsed = verifySchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid request', code: 'VALIDATION_ERROR' } },
    })
  }

  const db = await getDb() as any
  const { publisherUsers, publisherTOTPSecrets, publisherWebAuthnCredentials } = await getSchema()

  // Fetch the user
  const [user] = await db
    .select({
      id: publisherUsers.id,
      email: publisherUsers.email,
      firstName: publisherUsers.firstName,
      lastName: publisherUsers.lastName,
      role: publisherUsers.role,
      isActive: publisherUsers.isActive,
    })
    .from(publisherUsers)
    .where(eq(publisherUsers.id, payload.userId))
    .limit(1)

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Account not found or deactivated', code: 'ACCOUNT_INACTIVE' } },
    })
  }

  let verified = false

  if (parsed.data.type === 'totp') {
    // Get TOTP secret
    const [totpRecord] = await db
      .select()
      .from(publisherTOTPSecrets)
      .where(eq(publisherTOTPSecrets.userId, user.id))
      .limit(1)

    if (!totpRecord) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'TOTP not configured', code: 'TOTP_NOT_ENABLED' } },
      })
    }

    // Try TOTP verification (6-digit codes)
    const isStandardTOTP = /^\d{6}$/.test(parsed.data.code)

    if (isStandardTOTP) {
      verified = verifyTOTP(parsed.data.code, totpRecord.secret)
    }

    // If TOTP didn't match, try backup code
    if (!verified) {
      const backupCodes: string[] = totpRecord.backupCodes || []
      const matchIndex = verifyBackupCode(parsed.data.code, backupCodes)

      if (matchIndex >= 0) {
        verified = true

        // Remove the used backup code
        const updatedCodes = [...backupCodes]
        updatedCodes.splice(matchIndex, 1)

        await db
          .update(publisherTOTPSecrets)
          .set({ backupCodes: updatedCodes })
          .where(eq(publisherTOTPSecrets.id, totpRecord.id))
      }
    }

    // Update last used timestamp
    if (verified) {
      await db
        .update(publisherTOTPSecrets)
        .set({ lastUsedAt: new Date() })
        .where(eq(publisherTOTPSecrets.id, totpRecord.id))
    }
  }
  else if (parsed.data.type === 'passkey') {
    // Get the credential by ID from the response
    const credentialID = parsed.data.response?.id
    if (!credentialID) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Missing credential ID', code: 'INVALID_RESPONSE' } },
      })
    }

    // Retrieve the stored challenge for this 2FA attempt
    const expectedChallenge = getAndDeleteChallenge(`webauthn-2fa:${user.id}`)
    if (!expectedChallenge) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Challenge expired or not found. Please try again.', code: 'CHALLENGE_EXPIRED' } },
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
    console.log('[Publisher] WebAuthn 2FA verification:', {
      userId: user.id,
      credentialId: credential.id,
      expectedChallenge,
      hasResponse: !!parsed.data.response,
    })

    try {
      const verification = await verifyAuthentication(
        parsed.data.response,
        expectedChallenge,
        credential.publicKey,
        credential.counter,
        credential.id,
      )

      verified = verification.verified

      if (verified) {
        // Update the counter
        await db
          .update(publisherWebAuthnCredentials)
          .set({
            counter: verification.authenticationInfo.newCounter,
            lastUsedAt: new Date(),
          })
          .where(eq(publisherWebAuthnCredentials.id, credential.id))
      }
    }
    catch (err: any) {
      console.error('[Publisher] Passkey verification failed:', err)
      verified = false
    }
  }

  if (!verified) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid code or passkey', code: 'VERIFICATION_FAILED' } },
    })
  }

  // Clear the pending-2fa cookie
  deleteCookie(event, 'publisher-2fa-pending', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })

  // Create full session
  const { token: sessionToken } = await createSessionToken(user.id, user.role)

  setCookie(event, 'publisher-session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })

  // Track device login (async, non-blocking)
  trackDeviceLogin(event, user.id, user.email).catch(() => {})

  return {
    success: true,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  }
})
