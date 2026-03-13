import type { BlockTypeConfig } from '../../../lib/publisher/types'

// ─── In-Memory Block Type Registry ────────────────────────────────

const _blockRegistry = new Map<string, BlockTypeConfig>()

/**
 * Register a block type in the in-memory registry.
 */
export function registerBlockType(config: BlockTypeConfig): void {
  if (_blockRegistry.has(config.name)) {
    console.warn(`[Publisher] Block type '${config.name}' already registered, overwriting.`)
  }
  console.log(`[Publisher] Registering block type: ${config.name}`)
  _blockRegistry.set(config.name, config)
}

/**
 * Get a single block type by name.
 */
export function getBlockType(name: string): BlockTypeConfig | undefined {
  return _blockRegistry.get(name)
}

/**
 * Get a block type by name (alias for getBlockType, for consistency).
 */
export function getBlockTypeByName(name: string): BlockTypeConfig | undefined {
  return _blockRegistry.get(name)
}

/**
 * Get all registered block types.
 */
export function getAllBlockTypes(): BlockTypeConfig[] {
  return Array.from(_blockRegistry.values())
}

/**
 * Get block types filtered by category.
 */
export function getBlockTypesByCategory(category: string): BlockTypeConfig[] {
  return Array.from(_blockRegistry.values()).filter(
    (config) => config.category === category
  )
}

/**
 * Check if a block type is registered.
 */
export function hasBlockType(name: string): boolean {
  return _blockRegistry.has(name)
}

/**
 * Remove a block type from the registry.
 * @returns true if the type was removed, false if it didn't exist
 */
export function removeBlockType(name: string): boolean {
  return _blockRegistry.delete(name)
}

/**
 * Clear the block registry (useful for testing).
 */
export function clearBlockRegistry(): void {
  _blockRegistry.clear()
}
