/**
 * In-Memory Rate Limiter
 *
 * Simple sliding-window rate limiter with no external dependencies.
 * Tracks request counts per key within configurable time windows.
 * Includes automatic cleanup to prevent memory leaks.
 *
 * @example
 * ```typescript
 * // Limit magic link requests to 3 per hour per email
 * await checkRateLimit(`magic-link:${email}`, { max: 3, windowMs: 60 * 60 * 1000 })
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────

interface RateLimitEntry {
  /** Timestamps of requests within the current window */
  timestamps: number[]
}

interface RateLimitOptions {
  /** Maximum number of requests allowed within the window */
  max: number
  /** Time window in milliseconds */
  windowMs: number
}

// ─── State ──────────────────────────────────────────────────────────

/** In-memory store keyed by rate limit identifier */
const store = new Map<string, RateLimitEntry>()

/** Cleanup interval handle */
let cleanupInterval: ReturnType<typeof setInterval> | null = null

/** How often to run cleanup (5 minutes) */
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

// ─── Cleanup ────────────────────────────────────────────────────────

/**
 * Remove expired entries from the store to prevent memory leaks.
 * Called automatically on a periodic interval.
 */
function cleanup(): void {
  const now = Date.now()
  for (const [key, entry] of store) {
    // Remove timestamps older than the longest reasonable window (1 hour)
    entry.timestamps = entry.timestamps.filter(ts => now - ts < 60 * 60 * 1000)
    if (entry.timestamps.length === 0) {
      store.delete(key)
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
 * Check if a request is within the rate limit for a given key.
 *
 * Uses a sliding window approach: counts requests within the last `windowMs`
 * milliseconds and rejects if the count exceeds `max`.
 *
 * @param key - Unique identifier for the rate limit bucket (e.g., `magic-link:user@example.com`)
 * @param options - Rate limit configuration
 * @throws Error with statusCode 429 if the rate limit is exceeded
 *
 * @example
 * ```typescript
 * try {
 *   await checkRateLimit(`magic-link:${email}`, { max: 3, windowMs: 60 * 60 * 1000 })
 * } catch (err) {
 *   // 429 Too Many Requests
 * }
 * ```
 */
export async function checkRateLimit(key: string, options: RateLimitOptions): Promise<void> {
  ensureCleanup()

  const now = Date.now()
  const { max, windowMs } = options

  let entry = store.get(key)

  if (!entry) {
    entry = { timestamps: [] }
    store.set(key, entry)
  }

  // Remove timestamps outside the current window
  entry.timestamps = entry.timestamps.filter(ts => now - ts < windowMs)

  // Check if limit is exceeded
  if (entry.timestamps.length >= max) {
    throw createError({
      statusCode: 429,
      data: {
        error: {
          message: 'Too many requests. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
        },
      },
    })
  }

  // Record this request
  entry.timestamps.push(now)
}

/**
 * Reset the rate limit store (for testing).
 */
export function resetRateLimitStore(): void {
  store.clear()
}
