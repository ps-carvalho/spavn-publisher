import { eq, and } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { logAuthEvent } from '../../../../utils/publisher/audit'

/**
 * DELETE /api/publisher/auth/devices/:id
 *
 * Revoke (delete) a tracked device for the current user.
 * Only allows deleting devices that belong to the authenticated user.
 * Logs the action to the audit trail.
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

  const deviceId = getRouterParam(event, 'id')
  if (!deviceId || isNaN(Number(deviceId))) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid device ID', code: 'INVALID_ID' } },
    })
  }

  const db = await getDb() as any
  const { publisherUserDevices } = await getSchema()

  // Verify the device belongs to the current user
  const [device] = await db
    .select()
    .from(publisherUserDevices)
    .where(
      and(
        eq(publisherUserDevices.id, Number(deviceId)),
        eq(publisherUserDevices.userId, user.id),
      ),
    )
    .limit(1)

  if (!device) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Device not found', code: 'DEVICE_NOT_FOUND' } },
    })
  }

  // Delete the device
  await db
    .delete(publisherUserDevices)
    .where(eq(publisherUserDevices.id, Number(deviceId)))

  // Log to audit trail
  await logAuthEvent(event, user.id, 'preference_updated', {
    action: 'device_revoked',
    deviceName: device.deviceName,
    deviceId: device.id,
  })

  return { success: true }
})
