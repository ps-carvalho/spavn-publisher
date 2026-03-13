import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { verifyTOTP, generateBackupCodes, hashBackupCode } from '../../../../utils/publisher/totp'
import { logAuthEvent } from '../../../../utils/publisher/audit'
import { checkRateLimit } from '../../../../utils/publisher/rateLimit'
import { assertFeatureEnabled } from '../../../../utils/publisher/features'

const regenerateSchema = z.object({
  token: z.string().length(6, 'TOTP code must be 6 digits'),
})

/**
 * POST /api/publisher/auth/backup-codes/regenerate
 *
 * Regenerate TOTP backup codes for the current user.
 * Requires a valid TOTP code for security verification.
 *
 * Generates a new set of 10 backup codes, hashes them for storage,
 * and returns the plaintext codes (shown only once to the user).
 *
 * Requires authentication and TOTP to be enabled.
 * Rate limited: 3 requests per user per hour.
 * Requires the `totp` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag
  assertFeatureEnabled('totp', 'TOTP')
  // Require authentication
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Rate limit: 3 regeneration attempts per user per hour
  await checkRateLimit(`backup-codes-regen:${user.id}`, {
    max: 3,
    windowMs: 60 * 60 * 1000,
  })

  const body = await readBody(event)

  // Validate input
  const parsed = regenerateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'Invalid TOTP code. Please enter a 6-digit code.',
          code: 'VALIDATION_ERROR',
        },
      },
    })
  }

  const { token } = parsed.data

  const db = await getDb() as any
  const { publisherTOTPSecrets } = await getSchema()

  // Find the user's TOTP record
  const [totpRecord] = await db
    .select()
    .from(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, user.id))
    .limit(1)

  if (!totpRecord) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'TOTP is not set up for this account. Set up an authenticator app first.',
          code: 'TOTP_NOT_ENABLED',
        },
      },
    })
  }

  // Verify the TOTP code for security
  const isValid = verifyTOTP(token, totpRecord.secret)
  if (!isValid) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'Invalid TOTP code. Please check your authenticator app and try again.',
          code: 'INVALID_TOTP',
        },
      },
    })
  }

  // Generate new backup codes
  const newBackupCodes = generateBackupCodes(10)
  const hashedBackupCodes = newBackupCodes.map(code => hashBackupCode(code))

  // Update the TOTP record with new hashed backup codes
  await db
    .update(publisherTOTPSecrets)
    .set({ backupCodes: hashedBackupCodes })
    .where(eq(publisherTOTPSecrets.userId, user.id))

  // Log the event
  await logAuthEvent(event, user.id, 'backup_codes_regenerated', {
    codesGenerated: newBackupCodes.length,
  })

  return {
    success: true,
    backupCodes: newBackupCodes,
    message: 'Backup codes have been regenerated. Save these codes in a safe place — they will only be shown once.',
  }
})
