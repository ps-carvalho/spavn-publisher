import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { verifyTOTP, hashBackupCode } from '../../../../utils/publisher/totp'
import { getAndDeleteChallenge } from '../../../../utils/publisher/challengeStore'
import { assertFeatureEnabled } from '../../../../utils/publisher/features'

const verifySchema = z.object({
  token: z.string().length(6, 'TOTP code must be 6 digits'),
})

/**
 * POST /api/publisher/auth/totp/verify
 *
 * Complete TOTP setup by verifying the user can generate valid codes.
 *
 * Retrieves the temporarily stored secret from the challenge store,
 * verifies the provided TOTP code, then persists the secret and
 * hashed backup codes to the database.
 *
 * Requires authentication.
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

  const body = await readBody(event)

  // Validate input
  const parsed = verifySchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid TOTP code. Please enter a 6-digit code.', code: 'VALIDATION_ERROR' } },
    })
  }

  const { token } = parsed.data

  // Retrieve the temporarily stored secret
  const storedData = getAndDeleteChallenge(`totp-setup:${user.id}`)
  if (!storedData) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Setup session expired. Please start setup again.', code: 'SETUP_EXPIRED' } },
    })
  }

  const { secret, backupCodes } = JSON.parse(storedData) as { secret: string; backupCodes: string[] }

  // Verify the TOTP code
  const isValid = verifyTOTP(token, secret)
  if (!isValid) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid TOTP code. Please check your authenticator app and try again.', code: 'INVALID_TOTP' } },
    })
  }

  // Hash backup codes for secure storage
  const hashedBackupCodes = backupCodes.map(code => hashBackupCode(code))

  const db = await getDb() as any
  const { publisherTOTPSecrets, publisherUsers } = await getSchema()

  // Delete any existing TOTP secret for this user (re-setup)
  await db
    .delete(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, user.id))

  // Store the verified secret and hashed backup codes
  await db
    .insert(publisherTOTPSecrets)
    .values({
      userId: user.id,
      secret,
      backupCodes: hashedBackupCodes,
    })

  // Update user's auth method to 'totp'
  await db
    .update(publisherUsers)
    .set({ authMethod: 'totp' })
    .where(eq(publisherUsers.id, user.id))

  return {
    success: true,
    message: 'TOTP authenticator has been set up successfully.',
  }
})
