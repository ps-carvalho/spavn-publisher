import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { verifyTOTP, verifyBackupCode } from '../../../../utils/publisher/totp'
import { createSessionToken } from '../../../../utils/publisher/auth'
import { checkRateLimit } from '../../../../utils/publisher/rateLimit'
import { trackDeviceLogin } from '../../../../utils/publisher/deviceTracking'
import { assertFeatureEnabled } from '../../../../utils/publisher/features'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  token: z.string().min(1, 'Code is required'),
})

/**
 * POST /api/publisher/auth/totp/login
 *
 * Authenticate a user with their email and TOTP code.
 * Also accepts backup codes as a fallback.
 *
 * If a backup code is used, it is consumed (removed from
 * the stored hashed codes) to prevent reuse.
 *
 * Rate limited: 5 attempts per email per hour.
 * Requires the `totp` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag
  assertFeatureEnabled('totp', 'TOTP')
  const body = await readBody(event)

  // Validate input
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid request', code: 'VALIDATION_ERROR' } },
    })
  }

  const { email, token } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Rate limit: 5 attempts per email per hour
  await checkRateLimit(`totp-login:${normalizedEmail}`, {
    max: 5,
    windowMs: 60 * 60 * 1000,
  })

  const db = await getDb() as any
  const { publisherUsers, publisherTOTPSecrets } = await getSchema()

  // Find user by email
  const [user] = await db
    .select()
    .from(publisherUsers)
    .where(eq(publisherUsers.email, normalizedEmail))
    .limit(1)

  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid email or code', code: 'INVALID_CREDENTIALS' } },
    })
  }

  // Check if user is active
  if (!user.isActive) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Account is deactivated', code: 'ACCOUNT_INACTIVE' } },
    })
  }

  // Check if user has TOTP enabled
  const [totpRecord] = await db
    .select()
    .from(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, user.id))
    .limit(1)

  if (!totpRecord) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'TOTP is not set up for this account', code: 'TOTP_NOT_ENABLED' } },
    })
  }

  // Try TOTP verification first (6-digit codes)
  let authenticated = false
  const isStandardTOTP = /^\d{6}$/.test(token)

  if (isStandardTOTP) {
    authenticated = verifyTOTP(token, totpRecord.secret)
  }

  // If TOTP didn't match, try backup code
  if (!authenticated) {
    const backupCodes: string[] = totpRecord.backupCodes || []
    const matchIndex = verifyBackupCode(token, backupCodes)

    if (matchIndex >= 0) {
      authenticated = true

      // Remove the used backup code
      const updatedCodes = [...backupCodes]
      updatedCodes.splice(matchIndex, 1)

      await db
        .update(publisherTOTPSecrets)
        .set({ backupCodes: updatedCodes })
        .where(eq(publisherTOTPSecrets.id, totpRecord.id))
    }
  }

  if (!authenticated) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid code. Please check your authenticator app or use a backup code.', code: 'INVALID_TOTP' } },
    })
  }

  // Update lastUsedAt timestamp
  await db
    .update(publisherTOTPSecrets)
    .set({ lastUsedAt: new Date() })
    .where(eq(publisherTOTPSecrets.id, totpRecord.id))

  // Create JWT session token
  const { token: sessionToken } = await createSessionToken(user.id, user.role)

  // Set httpOnly cookie (same as login endpoint)
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
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  }
})
