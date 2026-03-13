import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { verifyTOTP } from '../../../../utils/publisher/totp'
import { assertFeatureEnabled } from '../../../../utils/publisher/features'

const disableSchema = z.object({
  token: z.string().length(6, 'TOTP code must be 6 digits'),
})

/**
 * POST /api/publisher/auth/totp/disable
 *
 * Disable TOTP authentication for the current user.
 * Requires a valid TOTP code to confirm the action,
 * preventing unauthorized disabling of 2FA.
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
  const parsed = disableSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid TOTP code. Please enter a 6-digit code.', code: 'VALIDATION_ERROR' } },
    })
  }

  const { token } = parsed.data

  const db = await getDb() as any
  const { publisherTOTPSecrets, publisherUsers } = await getSchema()

  // Find the user's TOTP record
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

  // Verify the TOTP code one last time
  const isValid = verifyTOTP(token, totpRecord.secret)
  if (!isValid) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid TOTP code. Please check your authenticator app.', code: 'INVALID_TOTP' } },
    })
  }

  // Delete the TOTP record
  await db
    .delete(publisherTOTPSecrets)
    .where(eq(publisherTOTPSecrets.userId, user.id))

  // Reset auth method to password
  await db
    .update(publisherUsers)
    .set({ authMethod: 'password' })
    .where(eq(publisherUsers.id, user.id))

  return {
    success: true,
    message: 'TOTP authenticator has been disabled.',
  }
})
