import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { logAuthEvent } from '../../../../utils/publisher/audit'

const trustSchema = z.object({
  isTrusted: z.boolean(),
})

/**
 * PUT /api/publisher/auth/devices/:id/trust
 *
 * Update the trust status of a tracked device.
 * Trusted devices don't trigger new-device email alerts.
 * Only allows updating devices that belong to the authenticated user.
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

  const body = await readBody(event)
  const parsed = trustSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid request body', code: 'VALIDATION_ERROR' } },
    })
  }

  const { isTrusted } = parsed.data
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

  // Update trust status
  await db
    .update(publisherUserDevices)
    .set({ isTrusted })
    .where(eq(publisherUserDevices.id, Number(deviceId)))

  // Log to audit trail
  await logAuthEvent(event, user.id, 'preference_updated', {
    action: isTrusted ? 'device_trusted' : 'device_untrusted',
    deviceName: device.deviceName,
    deviceId: device.id,
  })

  return { success: true, isTrusted }
})
