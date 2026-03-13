import type { PageTypeConfig } from './types'

/**
 * Define a page type for the Page Builder.
 *
 * This is a purely declarative function — it returns the config typed.
 * The Nitro server plugin will scan page-types/ and register each one
 * at startup, creating the corresponding database tables automatically.
 *
 * @example
 * ```ts
 * export default definePageType({
 *   name: 'landing-page',
 *   displayName: 'Landing Page',
 *   icon: 'i-heroicons-document',
 *   areas: {
 *     main: {
 *       name: 'main',
 *       displayName: 'Main Content',
 *       allowedBlocks: ['hero', 'text-block', 'cta', 'media'],
 *       minBlocks: 1,
 *       maxBlocks: 10,
 *     },
 *     sidebar: {
 *       name: 'sidebar',
 *       displayName: 'Sidebar',
 *       allowedBlocks: ['cta', 'text-block'],
 *     }
 *   },
 *   options: {
 *     draftAndPublish: true,
 *     seo: true,
 *   }
 * })
 * ```
 */
export function definePageType(config: PageTypeConfig): PageTypeConfig {
  // Validate required fields
  if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
    throw new Error('Page type must have a non-empty name')
  }
  if (!config.displayName || typeof config.displayName !== 'string' || config.displayName.trim() === '') {
    throw new Error(`Page type '${config.name}' must have a non-empty displayName`)
  }
  if (!config.areas || Object.keys(config.areas).length === 0) {
    throw new Error(`Page type '${config.name}' must have at least one area`)
  }

  // Validate each area
  for (const [areaKey, areaConfig] of Object.entries(config.areas)) {
    // Validate area has name
    if (!areaConfig.name || typeof areaConfig.name !== 'string' || areaConfig.name.trim() === '') {
      throw new Error(`Area '${areaKey}' in page type '${config.name}' must have a non-empty name`)
    }

    // Validate area has displayName
    if (!areaConfig.displayName || typeof areaConfig.displayName !== 'string' || areaConfig.displayName.trim() === '') {
      throw new Error(`Area '${areaConfig.name}' in page type '${config.name}' must have a non-empty displayName`)
    }

    // Validate area has at least one allowedBlocks entry
    if (!areaConfig.allowedBlocks || !Array.isArray(areaConfig.allowedBlocks) || areaConfig.allowedBlocks.length === 0) {
      throw new Error(`Area '${areaConfig.name}' in page type '${config.name}' must have at least one block type in allowedBlocks`)
    }

    // Validate minBlocks <= maxBlocks if both are set
    if (
      typeof areaConfig.minBlocks === 'number' &&
      typeof areaConfig.maxBlocks === 'number' &&
      areaConfig.minBlocks > areaConfig.maxBlocks
    ) {
      throw new Error(
        `Area '${areaConfig.name}' in page type '${config.name}' has minBlocks (${areaConfig.minBlocks}) greater than maxBlocks (${areaConfig.maxBlocks})`
      )
    }
  }

  return config
}
