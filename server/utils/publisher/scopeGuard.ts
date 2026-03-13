import { hasScope } from './scopes'
import type { H3Event } from 'h3'

/**
 * Require a specific scope for API token access.
 *
 * - Session auth (cookie JWT): always allowed (admin access)
 * - API token auth: checks token scopes
 * - No auth: allowed (public access — requireAuth() handles gating separately)
 *
 * Throws 403 if scope is insufficient.
 */
export function requireScope(event: H3Event, scope: string): void {
  const authMethod = event.context.publisherAuthMethod

  // Session users (admin UI) bypass scope checks
  if (authMethod === 'session') return

  // No auth — public access (other middleware handles whether auth is required)
  if (!authMethod) return

  // API token — check scopes
  if (authMethod === 'api-token') {
    const tokenScopes: string[] = event.context.publisherTokenScopes || []
    if (!hasScope(tokenScopes, scope)) {
      throw createError({
        statusCode: 403,
        data: {
          error: {
            message: 'Insufficient permissions',
            code: 'FORBIDDEN',
            requiredScope: scope,
          },
        },
      })
    }
  }
}
