import type { MenuConfig, MenuItemConfig, MenuItemType } from './types'

/**
 * Define a menu for the Publisher CMS.
 *
 * This is a purely declarative function — it returns the config typed.
 * The Nitro server plugin will scan menus/ and register each one
 * at startup, creating the corresponding database tables automatically.
 *
 * @example
 * ```ts
 * export default defineMenu({
 *   name: 'main-navigation',
 *   displayName: 'Main Navigation',
 *   slug: 'main-nav',
 *   description: 'Primary site navigation',
 *   location: 'header',
 *   items: [
 *     {
 *       label: 'Home',
 *       type: 'page',
 *       pageId: 1,
 *     },
 *     {
 *       label: 'About',
 *       type: 'page',
 *       pageId: 2,
 *       children: [
 *         { label: 'Our Team', type: 'page', pageId: 3 },
 *         { label: 'History', type: 'page', pageId: 4 },
 *       ],
 *     },
 *     {
 *       label: 'Contact',
 *       type: 'external',
 *       url: 'https://example.com/contact',
 *       target: '_blank',
 *     },
 *   ],
 * })
 * ```
 */
export function defineMenu(config: MenuConfig): MenuConfig {
  // Validate required fields
  if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
    throw new Error('Menu must have a non-empty name')
  }
  if (!config.displayName || typeof config.displayName !== 'string' || config.displayName.trim() === '') {
    throw new Error(`Menu '${config.name}' must have a non-empty displayName`)
  }
  if (!config.slug || typeof config.slug !== 'string' || config.slug.trim() === '') {
    throw new Error(`Menu '${config.name}' must have a non-empty slug`)
  }

  // Validate slug format (lowercase, alphanumeric, hyphens only)
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
  if (!slugPattern.test(config.slug)) {
    throw new Error(
      `Menu '${config.name}' has invalid slug '${config.slug}'. Slug must be lowercase, alphanumeric, and hyphens only (e.g., 'main-nav')`
    )
  }

  // Validate items if provided
  if (config.items && Array.isArray(config.items)) {
    validateMenuItems(config.items, config.name, 0)
  }

  return config
}

/**
 * Validates an array of menu items recursively
 */
function validateMenuItems(items: MenuItemConfig[], menuName: string, depth: number): void {
  const validTypes: MenuItemType[] = ['page', 'external', 'label']
  const indent = '  '.repeat(depth)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const itemContext = `Menu '${menuName}' item ${i + 1}${depth > 0 ? ` (depth ${depth})` : ''}`

    // Validate label
    if (!item.label || typeof item.label !== 'string' || item.label.trim() === '') {
      throw new Error(`${itemContext} must have a non-empty label`)
    }

    // Validate type
    if (!item.type || !validTypes.includes(item.type)) {
      throw new Error(
        `${itemContext} '${item.label}' has invalid type '${item.type}'. Must be one of: ${validTypes.join(', ')}`
      )
    }

    // Validate type-specific requirements
    if (item.type === 'page') {
      if (typeof item.pageId !== 'number' || !Number.isInteger(item.pageId) || item.pageId <= 0) {
        throw new Error(`${itemContext} '${item.label}' with type 'page' must have a valid positive pageId`)
      }
      if (item.url) {
        console.warn(`${indent}Warning: ${itemContext} '${item.label}' has type 'page' but also defines url which will be ignored`)
      }
    }

    if (item.type === 'external') {
      if (!item.url || typeof item.url !== 'string' || item.url.trim() === '') {
        throw new Error(`${itemContext} '${item.label}' with type 'external' must have a non-empty url`)
      }
      if (item.pageId !== undefined) {
        console.warn(`${indent}Warning: ${itemContext} '${item.label}' has type 'external' but also defines pageId which will be ignored`)
      }
    }

    if (item.type === 'label') {
      if (item.url) {
        console.warn(`${indent}Warning: ${itemContext} '${item.label}' has type 'label' but also defines url which will be ignored`)
      }
      if (item.pageId !== undefined) {
        console.warn(`${indent}Warning: ${itemContext} '${item.label}' has type 'label' but also defines pageId which will be ignored`)
      }
    }

    // Validate target if provided
    if (item.target !== undefined && item.target !== '_blank' && item.target !== '_self') {
      throw new Error(
        `${itemContext} '${item.label}' has invalid target '${item.target}'. Must be '_blank' or '_self'`
      )
    }

    // Validate children recursively
    if (item.children && Array.isArray(item.children) && item.children.length > 0) {
      validateMenuItems(item.children, menuName, depth + 1)
    }
  }
}
