/**
 * WebAuthn Challenge Store
 *
 * In-memory store for WebAuthn challenges with automatic expiry.
 * Challenges are short-lived (60 seconds by default) and cleaned up periodically.
 *
 * @example
 * ```typescript
 * storeChallenge('user:123', challenge, 60_000)
 * const challenge = getAndDeleteChallenge('user:123')
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────

interface ChallengeEntry {
  /** The challenge string */
  challenge: string
  /** Timestamp when this challenge expires */
  expiresAt: number
}

// ─── State ──────────────────────────────────────────────────────────

/** In-memory store keyed by challenge identifier */
const challenges = new Map<string, ChallengeEntry>()

/** Cleanup interval handle */
let cleanupInterval: ReturnType<typeof setInterval> | null = null

/** How often to run cleanup (5 minutes) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

// ─── Cleanup ────────────────────────────────────────────────────────

/**
 * Remove expired challenges from the store.
 */
function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of challenges) {
    if (entry.expiresAt < now) {
      challenges.delete(key)
    }
  }
}

/**
 * Start the periodic cleanup interval if not already running.
 */
function ensureCleanup(): void {
  if (!cleanupInterval) {
    cleanupInterval = setInterval(cleanup, CLEANUP_INTERVAL_MS)
    // Allow the process to exit even if the interval is running
    if (cleanupInterval && typeof cleanupInterval === 'object' && 'unref' in cleanupInterval) {
      cleanupInterval.unref()
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Store a challenge with a time-to-live.
 *
 * @param key - Unique identifier for the challenge (e.g., `webauthn-register:userId`)
 * @param challenge - The challenge string to store
 * @param ttlMs - Time-to-live in milliseconds (default: 60 seconds)
 */
export function storeChallenge(key: string, challenge: string, ttlMs: number = 60_000): void {
  ensureCleanup()
  challenges.set(key, {
    challenge,
    expiresAt: Date.now() + ttlMs,
  })
}

/**
 * Retrieve and delete a stored challenge.
 * Returns null if the challenge doesn't exist or has expired.
 * The challenge is always deleted after retrieval (one-time use).
 *
 * @param key - The challenge identifier
 * @returns The challenge string, or null if not found/expired
 */
export function getAndDeleteChallenge(key: string): string | null {
  const entry = challenges.get(key)
  challenges.delete(key)

  if (!entry || entry.expiresAt < Date.now()) {
    return null
  }

  return entry.challenge
}

/**
 * Reset the challenge store (for testing).
 */
export function resetChallengeStore(): void {
  challenges.clear()
}
