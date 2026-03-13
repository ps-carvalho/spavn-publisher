/**
 * Device Fingerprinting Utilities
 *
 * Generates device fingerprints from request headers for device tracking
 * and identification. Fingerprints are hashed before storage for privacy.
 *
 * The fingerprint is a SHA-256 hash of the user agent, accept-language,
 * accept header, and IP address — simple but effective for identifying
 * returning devices.
 *
 * @example
 * ```typescript
 * const fingerprint = generateDeviceFingerprint(event)
 * const info = getDeviceInfo(event)
 * // info = { deviceName: 'Chrome on macOS', browser: 'Chrome', os: 'macOS' }
 * ```
 */

import crypto from 'node:crypto'
import type { H3Event } from 'h3'

// ─── Types ──────────────────────────────────────────────────────────

export interface DeviceInfo {
  /** Human-readable device name (e.g., "Chrome on macOS") */
  deviceName: string
  /** Detected browser name */
  browser: string
  /** Detected operating system */
  os: string
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Generate a device fingerprint from request headers.
 *
 * Combines user agent, accept-language, accept header, and IP address
 * into a SHA-256 hash (truncated to 32 hex chars) for consistent
 * device identification.
 *
 * @param event - The H3 event
 * @returns 32-character hex fingerprint string
 */
export function generateDeviceFingerprint(event: H3Event): string {
  const headers = getRequestHeaders(event)
  const ip = getRequestIP(event) || 'unknown'

  const components = [
    headers['user-agent'] || '',
    headers['accept-language'] || '',
    headers['accept'] || '',
    ip,
  ]

  const fingerprint = components.join('|')
  return hashFingerprint(fingerprint)
}

/**
 * Parse user agent string to extract device information.
 *
 * Uses simple pattern matching for browser and OS detection.
 * For production use with higher accuracy, consider ua-parser-js.
 *
 * @param event - The H3 event
 * @returns DeviceInfo with deviceName, browser, and os
 */
export function getDeviceInfo(event: H3Event): DeviceInfo {
  const headers = getRequestHeaders(event)
  const userAgent = headers['user-agent'] || 'Unknown'

  const browser = detectBrowser(userAgent)
  const os = detectOS(userAgent)

  return {
    deviceName: `${browser} on ${os}`,
    browser,
    os,
  }
}

/**
 * Hash a fingerprint string using SHA-256.
 *
 * @param fingerprint - Raw fingerprint string to hash
 * @returns 32-character hex hash
 */
export function hashFingerprint(fingerprint: string): string {
  return crypto
    .createHash('sha256')
    .update(fingerprint)
    .digest('hex')
    .slice(0, 32)
}

// ─── Internal Helpers ───────────────────────────────────────────────

/**
 * Detect browser from user agent string.
 */
function detectBrowser(userAgent: string): string {
  // Order matters — check more specific patterns first
  if (userAgent.includes('Edg/') || userAgent.includes('Edge/')) return 'Edge'
  if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) return 'Opera'
  if (userAgent.includes('Brave')) return 'Brave'
  if (userAgent.includes('Vivaldi')) return 'Vivaldi'
  if (userAgent.includes('Chrome/') && !userAgent.includes('Chromium')) return 'Chrome'
  if (userAgent.includes('Firefox/')) return 'Firefox'
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari'
  return 'Unknown Browser'
}

/**
 * Detect operating system from user agent string.
 */
function detectOS(userAgent: string): string {
  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS'
  if (userAgent.includes('Android')) return 'Android'
  if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) return 'macOS'
  if (userAgent.includes('Windows')) return 'Windows'
  if (userAgent.includes('Linux')) return 'Linux'
  if (userAgent.includes('CrOS')) return 'ChromeOS'
  return 'Unknown OS'
}
