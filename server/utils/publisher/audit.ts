/**
 * Audit Logging Utilities
 *
 * Provides structured audit logging for authentication events
 * and auth method changes. Stores audit entries in the
 * publisherSettings table with key pattern `audit:auth:{timestamp}`.
 *
 * @example
 * ```typescript
 * await logAuthEvent(event, userId, 'totp_enabled', { method: 'totp' })
 * await logAuthMethodChange(event, adminId, userId, 'password', 'passkey')
 * ```
 */

import { getDb, getSchema } from './database'
import type { H3Event } from 'h3'

// ─── Types ──────────────────────────────────────────────────────────

export type AuditEventType =
  | 'auth_method_change'
  | 'backup_codes_regenerated'
  | 'password_changed'
  | 'totp_enabled'
  | 'totp_disabled'
  | 'passkey_added'
  | 'passkey_removed'
  | 'magic_link_requested'
  | 'login_success'
  | 'login_failed'
  | 'admin_force_auth_method'
  | 'preference_updated'

export interface AuditEntry {
  type: AuditEventType
  userId: number
  performedBy: number
  timestamp: string
  ipAddress: string
  userAgent: string
  details: Record<string, unknown>
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Extract the client IP address from an H3 event.
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
 * Extract the user agent string from an H3 event.
 */
function getUserAgent(event: H3Event): string {
  return getHeader(event, 'user-agent') || 'unknown'
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Log an authentication event to the audit trail.
 *
 * @param event - The H3 event (for IP and user agent extraction)
 * @param userId - The user this event relates to
 * @param type - The type of audit event
 * @param details - Additional details about the event
 * @param performedBy - The user who performed the action (defaults to userId)
 */
export async function logAuthEvent(
  event: H3Event,
  userId: number,
  type: AuditEventType,
  details: Record<string, unknown> = {},
  performedBy?: number,
): Promise<void> {
  try {
    const db = await getDb() as any
    const { publisherSettings } = await getSchema()

    const timestamp = new Date().toISOString()
    const key = `audit:auth:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`

    const entry: AuditEntry = {
      type,
      userId,
      performedBy: performedBy ?? userId,
      timestamp,
      ipAddress: getClientIP(event),
      userAgent: getUserAgent(event),
      details,
    }

    await db.insert(publisherSettings).values({
      key,
      value: entry as unknown as Record<string, unknown>,
    })
  }
  catch (err) {
    // Audit logging should never break the main flow
    console.error('[Publisher] Failed to write audit log:', err)
  }
}

/**
 * Log an auth method change event.
 * Convenience wrapper around logAuthEvent for method changes.
 *
 * @param event - The H3 event
 * @param adminId - The admin who made the change (or userId if self-service)
 * @param userId - The user whose auth method was changed
 * @param oldMethod - The previous auth method
 * @param newMethod - The new auth method
 */
export async function logAuthMethodChange(
  event: H3Event,
  adminId: number,
  userId: number,
  oldMethod: string,
  newMethod: string,
): Promise<void> {
  await logAuthEvent(
    event,
    userId,
    adminId !== userId ? 'admin_force_auth_method' : 'auth_method_change',
    { oldMethod, newMethod },
    adminId,
  )
}

/**
 * Retrieve recent audit log entries for a specific user.
 *
 * @param userId - The user to fetch audit logs for (optional — fetches all if omitted)
 * @param limit - Maximum number of entries to return (default: 50)
 * @returns Array of audit entries, newest first
 */
export async function getAuditLogs(
  userId?: number,
  limit: number = 50,
): Promise<AuditEntry[]> {
  try {
    const db = await getDb() as any
    const { publisherSettings } = await getSchema()
    const { like, desc } = await import('drizzle-orm')

    const results = await db
      .select()
      .from(publisherSettings)
      .where(like(publisherSettings.key, 'audit:auth:%'))
      .orderBy(desc(publisherSettings.createdAt))
      .limit(limit * 2) // Fetch extra to account for filtering

    const entries: AuditEntry[] = []
    for (const row of results) {
      const entry = row.value as unknown as AuditEntry
      if (!entry || !entry.type) continue
      if (userId && entry.userId !== userId && entry.performedBy !== userId) continue
      entries.push(entry)
      if (entries.length >= limit) break
    }

    return entries
  }
  catch (err) {
    console.error('[Publisher] Failed to read audit logs:', err)
    return []
  }
}
