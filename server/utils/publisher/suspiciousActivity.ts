/**
 * Suspicious Activity Detection
 *
 * Checks login attempts against known devices and locations to
 * determine risk level. Used to trigger new-device email alerts
 * and flag potentially unauthorized access.
 *
 * Risk levels:
 * - 'low': Known device and known IP address
 * - 'medium': Known device but new IP, or new device but known IP
 * - 'high': New device AND new IP address
 *
 * @example
 * ```typescript
 * const risk = await checkSuspiciousActivity(userId, fingerprint, ipAddress)
 * if (risk.level === 'high') {
 *   // Send new device alert email
 * }
 * ```
 */

import { eq, and } from 'drizzle-orm'
import { getDb, getSchema } from './database'

// ─── Types ──────────────────────────────────────────────────────────

export type RiskLevel = 'low' | 'medium' | 'high'

export interface SuspiciousActivityResult {
  /** Risk level of the login attempt */
  level: RiskLevel
  /** Whether the device fingerprint is known */
  knownDevice: boolean
  /** Whether the IP address is known */
  knownLocation: boolean
  /** Whether the device is trusted by the user */
  trustedDevice: boolean
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Check if a login attempt is from a known device and location.
 *
 * @param userId - The user ID to check against
 * @param fingerprint - The hashed device fingerprint
 * @param ipAddress - The client IP address
 * @returns SuspiciousActivityResult with risk level and details
 */
export async function checkSuspiciousActivity(
  userId: number,
  fingerprint: string,
  ipAddress: string,
): Promise<SuspiciousActivityResult> {
  const knownDevice = await isKnownDevice(userId, fingerprint)
  const knownLocation = await isKnownLocation(userId, ipAddress)
  const trustedDevice = knownDevice ? await isTrustedDevice(userId, fingerprint) : false

  let level: RiskLevel

  if (knownDevice && knownLocation) {
    level = 'low'
  }
  else if (knownDevice || knownLocation) {
    level = 'medium'
  }
  else {
    level = 'high'
  }

  return {
    level,
    knownDevice,
    knownLocation,
    trustedDevice,
  }
}

/**
 * Check if a device fingerprint is known for a user.
 *
 * @param userId - The user ID
 * @param fingerprint - The hashed device fingerprint
 * @returns true if the device is known
 */
export async function isKnownDevice(
  userId: number,
  fingerprint: string,
): Promise<boolean> {
  try {
    const db = await getDb() as any
    const { publisherUserDevices } = await getSchema()

    const [device] = await db
      .select({ id: publisherUserDevices.id })
      .from(publisherUserDevices)
      .where(
        and(
          eq(publisherUserDevices.userId, userId),
          eq(publisherUserDevices.fingerprint, fingerprint),
        ),
      )
      .limit(1)

    return !!device
  }
  catch {
    // If the table doesn't exist yet, treat as unknown
    return false
  }
}

/**
 * Check if an IP address is known for a user (simplified location check).
 *
 * Checks if the user has previously logged in from this IP address.
 * This is a simplified approach — for production, consider using
 * GeoIP lookups to compare geographic regions.
 *
 * @param userId - The user ID
 * @param ipAddress - The client IP address
 * @returns true if the IP address is known
 */
export async function isKnownLocation(
  userId: number,
  ipAddress: string,
): Promise<boolean> {
  try {
    const db = await getDb() as any
    const { publisherUserDevices } = await getSchema()

    const [device] = await db
      .select({ id: publisherUserDevices.id })
      .from(publisherUserDevices)
      .where(
        and(
          eq(publisherUserDevices.userId, userId),
          eq(publisherUserDevices.ipAddress, ipAddress),
        ),
      )
      .limit(1)

    return !!device
  }
  catch {
    return false
  }
}

/**
 * Check if a device is marked as trusted by the user.
 *
 * @param userId - The user ID
 * @param fingerprint - The hashed device fingerprint
 * @returns true if the device is trusted
 */
export async function isTrustedDevice(
  userId: number,
  fingerprint: string,
): Promise<boolean> {
  try {
    const db = await getDb() as any
    const { publisherUserDevices } = await getSchema()

    const [device] = await db
      .select({ isTrusted: publisherUserDevices.isTrusted })
      .from(publisherUserDevices)
      .where(
        and(
          eq(publisherUserDevices.userId, userId),
          eq(publisherUserDevices.fingerprint, fingerprint),
        ),
      )
      .limit(1)

    return device?.isTrusted === true
  }
  catch {
    return false
  }
}
