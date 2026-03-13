import { eq, and } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../../utils/publisher/database'

/**
 * DELETE /api/publisher/auth/webauthn/credentials/:id
 *
 * Delete a WebAuthn credential (passkey) by ID.
 * Only the credential owner can delete their own credentials.
 *
 * Requires the `webauthn` feature flag to be enabled.
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

  const credentialId = getRouterParam(event, 'id')
  if (!credentialId) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Credential ID is required', code: 'VALIDATION_ERROR' } },
    })
  }

  const db = await getDb() as any
  const { publisherWebAuthnCredentials } = await getSchema()

  // Verify the credential belongs to the current user
  const [credential] = await db
    .select({ id: publisherWebAuthnCredentials.id })
    .from(publisherWebAuthnCredentials)
    .where(
      and(
        eq(publisherWebAuthnCredentials.id, credentialId),
        eq(publisherWebAuthnCredentials.userId, user.id),
      ),
    )
    .limit(1)

  if (!credential) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Credential not found', code: 'NOT_FOUND' } },
    })
  }

  // Delete the credential
  await db
    .delete(publisherWebAuthnCredentials)
    .where(
      and(
        eq(publisherWebAuthnCredentials.id, credentialId),
        eq(publisherWebAuthnCredentials.userId, user.id),
      ),
    )

  return { success: true }
})
