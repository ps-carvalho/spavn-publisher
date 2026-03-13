/**
 * API Token Scope System
 *
 * Scopes control what operations an API token can perform.
 * Pattern: {resource}:{action} or {resource}:{type}:{action}
 *
 * Resolution order:
 * 1. Empty scopes [] = full access (backward compat)
 * 2. Wildcard '*' = full access
 * 3. Exact match
 * 4. Resource-level covers type-specific (content:read covers content:articles:read)
 */

export const SCOPES = {
  // Content operations
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  CONTENT_DELETE: 'content:delete',
  CONTENT_PUBLISH: 'content:publish',

  // Page operations
  PAGES_READ: 'pages:read',
  PAGES_WRITE: 'pages:write',
  PAGES_DELETE: 'pages:delete',
  PAGES_PUBLISH: 'pages:publish',

  // Media operations
  MEDIA_READ: 'media:read',
  MEDIA_WRITE: 'media:write',
  MEDIA_DELETE: 'media:delete',

  // Full access
  WILDCARD: '*',
} as const

export type ScopeValue = typeof SCOPES[keyof typeof SCOPES]

/** All available scope values for UI display */
export const ALL_SCOPES: { value: string; label: string; group: string }[] = [
  { value: SCOPES.CONTENT_READ, label: 'Read content', group: 'Content' },
  { value: SCOPES.CONTENT_WRITE, label: 'Create & update content', group: 'Content' },
  { value: SCOPES.CONTENT_DELETE, label: 'Delete content', group: 'Content' },
  { value: SCOPES.CONTENT_PUBLISH, label: 'Publish & unpublish content', group: 'Content' },
  { value: SCOPES.PAGES_READ, label: 'Read pages', group: 'Pages' },
  { value: SCOPES.PAGES_WRITE, label: 'Create & update pages', group: 'Pages' },
  { value: SCOPES.PAGES_DELETE, label: 'Delete pages', group: 'Pages' },
  { value: SCOPES.PAGES_PUBLISH, label: 'Publish & unpublish pages', group: 'Pages' },
  { value: SCOPES.MEDIA_READ, label: 'Read media files', group: 'Media' },
  { value: SCOPES.MEDIA_WRITE, label: 'Upload media files', group: 'Media' },
  { value: SCOPES.MEDIA_DELETE, label: 'Delete media files', group: 'Media' },
]

/** Build type-specific scope: content:articles:read */
export function contentScope(pluralName: string, action: string): string {
  return `content:${pluralName}:${action}`
}

/** Build page scope: pages:read */
export function pageScope(action: string): string {
  return `pages:${action}`
}

/** Build media scope: media:read */
export function mediaScope(action: string): string {
  return `media:${action}`
}

/**
 * Check if a set of token scopes grants the required scope.
 *
 * Resolution:
 * 1. Empty scopes = legacy full access (backward compat)
 * 2. Wildcard '*' = full access
 * 3. Exact match
 * 4. Resource-level covers type-specific
 *    (content:read covers content:articles:read)
 */
export function hasScope(tokenScopes: string[], required: string): boolean {
  // Empty scopes = legacy full access
  if (tokenScopes.length === 0) return true
  // Wildcard
  if (tokenScopes.includes('*')) return true
  // Exact match
  if (tokenScopes.includes(required)) return true
  // Resource-level covers type-specific
  const parts = required.split(':')
  if (parts.length === 3) {
    const resourceScope = `${parts[0]}:${parts[2]}`
    return tokenScopes.includes(resourceScope)
  }
  return false
}
