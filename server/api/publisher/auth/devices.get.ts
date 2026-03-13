import { eq, desc } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'

/**
 * GET /api/publisher/auth/devices
 *
 * List all tracked devices for the current authenticated user.
 * Returns device name, last used timestamp, masked IP address,
 * and trust status. Sorted by lastUsedAt descending.
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

  const devices = await db
    .select()
    .from(publisherUserDevices)
    .where(eq(publisherUserDevices.userId, user.id))
    .orderBy(desc(publisherUserDevices.lastUsedAt))

  // Mask IP addresses for privacy (show only first 2 octets)
  const maskedDevices = devices.map((device: any) => ({
    id: device.id,
    deviceName: device.deviceName,
    ipAddress: maskIpAddress(device.ipAddress),
    isTrusted: device.isTrusted,
    lastUsedAt: device.lastUsedAt,
    createdAt: device.createdAt,
  }))

  return { data: maskedDevices }
})

/**
 * Mask an IP address for privacy.
 * Shows only the first 2 octets for IPv4, or first 2 groups for IPv6.
 *
 * @example
 * maskIpAddress('192.168.1.100') → '192.168.x.x'
 * maskIpAddress('unknown') → 'unknown'
 */
function maskIpAddress(ip: string | null): string {
  if (!ip || ip === 'unknown') return 'unknown'

  // IPv4
  const ipv4Parts = ip.split('.')
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.x.x`
  }

  // IPv6 — show first 2 groups
  const ipv6Parts = ip.split(':')
  if (ipv6Parts.length > 2) {
    return `${ipv6Parts[0]}:${ipv6Parts[1]}:****`
  }

  return ip
}
