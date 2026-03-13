import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { verifySessionToken } from '../../../utils/publisher/auth'

export default defineEventHandler(async (event) => {
  const token = getCookie(event, 'publisher-session')

  if (!token) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Not authenticated', code: 'UNAUTHORIZED' } },
    })
  }

  // Verify JWT
  const payload = await verifySessionToken(token)
  if (!payload) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid or expired session', code: 'INVALID_TOKEN' } },
    })
  }

  const db = await getDb()
  const { publisherUsers, publisherRevokedTokens } = await getSchema()

  // Check if token has been revoked
  const [revoked] = await db
    .select()
    .from(publisherRevokedTokens)
    .where(eq(publisherRevokedTokens.jti, payload.jti))
    .limit(1)

  if (revoked) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Session has been revoked', code: 'TOKEN_REVOKED' } },
    })
  }

  // Fetch user from DB
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
    .where(eq(publisherUsers.id, payload.userId))
    .limit(1)

  if (!user || !user.isActive) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'User not found or inactive', code: 'USER_INACTIVE' } },
    })
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
  }
})
