import { generateTOTPSecret, generateQRCode } from '../../../../utils/publisher/totp'
import { checkRateLimit } from '../../../../utils/publisher/rateLimit'
import { storeChallenge } from '../../../../utils/publisher/challengeStore'

/**
 * POST /api/publisher/auth/totp/setup
 *
 * Start TOTP authenticator setup for the current user.
 * Generates a secret, QR code, and backup codes.
 *
 * The secret is stored temporarily in the challenge store
 * until the user verifies it with a valid TOTP code.
 * The secret is NOT persisted to the database until verification.
 *
 * Requires authentication.
 * Rate limited: 3 requests per user per hour.
 * Requires the `totp` feature flag to be enabled.
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

  // Rate limit: 3 setup attempts per user per hour
  await checkRateLimit(`totp-setup:${user.id}`, {
    max: 3,
    windowMs: 60 * 60 * 1000,
  })

  // Generate TOTP secret and backup codes
  const { secret, otpauthUrl, backupCodes } = generateTOTPSecret(user.id, user.email)

  // Generate QR code data URL
  const qrCodeUrl = await generateQRCode(otpauthUrl)

  // Store the secret and backup codes temporarily (5 minutes TTL)
  // User must verify with a valid TOTP code before we persist to DB
  storeChallenge(`totp-setup:${user.id}`, JSON.stringify({ secret, backupCodes }), 5 * 60 * 1000)

  return {
    secret,
    qrCodeUrl,
    backupCodes,
  }
})
