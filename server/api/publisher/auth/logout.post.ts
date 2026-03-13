import { getDb, getSchema } from '../../../utils/publisher/database'
import { verifySessionToken } from '../../../utils/publisher/auth'

export default defineEventHandler(async (event) => {
  console.log('[Logout] Handler started')
  
  const token = getCookie(event, 'publisher-session')
  console.log('[Logout] Token exists:', !!token)

  if (token) {
    // Verify and extract jti for revocation
    const payload = await verifySessionToken(token)
    console.log('[Logout] Payload verified:', !!payload)

    if (payload) {
      try {
        const db = await getDb() as any
        const { publisherRevokedTokens } = await getSchema()

        // Add token to revocation blocklist
        await db.insert(publisherRevokedTokens).values({
          jti: payload.jti,
          expiresAt: new Date(payload.exp * 1000),
        }).onConflictDoNothing()
        console.log('[Logout] Token revoked successfully')
      } catch (err) {
        console.error('[Logout] Failed to revoke token:', err)
      }
    }
  }

  // Clear the session cookie
  deleteCookie(event, 'publisher-session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
  console.log('[Logout] Cookie cleared')

  return { ok: true }
})
