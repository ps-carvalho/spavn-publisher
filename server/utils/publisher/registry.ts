import type { ContentTypeConfig } from '../../../lib/publisher/types'

// ─── In-Memory Content Type Registry ─────────────────────────────

const _registry = new Map<string, ContentTypeConfig>()

/**
 * Register a content type in the in-memory registry.
 */
export function registerContentType(config: ContentTypeConfig): void {
  if (_registry.has(config.name)) {
    console.warn(`[Publisher] Content type '${config.name}' already registered, overwriting.`)
  }
  _registry.set(config.name, config)
}

/**
 * Get a single content type by name.
 */
export function getContentType(name: string): ContentTypeConfig | undefined {
  return _registry.get(name)
}

/**
 * Get a content type by its plural name (used for API routes).
 */
export function getContentTypeByPlural(pluralName: string): ContentTypeConfig | undefined {
  for (const config of _registry.values()) {
    if (config.pluralName === pluralName) return config
  }
  return undefined
}

/**
 * Get all registered content types.
 */
export function getAllContentTypes(): ContentTypeConfig[] {
  return Array.from(_registry.values())
}

/**
 * Check if a content type is registered.
 */
export function hasContentType(name: string): boolean {
  return _registry.has(name)
}

/**
 * Remove a content type from the registry.
 * @returns true if the type was removed, false if it didn't exist
 */
export function removeContentType(name: string): boolean {
  return _registry.delete(name)
}

/**
 * Clear the registry (useful for testing).
 */
export function clearRegistry(): void {
  _registry.clear()
}
