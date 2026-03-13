import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { checkRateLimit } from '../../../utils/publisher/rateLimit'
import { getFeatures } from '../../../utils/publisher/features'

const identifySchema = z.object({
  email: z.string().email('Invalid email address'),
})

/**
 * Ensure consistent response timing to prevent timing attacks.
 * Waits until at least `minMs` milliseconds have passed since `start`.
 */
async function ensureMinTime(start: number, minMs: number): Promise<void> {
  const elapsed = Date.now() - start
  if (elapsed < minMs) {
    await new Promise(resolve => setTimeout(resolve, minMs - elapsed))
  }
}

interface IdentifyResponse {
  email: string
  method: 'magic-link'  // Always magic-link first
  hasSecondFactor: boolean
  secondFactorMethods: ('totp' | 'passkey')[]  // What 2FA methods are available
}

/**
 * Generate a generic magic-link only response.
 * Used for non-existent emails to prevent enumeration attacks.
 */
function getGenericResponse(email: string): IdentifyResponse {
  return {
    email,
    method: 'magic-link',
    hasSecondFactor: false,
    secondFactorMethods: [],
  }
}

/**
 * Migration path for existing password users:
 *
 * When requirePasswordless is true (the default):
 * - Password-only users will see magic-link as their auth method
 * - They receive a magic link email to verify their identity
 * - After clicking the link and logging in, they can set up passkey/TOTP from settings
 * - The hasPassword flag is still returned for informational purposes
 *
 * When requirePasswordless is false:
 * - Password is included in availableMethods
 * - Password-only users can still use password login (deprecated but functional)
 */

/**
 * POST /api/publisher/auth/identify
 *
 * Identifies a user by email and returns their configured authentication method.
 * Returns a generic response for non-existent emails to prevent enumeration.
 *
 * Rate limited: 5 requests per email per hour.
 */
export default defineEventHandler(async (event) => {
  const startTime = Date.now()
  const MIN_RESPONSE_TIME = 100 // 100ms minimum to mask timing differences

  const body = await readBody(event)

  // Validate input
  const parsed = identifySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid email address', code: 'VALIDATION_ERROR' } },
    })
  }

  const { email } = parsed.data
  const normalizedEmail = email.toLowerCase()

  // Rate limit: 5 requests per email per hour
  await checkRateLimit(`identify:${normalizedEmail}`, {
    max: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
  })

  // Get feature flags
  const features = getFeatures()

  try {
    const db = await getDb() as any
    const {
      publisherUsers,
      publisherWebAuthnCredentials,
      publisherTOTPSecrets,
    } = await getSchema()

    // Look up user by email (case-insensitive)
    const [user] = await db
      .select({
        id: publisherUsers.id,
        email: publisherUsers.email,
        isActive: publisherUsers.isActive,
      })
      .from(publisherUsers)
      .where(eq(publisherUsers.email, normalizedEmail))
      .limit(1)

    // If user doesn't exist or is inactive, return generic response (prevent enumeration)
    if (!user || !user.isActive) {
      await ensureMinTime(startTime, MIN_RESPONSE_TIME)
      return getGenericResponse(email)
    }

    // Check what second-factor authentication methods the user has set up
    const secondFactorMethods: ('totp' | 'passkey')[] = []

    // Check WebAuthn (passkey) credentials
    const [webauthnCredential] = await db
      .select({ id: publisherWebAuthnCredentials.id })
      .from(publisherWebAuthnCredentials)
      .where(eq(publisherWebAuthnCredentials.userId, user.id))
      .limit(1)

    const hasWebAuthn = !!webauthnCredential
    if (hasWebAuthn && features.enableWebAuthn) {
      secondFactorMethods.push('passkey')
    }

    // Check TOTP secret
    const [totpSecret] = await db
      .select({ id: publisherTOTPSecrets.id })
      .from(publisherTOTPSecrets)
      .where(eq(publisherTOTPSecrets.userId, user.id))
      .limit(1)

    const hasTOTP = !!totpSecret
    if (hasTOTP && features.enableTOTP) {
      secondFactorMethods.push('totp')
    }

    // Always use magic-link as first factor
    const response: IdentifyResponse = {
      email: user.email,
      method: 'magic-link',
      hasSecondFactor: secondFactorMethods.length > 0,
      secondFactorMethods,
    }

    await ensureMinTime(startTime, MIN_RESPONSE_TIME)
    return response
  }
  catch (err) {
    // If it's a rate limit error, re-throw it
    if ((err as any)?.statusCode === 429) {
      throw err
    }
    // Log unexpected errors but return generic response to prevent information leakage
    console.error('[Publisher] Identify endpoint error:', err)
    await ensureMinTime(startTime, MIN_RESPONSE_TIME)
    return getGenericResponse(email)
  }
})
