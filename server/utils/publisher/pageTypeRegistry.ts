import type { PageTypeConfig } from '../../../lib/publisher/types'

// ─── In-Memory Page Type Registry ──────────────────────────────────

const _pageTypeRegistry = new Map<string, PageTypeConfig>()

/**
 * Register a page type in the in-memory registry.
 */
export function registerPageType(config: PageTypeConfig): void {
  if (_pageTypeRegistry.has(config.name)) {
    console.warn(`[Publisher] Page type '${config.name}' already registered, overwriting.`)
  }
  console.log(`[Publisher] Registering page type: ${config.name}`)
  _pageTypeRegistry.set(config.name, config)
}

/**
 * Get a single page type by name.
 */
export function getPageType(name: string): PageTypeConfig | undefined {
  return _pageTypeRegistry.get(name)
}

/**
 * Get all registered page types.
 */
export function getAllPageTypes(): PageTypeConfig[] {
  return Array.from(_pageTypeRegistry.values())
}

/**
 * Check if a page type is registered.
 */
export function hasPageType(name: string): boolean {
  return _pageTypeRegistry.has(name)
}

/**
 * Remove a page type from the registry.
 * @returns true if the type was removed, false if it didn't exist
 */
export function removePageType(name: string): boolean {
  return _pageTypeRegistry.delete(name)
}

/**
 * Clear the page type registry (useful for testing).
 */
export function clearPageTypeRegistry(): void {
  _pageTypeRegistry.clear()
}
