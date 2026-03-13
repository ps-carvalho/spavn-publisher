import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../utils/publisher/database'
import { verifySessionToken, verifyApiToken } from '../utils/publisher/auth'

/**
 * Server middleware that handles auth for publisher API routes.
 *
 * - /api/publisher/** routes: authentication is REQUIRED (except login/logout)
 * - /api/v1/** routes: authentication is OPTIONAL (try to set context, don't fail)
 * - All other routes: skipped entirely
 * - Verifies JWT cookie or Bearer API token
 * - Attaches user to event.context.publisherUser
 */
export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Determine which auth mode applies
  const isPublisherRoute = path.startsWith('/api/publisher/')
  const isV1Route = path.startsWith('/api/v1/')

  // Skip routes we don't handle
  if (!isPublisherRoute && !isV1Route) return

  // Skip login route (public)
  if (path === '/api/publisher/auth/login') return

  // Skip logout route (handled by its own logic)
  if (path === '/api/publisher/auth/logout') return

  // Skip identify route (public — used to determine auth method before login)
  if (path === '/api/publisher/auth/identify') return

  // Skip magic link routes (public — unauthenticated users request/verify)
  if (path.startsWith('/api/publisher/auth/magic-link')) return

  // Skip WebAuthn authenticate routes (public — unauthenticated users initiate/verify passkey login)
  if (path.startsWith('/api/publisher/auth/webauthn/authenticate')) return

  // Skip TOTP login route (public — unauthenticated users verify TOTP code)
  if (path === '/api/publisher/auth/totp/login') return

  // Skip 2FA routes (require pending-2fa cookie, handled by endpoints)
  if (path === '/api/publisher/auth/second-factor-methods') return
  if (path === '/api/publisher/auth/verify-second-factor') return

  // Skip health check route (public)
  if (path === '/api/publisher/health') return

  // For /api/v1/ routes, auth is optional — try to authenticate but don't fail
  const authRequired = isPublisherRoute

  const db = await getDb()
  const { publisherUsers, publisherRevokedTokens, publisherApiTokens } = await getSchema()

  // ─── Try Bearer API token first ──────────────────────────────
  const authHeader = getHeader(event, 'authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)

    // Find matching token by prefix
    const prefix = token.slice(0, 8)
    const [tokenRecord] = await db
      .select()
      .from(publisherApiTokens)
      .where(eq(publisherApiTokens.tokenPrefix, prefix))
      .limit(1)

    if (tokenRecord) {
      // Check expiry
      if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
        throw createError({
          statusCode: 401,
          data: { error: { message: 'API token expired', code: 'TOKEN_EXPIRED' } },
        })
      }

      // Verify hash
      if (verifyApiToken(token, tokenRecord.tokenHash)) {
        // Update last used timestamp
        await db
          .update(publisherApiTokens)
          .set({ lastUsedAt: new Date().toISOString() })
          .where(eq(publisherApiTokens.id, tokenRecord.id))

        // Fetch the user associated with this token
        if (tokenRecord.userId) {
          const [user] = await db
            .select({
              id: publisherUsers.id,
              email: publisherUsers.email,
              firstName: publisherUsers.firstName,
              lastName: publisherUsers.lastName,
              role: publisherUsers.role,
            })
            .from(publisherUsers)
            .where(eq(publisherUsers.id, tokenRecord.userId))
            .limit(1)

          if (user) {
            event.context.publisherUser = user
            event.context.publisherAuthMethod = 'api-token'
            event.context.publisherTokenScopes = tokenRecord.scopes
            return
          }
        }
      }
    }

    // If Bearer was provided but invalid, always fail (explicit auth attempt)
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid API token', code: 'INVALID_TOKEN' } },
    })
  }

  // ─── Try JWT session cookie ──────────────────────────────────
  const sessionToken = getCookie(event, 'publisher-session')

  if (!sessionToken) {
    // For /api/v1/ routes, missing auth is OK — individual endpoints use requireAuth() if needed
    if (!authRequired) return

    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Verify JWT signature and expiry
  const payload = await verifySessionToken(sessionToken)
  if (!payload) {
    if (!authRequired) return
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Invalid or expired session', code: 'INVALID_TOKEN' } },
    })
  }

  // Check if token has been revoked (server-side logout)
  const [revoked] = await db
    .select()
    .from(publisherRevokedTokens)
    .where(eq(publisherRevokedTokens.jti, payload.jti))
    .limit(1)

  if (revoked) {
    if (!authRequired) return
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Session has been revoked', code: 'TOKEN_REVOKED' } },
    })
  }

  // Fetch user
  const [user] = await db
    .select({
      id: publisherUsers.id,
      email: publisherUsers.email,
      firstName: publisherUsers.firstName,
      lastName: publisherUsers.lastName,
      role: publisherUsers.role,
    })
    .from(publisherUsers)
    .where(eq(publisherUsers.id, payload.userId))
    .limit(1)

  if (!user) {
    if (!authRequired) return
    throw createError({
      statusCode: 401,
      data: { error: { message: 'User not found', code: 'USER_NOT_FOUND' } },
    })
  }

  // Attach to event context
  event.context.publisherUser = user
  event.context.publisherAuthMethod = 'session'
})
