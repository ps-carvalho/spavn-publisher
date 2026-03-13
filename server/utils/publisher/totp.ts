/**
 * TOTP (Time-based One-Time Password) Utilities
 *
 * Provides functions for generating and verifying TOTP codes,
 * managing backup codes, and creating QR code data URLs for
 * authenticator app setup.
 *
 * Uses the `otpauth` library for TOTP operations and `qrcode`
 * for generating scannable QR codes.
 *
 * @example
 * ```typescript
 * const { secret, otpauthUrl, backupCodes } = generateTOTPSecret(1, 'user@example.com')
 * const qrCode = await generateQRCode(otpauthUrl)
 * const isValid = verifyTOTP('123456', secret)
 * ```
 */

import { TOTP, Secret } from 'otpauth'
import QRCode from 'qrcode'
import { createHash, randomBytes } from 'crypto'

// ─── Configuration ──────────────────────────────────────────────────

const TOTP_ISSUER = process.env.PUBLISHER_TOTP_ISSUER || 'Publisher CMS'
const TOTP_DIGITS = 6
const TOTP_PERIOD = 30
const TOTP_ALGORITHM = 'SHA1'
const TOTP_WINDOW = 1

/** Characters for backup codes (excluding confusing chars: 0, O, I, 1, L) */
const BACKUP_CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const BACKUP_CODE_LENGTH = 8
const BACKUP_CODE_COUNT = 10

// ─── TOTP Secret Generation ────────────────────────────────────────

/**
 * Generate a TOTP secret for a user along with backup codes.
 *
 * @param userId - The user's database ID
 * @param email - The user's email address (used as the TOTP label)
 * @returns The base32-encoded secret, otpauth URL, and backup codes
 */
export function generateTOTPSecret(userId: number, email: string): {
  secret: string
  otpauthUrl: string
  backupCodes: string[]
} {
  const secret = new Secret({ size: 32 })

  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  })

  const otpauthUrl = totp.toString()
  const backupCodes = generateBackupCodes(BACKUP_CODE_COUNT)

  return {
    secret: secret.base32,
    otpauthUrl,
    backupCodes,
  }
}

// ─── TOTP Verification ─────────────────────────────────────────────

/**
 * Verify a TOTP token against a stored secret.
 *
 * Uses a time window tolerance of ±1 period (30 seconds)
 * to account for clock drift between the server and the
 * user's authenticator app.
 *
 * @param token - The 6-digit TOTP code from the user
 * @param secret - The base32-encoded TOTP secret
 * @returns true if the token is valid within the time window
 */
export function verifyTOTP(token: string, secret: string): boolean {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secret),
  })

  // validate() returns the time step delta (number) or null if invalid
  const delta = totp.validate({ token, window: TOTP_WINDOW })
  return delta !== null
}

// ─── QR Code Generation ────────────────────────────────────────────

/**
 * Generate a QR code data URL from an otpauth URL.
 *
 * The resulting data URL can be rendered directly in an `<img>` tag
 * for the user to scan with their authenticator app.
 *
 * @param otpauthUrl - The otpauth:// URL to encode
 * @returns A base64-encoded PNG data URL
 */
export async function generateQRCode(otpauthUrl: string): Promise<string> {
  return QRCode.toDataURL(otpauthUrl, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff',
    },
  })
}

// ─── Backup Codes ──────────────────────────────────────────────────

/**
 * Generate random backup codes for TOTP recovery.
 *
 * Each code is 8 characters of uppercase alphanumeric characters
 * (excluding confusing characters like 0, O, I, 1, L), formatted
 * as XXXX-XXXX for readability.
 *
 * @param count - Number of backup codes to generate (default: 10)
 * @returns Array of formatted backup codes (e.g., "A7B9-C3D5")
 */
export function generateBackupCodes(count: number = BACKUP_CODE_COUNT): string[] {
  const codes: string[] = []

  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(BACKUP_CODE_LENGTH)
    let code = ''

    for (let j = 0; j < BACKUP_CODE_LENGTH; j++) {
      code += BACKUP_CODE_CHARS[bytes[j]! % BACKUP_CODE_CHARS.length]
    }

    // Format as XXXX-XXXX
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`)
  }

  return codes
}

/**
 * Hash a backup code for secure storage using SHA-256.
 *
 * Backup codes are normalized (uppercase, hyphens removed) before
 * hashing to ensure consistent comparison regardless of formatting.
 *
 * @param code - The plaintext backup code
 * @returns The SHA-256 hex hash of the normalized code
 */
export function hashBackupCode(code: string): string {
  const normalized = code.toUpperCase().replace(/-/g, '')
  return createHash('sha256').update(normalized).digest('hex')
}

/**
 * Verify a backup code against an array of hashed codes.
 *
 * If the code matches, returns the index of the matched hash
 * so it can be removed from the stored array (one-time use).
 *
 * @param code - The plaintext backup code to verify
 * @param hashedCodes - Array of SHA-256 hashed backup codes
 * @returns The index of the matched code, or -1 if no match
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): number {
  const hash = hashBackupCode(code)

  for (let i = 0; i < hashedCodes.length; i++) {
    if (hashedCodes[i] === hash) {
      return i
    }
  }

  return -1
}
