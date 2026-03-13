import { eq, desc } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'

/**
 * GET /api/publisher/auth/sessions
 *
 * List active sessions for the current user.
 * Uses tracked devices as a proxy for sessions (simplified approach).
 * Each device represents a potential active session.
 *
 * Returns the same data as devices.get.ts but framed as "sessions"
 * for the UI. The current device is identified by matching the
 * request fingerprint.
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

  const db = await getDb() as any
  const { publisherUserDevices } = await getSchema()

  // Get current device fingerprint for comparison
  const { generateDeviceFingerprint } = await import('../../../utils/publisher/deviceFingerprint')
  const currentFingerprint = generateDeviceFingerprint(event)

  const devices = await db
    .select()
    .from(publisherUserDevices)
    .where(eq(publisherUserDevices.userId, user.id))
    .orderBy(desc(publisherUserDevices.lastUsedAt))

  const sessions = devices.map((device: any) => ({
    id: device.id,
    deviceName: device.deviceName,
    ipAddress: maskIpAddress(device.ipAddress),
    isTrusted: device.isTrusted,
    isCurrent: device.fingerprint === currentFingerprint,
    lastUsedAt: device.lastUsedAt,
    createdAt: device.createdAt,
  }))

  return { data: sessions }
})

/**
 * Mask an IP address for privacy.
 */
function maskIpAddress(ip: string | null): string {
  if (!ip || ip === 'unknown') return 'unknown'

  const ipv4Parts = ip.split('.')
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.x.x`
  }

  const ipv6Parts = ip.split(':')
  if (ipv6Parts.length > 2) {
    return `${ipv6Parts[0]}:${ipv6Parts[1]}:****`
  }

  return ip
}
