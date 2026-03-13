import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { getSetting } from '../../../utils/publisher/settings'

/**
 * GET /api/publisher/auth/security-onboarding
 *
 * Checks whether the logged-in user needs to complete security onboarding
 * (i.e. set up 2FA) based on their role's security policy.
 *
 * Returns:
 *  - required: true if the role policy mandates 2FA and the user has none
 *  - dismissed: true if the user previously dismissed the prompt
 *  - allowedMethods: the 2FA methods allowed by the policy
 */
export default defineEventHandler(async (event) => {
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const db = await getDb() as any
  const { publisherSecurityPolicies, publisherTOTPSecrets, publisherWebAuthnCredentials } = await getSchema()

  // 1. Check role policy
  const [policy] = await db
    .select()
    .from(publisherSecurityPolicies)
    .where(eq(publisherSecurityPolicies.role, user.role))
    .limit(1)

  // No policy or 2FA not required — no onboarding needed
  if (!policy || !policy.require2FA) {
    return { required: false, recommended: false }
  }

  // 2. Check if user already has any 2FA method configured
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

  const has2FA = !!(totpRecord || webAuthnRecord)

  if (has2FA) {
    return { required: false, recommended: false }
  }

  // 3. Check if user previously dismissed the prompt
  const dismissedKey = `user.${user.id}.security.onboarding.dismissed`
  const dismissed = await getSetting<boolean>(dismissedKey)

  return {
    required: policy.require2FA && !has2FA,
    dismissed: !!dismissed,
    allowedMethods: policy.allowedMethods,
  }
})
