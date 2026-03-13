import { getDb, getSchema } from '../../../utils/publisher/database'
import { desc, eq, count } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Only admins and super-admins can list users
  const role = event.context.publisherUser.role
  if (role !== 'super-admin' && role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
    })
  }

  const db = await getDb() as any
  const {
    publisherUsers,
    publisherWebAuthnCredentials,
    publisherTOTPSecrets,
  } = await getSchema()

  const users = await db
    .select({
      id: publisherUsers.id,
      email: publisherUsers.email,
      firstName: publisherUsers.firstName,
      lastName: publisherUsers.lastName,
      role: publisherUsers.role,
      authMethod: publisherUsers.authMethod,
      isActive: publisherUsers.isActive,
      createdAt: publisherUsers.createdAt,
    })
    .from(publisherUsers)
    .orderBy(desc(publisherUsers.createdAt))

  // Enrich with auth method details for each user
  const enrichedUsers = await Promise.all(
    users.map(async (u: any) => {
      // Count passkeys
      const [webauthnResult] = await db
        .select({ count: count() })
        .from(publisherWebAuthnCredentials)
        .where(eq(publisherWebAuthnCredentials.userId, u.id))

      // Check TOTP
      const [totpRecord] = await db
        .select({ id: publisherTOTPSecrets.id })
        .from(publisherTOTPSecrets)
        .where(eq(publisherTOTPSecrets.userId, u.id))
        .limit(1)

      return {
        ...u,
        authMethod: u.authMethod || 'password',
        passkeysCount: webauthnResult?.count ?? 0,
        hasTOTP: !!totpRecord,
      }
    }),
  )

  return { data: enrichedUsers }
})
