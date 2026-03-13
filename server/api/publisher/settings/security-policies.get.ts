/**
 * GET /api/publisher/settings/security-policies
 *
 * Returns all security policies (one per role).
 * Only accessible to admin and super-admin users.
 */
import { getDb, getSchema } from '../../../utils/publisher/database'

export default defineEventHandler(async (event) => {
  // Authentication check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Authorization check - only admins and super-admins
  const role = event.context.publisherUser.role
  if (role !== 'super-admin' && role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
    })
  }

  const db = await getDb() as any
  const { publisherSecurityPolicies } = await getSchema()

  const policies = await db.select().from(publisherSecurityPolicies)

  return { policies }
})
