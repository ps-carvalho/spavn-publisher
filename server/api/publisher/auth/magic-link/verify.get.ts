import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { hashMagicLinkToken } from '../../../../utils/publisher/magicLink'
import { createSessionToken } from '../../../../utils/publisher/auth'
import { trackDeviceLogin } from '../../../../utils/publisher/deviceTracking'

/**
 * GET /api/publisher/auth/magic-link/verify?token=xxx
 *
 * Verify a magic link token and create a session.
 * Sets an httpOnly session cookie and returns the user object.
 *
 * Token validation:
 * - Must exist in database
 * - Must not be expired (15-minute TTL)
 * - Must not have been used already (single-use)
 *
 * Requires the `magicLinks` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag
  const query = getQuery(event)
  const token = query.token as string | undefined

  if (!token || typeof token !== 'string') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing or invalid token', code: 'INVALID_TOKEN' } },
    })
  }

  // Hash the token to look up in database
  const tokenHash = hashMagicLinkToken(token)

  const db = await getDb() as any
  const { publisherMagicLinkTokens, publisherUsers } = await getSchema()

  // Look up token record
  const [tokenRecord] = await db
    .select()
    .from(publisherMagicLinkTokens)
    .where(eq(publisherMagicLinkTokens.tokenHash, tokenHash))
    .limit(1)

  if (!tokenRecord) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid or expired sign-in link', code: 'TOKEN_NOT_FOUND' } },
    })
  }

  // Check if token has already been used
  if (tokenRecord.usedAt) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'This sign-in link has already been used', code: 'TOKEN_USED' } },
    })
  }

  // Check if token has expired
  const expiresAt = new Date(tokenRecord.expiresAt)
  if (expiresAt.getTime() <= Date.now()) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'This sign-in link has expired. Please request a new one.', code: 'TOKEN_EXPIRED' } },
    })
  }

  // Mark token as used
  await db
    .update(publisherMagicLinkTokens)
    .set({ usedAt: new Date() })
    .where(eq(publisherMagicLinkTokens.tokenHash, tokenHash))

  // Fetch the user with their 2FA setup
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
    .where(eq(publisherUsers.id, tokenRecord.userId))
    .limit(1)

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Account not found or deactivated', code: 'ACCOUNT_INACTIVE' } },
    })
  }

  // Check if user has second factor configured
  const { publisherTOTPSecrets, publisherWebAuthnCredentials } = await getSchema()
  
  const [totpRecord] = await db
    .select({ id: publisherTOTPSecrets.id })
    .from(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, user.id))
    .limit(1)
  
  const [webAuthnRecord] = await db
    .select({ id: publisherWebAuthnCredentials.id })
    .from(publisherWebAuthnCredentials)
    .where(eq(publisherWebAuthnCredentials.userId, user.id))
    .limit(1)
  
  const hasSecondFactor = !!(totpRecord || webAuthnRecord)

  if (hasSecondFactor) {
    // Create temporary "pending-2fa" session
    const { token: pendingToken } = await createSessionToken(user.id, user.role, 'pending-2fa')
    
    // Set temporary cookie (short-lived, 5 minutes)
    setCookie(event, 'publisher-2fa-pending', pendingToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 5, // 5 minutes
    })

    // Return redirect to 2FA page
    return {
      requiresSecondFactor: true,
      redirectTo: '/admin/auth/second-factor',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    }
  }

  // No second factor required - complete login
  // Create JWT session token
  const { token: sessionToken } = await createSessionToken(user.id, user.role)

  // Set httpOnly cookie (same settings as login.post.ts)
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
    requiresSecondFactor: false,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  }
})
