import { getAuditLogs } from '../../../utils/publisher/audit'

/**
 * GET /api/publisher/auth/audit-log
 *
 * Retrieve recent authentication audit log entries.
 * Regular users see only their own events.
 * Admins can optionally filter by userId query param.
 *
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const query = getQuery(event)
  const limit = Math.min(Number(query.limit) || 20, 100)

  let targetUserId = user.id

  // Admins can view other users' audit logs
  if (query.userId && (user.role === 'admin' || user.role === 'super-admin')) {
    targetUserId = Number(query.userId)
    if (isNaN(targetUserId)) {
      throw createError({
        statusCode: 400,
        data: { error: { message: 'Invalid userId', code: 'INVALID_ID' } },
      })
    }
  }

  const entries = await getAuditLogs(targetUserId, limit)

  return { data: entries }
})
