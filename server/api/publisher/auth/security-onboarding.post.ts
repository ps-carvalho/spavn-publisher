import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { setSetting } from '../../../utils/publisher/settings'

/**
 * POST /api/publisher/auth/security-onboarding
 *
 * Allows a user to dismiss the security onboarding prompt.
 * Only applicable when the prompt is non-required (advisory).
 * Required prompts cannot be dismissed unless 2FA is already configured.
 */
export default defineEventHandler(async (event) => {
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const body = await readBody(event)

  if (body.action === 'dismiss') {
    const db = await getDb() as any
    const { publisherSecurityPolicies, publisherTOTPSecrets, publisherWebAuthnCredentials } = await getSchema()

    // Check if role policy requires 2FA
    const [policy] = await db.select().from(publisherSecurityPolicies)
      .where(eq(publisherSecurityPolicies.role, user.role)).limit(1)

    if (policy?.require2FA) {
      // Only allow dismiss if user actually has 2FA configured
      const [totp] = await db.select({ id: publisherTOTPSecrets.id })
        .from(publisherTOTPSecrets).where(eq(publisherTOTPSecrets.userId, user.id)).limit(1)
      const [webauthn] = await db.select({ id: publisherWebAuthnCredentials.id })
        .from(publisherWebAuthnCredentials).where(eq(publisherWebAuthnCredentials.userId, user.id)).limit(1)

      if (!totp && !webauthn) {
        throw createError({
          statusCode: 403,
          data: { error: { message: '2FA is required by your organization policy and cannot be dismissed', code: 'FORBIDDEN' } },
        })
      }
    }

    await setSetting(`user.${user.id}.security.onboarding.dismissed`, {
      dismissed: true,
      dismissedAt: new Date().toISOString(),
    })
    return { success: true }
  }

  throw createError({
    statusCode: 400,
    data: { error: { message: 'Invalid action', code: 'BAD_REQUEST' } },
  })
})
