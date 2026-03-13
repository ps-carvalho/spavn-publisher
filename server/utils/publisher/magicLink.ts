/**
 * Magic Link Token Utilities
 *
 * Cryptographic utilities for generating, hashing, and verifying
 * magic link tokens used in passwordless email authentication.
 *
 * Tokens are 256-bit (32 bytes) cryptographically secure random values
 * encoded as base64url. Only the SHA-256 hash is stored in the database.
 *
 * @example
 * ```typescript
 * // Generate a new token pair
 * const { token, hash } = generateMagicLinkToken()
 * // Store `hash` in DB, send `token` in email URL
 *
 * // Verify on callback
 * const isValid = verifyMagicLinkToken(token, storedHash)
 * ```
 */

import { randomBytes, createHash, timingSafeEqual } from 'crypto'

// ─── Token Generation ───────────────────────────────────────────────

/**
 * Generate a cryptographically secure magic link token and its SHA-256 hash.
 *
 * The raw token is sent to the user via email. Only the hash is stored
 * in the database, so a database leak does not compromise active tokens.
 *
 * @returns Object with `token` (base64url, 43 chars) and `hash` (hex SHA-256)
 */
export function generateMagicLinkToken(): { token: string; hash: string } {
  // 32 bytes = 256 bits of entropy
  const buffer = randomBytes(32)
  const token = buffer.toString('base64url') // 43 chars

  const hash = hashMagicLinkToken(token)

  return { token, hash }
}

// ─── Token Hashing ──────────────────────────────────────────────────

/**
 * Hash a magic link token using SHA-256.
 *
 * SHA-256 is appropriate here because magic link tokens are:
 * - High entropy (256 bits of randomness)
 * - Short-lived (15 minutes)
 * - Single-use
 *
 * No salt is needed since the tokens themselves are random.
 *
 * @param token - The raw base64url token
 * @returns Hex-encoded SHA-256 hash
 */
export function hashMagicLinkToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

// ─── Token Verification ─────────────────────────────────────────────

/**
 * Verify a magic link token against a stored hash using timing-safe comparison.
 *
 * Prevents timing attacks by ensuring the comparison takes constant time
 * regardless of where the strings differ.
 *
 * @param token - The raw base64url token from the URL
 * @param storedHash - The hex SHA-256 hash from the database
 * @returns true if the token matches the stored hash
 */
export function verifyMagicLinkToken(token: string, storedHash: string): boolean {
  const computedHash = hashMagicLinkToken(token)

  // Both are hex-encoded SHA-256 hashes (64 chars each)
  const computedBuffer = Buffer.from(computedHash, 'hex')
  const storedBuffer = Buffer.from(storedHash, 'hex')

  // Length check before timing-safe compare (required by timingSafeEqual)
  if (computedBuffer.length !== storedBuffer.length) {
    return false
  }

  return timingSafeEqual(computedBuffer, storedBuffer)
}
