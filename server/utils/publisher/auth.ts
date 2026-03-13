import { SignJWT, jwtVerify } from 'jose'
import { randomBytes, pbkdf2Sync, timingSafeEqual } from 'crypto'

// ─── Secret Management ──────────────────────────────────────────

let _secretKey: Uint8Array | null = null

/**
 * Get the JWT signing secret as a Uint8Array.
 * Fails loudly in production if PUBLISHER_SECRET is not set.
 */
function getSecret(): Uint8Array {
  if (_secretKey) return _secretKey

  const secret = process.env.PUBLISHER_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'PUBLISHER_SECRET is required in production. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"',
      )
    }
    // Development: use a deterministic secret so sessions survive restarts
    console.warn('[Publisher] WARNING: No PUBLISHER_SECRET set. Using deterministic dev secret.')
    const devSecret = 'publisher-dev-secret-do-not-use-in-production'
    _secretKey = new TextEncoder().encode(devSecret)
    return _secretKey
  }

  _secretKey = new TextEncoder().encode(secret)
  return _secretKey
}

// ─── Password Hashing ───────────────────────────────────────────

const SALT_LENGTH = 32
const KEY_LENGTH = 64
const ITERATIONS = 100_000
const DIGEST = 'sha512'

/**
 * Hash a plaintext password using PBKDF2-SHA512.
 * Returns format: `iterations:salt:hash` (all hex encoded).
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const hash = pbkdf2Sync(plain, salt, ITERATIONS, KEY_LENGTH, DIGEST).toString('hex')
  return `${ITERATIONS}:${salt}:${hash}`
}

/**
 * Verify a plaintext password against a stored hash.
 * Uses timing-safe comparison to prevent timing attacks.
 *
 * @deprecated Password-based authentication has been deprecated in favor of passwordless methods.
 * This function is kept for internal use only and will be removed in a future version.
 * Use magic-link, passkey, or TOTP authentication instead.
 * @internal
 */
export async function verifyPassword(plain: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split(':')
  if (parts.length !== 3) return false

  const [iterStr, salt, hash] = parts
  const iterations = parseInt(iterStr!, 10)
  if (isNaN(iterations) || !salt || !hash) return false

  const verifyHash = pbkdf2Sync(plain, salt, iterations, KEY_LENGTH, DIGEST).toString('hex')

  // Use timing-safe comparison
  const hashBuffer = Buffer.from(hash, 'hex')
  const verifyBuffer = Buffer.from(verifyHash, 'hex')

  if (hashBuffer.length !== verifyBuffer.length) return false
  return timingSafeEqual(hashBuffer, verifyBuffer)
}

// ─── JWT Session Tokens ─────────────────────────────────────────

/**
 * Create a signed JWT session token for a user.
 * Includes a unique `jti` claim for revocation support.
 *
 * @param userId - The user's ID
 * @param role - The user's role (defaults to 'editor')
 * @param authState - Optional authentication state ('pending-2fa' for intermediate state)
 */
export async function createSessionToken(
  userId: number,
  role?: string,
  authState?: string
): Promise<{ token: string; jti: string }> {
  const jti = randomBytes(16).toString('hex')
  const secret = getSecret()

  const payload: Record<string, unknown> = {
    userId,
    role: role || 'editor',
  }

  if (authState) {
    payload.authState = authState
  }

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(authState === 'pending-2fa' ? '5m' : '7d')
    .sign(secret)

  return { token, jti }
}

/**
 * Verify a JWT session token and return its payload.
 * Returns null if the token is invalid or expired.
 */
export async function verifySessionToken(token: string): Promise<{
  userId: number
  role: string
  jti: string
  exp: number
  authState?: string
} | null> {
  try {
    const secret = getSecret()
    const { payload } = await jwtVerify(token, secret)

    if (!payload.userId || !payload.jti) return null

    return {
      userId: payload.userId as number,
      role: (payload.role as string) || 'editor',
      jti: payload.jti as string,
      exp: payload.exp || 0,
      authState: payload.authState as string | undefined,
    }
  }
  catch {
    return null
  }
}

// ─── API Token Utilities ────────────────────────────────────────

/**
 * Generate a new API token.
 * Returns the full token (shown once) and its hash (stored in DB).
 */
export function generateApiToken(): { token: string; hash: string; prefix: string } {
  const token = randomBytes(32).toString('hex') // 64 hex chars
  const prefix = token.slice(0, 8)
  const hash = pbkdf2Sync(token, 'publisher-api-token', 10_000, 64, 'sha256').toString('hex')

  return { token, hash, prefix }
}

/**
 * Verify an API token against a stored hash.
 */
export function verifyApiToken(token: string, storedHash: string): boolean {
  const hash = pbkdf2Sync(token, 'publisher-api-token', 10_000, 64, 'sha256').toString('hex')

  const hashBuffer = Buffer.from(storedHash, 'hex')
  const verifyBuffer = Buffer.from(hash, 'hex')

  if (hashBuffer.length !== verifyBuffer.length) return false
  return timingSafeEqual(hashBuffer, verifyBuffer)
}
