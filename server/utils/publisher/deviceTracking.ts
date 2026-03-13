/**
 * Device Tracking on Login
 *
 * Shared helper used by all login endpoints to track devices,
 * detect suspicious activity, and send new-device alerts.
 *
 * This module centralizes the device tracking logic so that
 * login.post.ts, magic-link/verify.get.ts, totp/login.post.ts,
 * and webauthn/authenticate/verify.post.ts all behave consistently.
 *
 * @example
 * ```typescript
 * // After successful authentication in any login endpoint:
 * await trackDeviceLogin(event, user.id, user.email)
 * ```
 */

import { eq, and, count, asc } from 'drizzle-orm'
import type { H3Event } from 'h3'
import { getDb, getSchema } from './database'
import { generateDeviceFingerprint, getDeviceInfo } from './deviceFingerprint'
import { checkSuspiciousActivity } from './suspiciousActivity'
import { logAuthEvent } from './audit'
import { sendNewDeviceAlert } from './email/index'

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Track a device login and send alerts if needed.
 *
 * Called after successful authentication in any login endpoint.
 * This function:
 * 1. Generates a device fingerprint
 * 2. Checks if the device/location is known
 * 3. Stores or updates the device record
 * 4. Sends a new-device email alert if appropriate
 * 5. Logs the login to the audit trail
 * 6. Enforces max devices per user limit
 *
 * Errors are caught silently — device tracking should never
 * break the login flow.
 *
 * @param event - The H3 event
 * @param userId - The authenticated user's ID
 * @param userEmail - The authenticated user's email
 */
export async function trackDeviceLogin(
  event: H3Event,
  userId: number,
  userEmail: string,
): Promise<void> {
  try {
    // Load config
    const config = await loadSecurityConfig()
    if (!config.deviceTracking) return

    const fingerprint = generateDeviceFingerprint(event)
    const deviceInfo = getDeviceInfo(event)
    const ipAddress = getRequestIP(event) || getClientIP(event)

    // Check suspicious activity
    const risk = await checkSuspiciousActivity(userId, fingerprint, ipAddress)

    const db = await getDb() as any
    const { publisherUserDevices } = await getSchema()

    if (risk.knownDevice) {
      // Update existing device record
      await db
        .update(publisherUserDevices)
        .set({
          lastUsedAt: new Date(),
          ipAddress,
          deviceName: deviceInfo.deviceName,
        })
        .where(
          and(
            eq(publisherUserDevices.userId, userId),
            eq(publisherUserDevices.fingerprint, fingerprint),
          ),
        )
    }
    else {
      // Insert new device record
      await db.insert(publisherUserDevices).values({
        userId,
        fingerprint,
        deviceName: deviceInfo.deviceName,
        ipAddress,
        isTrusted: false,
      })

      // Enforce max devices per user
      await enforceMaxDevices(db, publisherUserDevices, userId, config.maxDevicesPerUser)

      // Send new device alert email (if not trusted and notifications enabled)
      if (config.notifyNewDevices && !risk.trustedDevice) {
        const origin = getRequestOrigin(event)
        const securitySettingsUrl = `${origin}/admin/settings/security`

        await sendNewDeviceAlert(userEmail, {
          deviceName: deviceInfo.deviceName,
          ipAddress: maskIpForEmail(ipAddress),
          timestamp: new Date().toISOString(),
          securitySettingsUrl,
          appName: config.appName,
        })
      }
    }

    // Log to audit trail
    await logAuthEvent(event, userId, 'login_success', {
      device: deviceInfo.deviceName,
      riskLevel: risk.level,
      knownDevice: risk.knownDevice,
      knownLocation: risk.knownLocation,
    })
  }
  catch (err) {
    // Device tracking should never break the login flow
    console.error('[Publisher] Device tracking error:', err)
  }
}

// ─── Internal Helpers ───────────────────────────────────────────────

/**
 * Load security configuration from publisher.config.ts.
 */
async function loadSecurityConfig(): Promise<{
  deviceTracking: boolean
  notifyNewDevices: boolean
  maxDevicesPerUser: number
  appName: string
}> {
  const defaults = {
    deviceTracking: true,
    notifyNewDevices: true,
    maxDevicesPerUser: 10,
    appName: 'Publisher CMS',
  }

  try {
    const { join } = await import('path')
    const { pathToFileURL } = await import('url')

    const cwd = process.cwd()
    const configPath = join(cwd, 'publisher.config.ts')
    const configUrl = pathToFileURL(configPath).href
    const configModule = await import(configUrl) as { default?: any }
    const config = configModule?.default

    if (!config) return defaults

    return {
      deviceTracking: config.security?.deviceTracking ?? defaults.deviceTracking,
      notifyNewDevices: config.security?.notifyNewDevices ?? defaults.notifyNewDevices,
      maxDevicesPerUser: config.security?.maxDevicesPerUser ?? defaults.maxDevicesPerUser,
      appName: config.appName ?? defaults.appName,
    }
  }
  catch {
    return defaults
  }
}

/**
 * Enforce maximum devices per user by removing the oldest devices.
 */
async function enforceMaxDevices(
  db: any,
  publisherUserDevices: any,
  userId: number,
  maxDevices: number,
): Promise<void> {
  try {
    const [{ count: deviceCount }] = await db
      .select({ count: count() })
      .from(publisherUserDevices)
      .where(eq(publisherUserDevices.userId, userId))

    if (deviceCount > maxDevices) {
      // Get the oldest non-trusted devices to remove
      const devicesToRemove = await db
        .select({ id: publisherUserDevices.id })
        .from(publisherUserDevices)
        .where(eq(publisherUserDevices.userId, userId))
        .orderBy(asc(publisherUserDevices.lastUsedAt))
        .limit(deviceCount - maxDevices)

      for (const device of devicesToRemove) {
        await db
          .delete(publisherUserDevices)
          .where(eq(publisherUserDevices.id, device.id))
      }
    }
  }
  catch {
    // Non-critical — don't break login
  }
}

/**
 * Extract client IP from headers (fallback for getRequestIP).
 */
function getClientIP(event: H3Event): string {
  const forwarded = getHeader(event, 'x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  const realIp = getHeader(event, 'x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

/**
 * Get the request origin URL.
 */
function getRequestOrigin(event: H3Event): string {
  try {
    const url = getRequestURL(event)
    return url.origin
  }
  catch {
    return 'http://localhost:3000'
  }
}

/**
 * Mask IP address for email display (show first 2 octets only).
 */
function maskIpForEmail(ip: string): string {
  if (!ip || ip === 'unknown') return 'unknown'

  const ipv4Parts = ip.split('.')
  if (ipv4Parts.length === 4) {
    return `${ipv4Parts[0]}.${ipv4Parts[1]}.x.x`
  }

  return ip
}
