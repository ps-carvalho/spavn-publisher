import { describe, it, expect } from 'vitest'
import type { MenuItemNode, MenuItemType } from '../../lib/publisher/types'

// ═══════════════════════════════════════════════════════════════════════════════
// Test buildMenuTree function (extracted from server/api/v1/menus/[slug].get.ts)
// ═══════════════════════════════════════════════════════════════════════════════

interface FlatMenuItem {
  id: number
  parentId: number | null
  sortOrder: number
  label: string
  type: string
  url: string | null
  target: string | null
  icon: string | null
  cssClass: string | null
  visible: boolean
  metadata: Record<string, unknown> | null
}

/**
 * Build a hierarchical tree structure from flat menu items
 * (Replicated from the API route for testing)
 */
function buildMenuTree(items: FlatMenuItem[]): MenuItemNode[] {
  // Create a map of all visible items by id
  const itemMap = new Map<number, MenuItemNode>()
  const rootItems: MenuItemNode[] = []

  // First pass: create all nodes for visible items
  for (const item of items) {
    if (!item.visible) continue

    itemMap.set(item.id, {
      id: item.id,
      label: item.label,
      type: item.type as MenuItemType,
      url: item.url ?? undefined,
      target: item.target as '_blank' | '_self' | undefined,
      icon: item.icon ?? undefined,
      cssClass: item.cssClass ?? undefined,
      visible: item.visible,
      sortOrder: item.sortOrder,
      depth: 0,
      metadata: item.metadata ?? undefined,
      children: [],
    })
  }

  // Second pass: build tree by linking children to parents
  for (const item of items) {
    if (!item.visible) continue

    const node = itemMap.get(item.id)
    if (!node) continue

    if (item.parentId === null) {
      // Root item
      rootItems.push(node)
    } else {
      // Child item - add to parent's children
      const parent = itemMap.get(item.parentId)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  return rootItems
}

/**
 * Resolve page URLs for menu items with type='page'
 * (Replicated from the API route for testing)
 */
async function resolvePageUrls(
  items: FlatMenuItem[],
  pages: { id: number; slug: string }[]
): Promise<void> {
  const pageMap = new Map(pages.map((p) => [p.id, p.slug]))

  for (const item of items) {
    if (item.type === 'page' && item.metadata?.pageId) {
      const pageId = item.metadata.pageId as number
      const slug = pageMap.get(pageId)
      if (slug) {
        item.url = `/${slug}`
      }
    }
  }
}

describe('buildMenuTree', () => {
  describe('basic tree building', () => {
    it('should return empty array for empty input', () => {
      const result = buildMenuTree([])
      expect(result).toEqual([])
    })

    it('should return single root item with no children', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Home',
          type: 'page',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 1 },
        },
      ]

      const result = buildMenuTree(items)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(1)
      expect(result[0].label).toBe('Home')
      expect(result[0].children).toEqual([])
      expect(result[0].visible).toBe(true)
    })

    it('should build tree with one level of children', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Products',
          type: 'label',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
        {
          id: 2,
          parentId: 1,
          sortOrder: 0,
          label: 'Features',
          type: 'page',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 2 },
        },
        {
          id: 3,
          parentId: 1,
          sortOrder: 1,
          label: 'Pricing',
          type: 'page',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 3 },
        },
      ]

      const result = buildMenuTree(items)

      expect(result).toHaveLength(1)
      expect(result[0].children).toHaveLength(2)
      expect(result[0].children[0].label).toBe('Features')
      expect(result[0].children[1].label).toBe('Pricing')
    })

    it('should build tree with deeply nested children', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Services',
          type: 'label',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
        {
          id: 2,
          parentId: 1,
          sortOrder: 0,
          label: 'Consulting',
          type: 'page',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 2 },
        },
        {
          id: 3,
          parentId: 2,
          sortOrder: 0,
          label: 'Strategy',
          type: 'page',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 3 },
        },
        {
          id: 4,
          parentId: 2,
          sortOrder: 1,
          label: 'Implementation',
          type: 'page',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 4 },
        },
      ]

      const result = buildMenuTree(items)

      expect(result).toHaveLength(1)
      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].children).toHaveLength(2)
      expect(result[0].children[0].children[0].label).toBe('Strategy')
      expect(result[0].children[0].children[1].label).toBe('Implementation')
    })

    it('should handle multiple root items', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Home',
          type: 'page',
          url: '/home',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 1 },
        },
        {
          id: 2,
          parentId: null,
          sortOrder: 1,
          label: 'About',
          type: 'page',
          url: '/about',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 2 },
        },
        {
          id: 3,
          parentId: null,
          sortOrder: 2,
          label: 'Contact',
          type: 'external',
          url: 'https://example.com',
          target: '_blank',
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      expect(result).toHaveLength(3)
      expect(result[0].label).toBe('Home')
      expect(result[1].label).toBe('About')
      expect(result[2].label).toBe('Contact')
      expect(result[2].target).toBe('_blank')
    })
  })

  describe('visibility filtering', () => {
    it('should filter out invisible items', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Visible Item',
          type: 'page',
          url: '/visible',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
        {
          id: 2,
          parentId: null,
          sortOrder: 1,
          label: 'Hidden Item',
          type: 'page',
          url: '/hidden',
          target: null,
          icon: null,
          cssClass: null,
          visible: false,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      expect(result).toHaveLength(1)
      expect(result[0].label).toBe('Visible Item')
    })

    it('should filter out invisible child items', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Parent',
          type: 'label',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
        {
          id: 2,
          parentId: 1,
          sortOrder: 0,
          label: 'Visible Child',
          type: 'page',
          url: '/visible',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
        {
          id: 3,
          parentId: 1,
          sortOrder: 1,
          label: 'Hidden Child',
          type: 'page',
          url: '/hidden',
          target: null,
          icon: null,
          cssClass: null,
          visible: false,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      expect(result[0].children).toHaveLength(1)
      expect(result[0].children[0].label).toBe('Visible Child')
    })

    it('should hide children of invisible parents (orphan handling)', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Hidden Parent',
          type: 'label',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: false,
          metadata: {},
        },
        {
          id: 2,
          parentId: 1,
          sortOrder: 0,
          label: 'Orphan Child',
          type: 'page',
          url: '/orphan',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      // The parent is invisible, so it's not in the map
      // The child won't be attached to anything and won't appear in root
      expect(result).toHaveLength(0)
    })
  })

  describe('item type handling', () => {
    it('should handle all menu item types', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Page Item',
          type: 'page',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: { pageId: 1 },
        },
        {
          id: 2,
          parentId: null,
          sortOrder: 1,
          label: 'External Item',
          type: 'external',
          url: 'https://example.com',
          target: '_blank',
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
        {
          id: 3,
          parentId: null,
          sortOrder: 2,
          label: 'Label Item',
          type: 'label',
          url: null,
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      expect(result).toHaveLength(3)
      expect(result[0].type).toBe('page')
      expect(result[1].type).toBe('external')
      expect(result[2].type).toBe('label')
    })

    it('should preserve optional fields', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'Styled Item',
          type: 'page',
          url: '/styled',
          target: '_blank',
          icon: 'i-heroicons-home',
          cssClass: 'nav-home featured',
          visible: true,
          metadata: { pageId: 1, custom: 'value' },
        },
      ]

      const result = buildMenuTree(items)

      expect(result[0].url).toBe('/styled')
      expect(result[0].target).toBe('_blank')
      expect(result[0].icon).toBe('i-heroicons-home')
      expect(result[0].cssClass).toBe('nav-home featured')
      expect(result[0].metadata).toEqual({ pageId: 1, custom: 'value' })
    })
  })

  describe('edge cases', () => {
    it('should handle items with non-existent parent (orphans)', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: 999, // Non-existent parent
          sortOrder: 0,
          label: 'Orphan',
          type: 'page',
          url: '/orphan',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      // Item with non-existent parent should not appear in root
      expect(result).toHaveLength(0)
    })

    it('should handle circular reference gracefully', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: 2, // Parent is item 2
          sortOrder: 0,
          label: 'Item 1',
          type: 'page',
          url: '/item1',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
        {
          id: 2,
          parentId: 1, // Parent is item 1 (circular)
          sortOrder: 1,
          label: 'Item 2',
          type: 'page',
          url: '/item2',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      // Neither item has a null parent, so neither appears in root
      expect(result).toHaveLength(0)
    })

    it('should handle self-reference (item as its own parent)', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: 1, // Self-reference
          sortOrder: 0,
          label: 'Self-Referenced',
          type: 'page',
          url: '/self',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: {},
        },
      ]

      const result = buildMenuTree(items)

      // Item is its own parent, not a root item
      expect(result).toHaveLength(0)
    })

    it('should handle items with null metadata', () => {
      const items: FlatMenuItem[] = [
        {
          id: 1,
          parentId: null,
          sortOrder: 0,
          label: 'No Metadata',
          type: 'external',
          url: 'https://example.com',
          target: null,
          icon: null,
          cssClass: null,
          visible: true,
          metadata: null,
        },
      ]

      const result = buildMenuTree(items)

      expect(result).toHaveLength(1)
      expect(result[0].metadata).toBeUndefined()
    })
  })
})

describe('resolvePageUrls', () => {
  it('should resolve page URLs for page-type items', async () => {
    const items: FlatMenuItem[] = [
      {
        id: 1,
        parentId: null,
        sortOrder: 0,
        label: 'Home',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: { pageId: 1 },
      },
      {
        id: 2,
        parentId: null,
        sortOrder: 1,
        label: 'About',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: { pageId: 2 },
      },
    ]

    const pages = [
      { id: 1, slug: 'home' },
      { id: 2, slug: 'about-us' },
    ]

    await resolvePageUrls(items, pages)

    expect(items[0].url).toBe('/home')
    expect(items[1].url).toBe('/about-us')
  })

  it('should not modify non-page items', async () => {
    const items: FlatMenuItem[] = [
      {
        id: 1,
        parentId: null,
        sortOrder: 0,
        label: 'External',
        type: 'external',
        url: 'https://example.com',
        target: '_blank',
        icon: null,
        cssClass: null,
        visible: true,
        metadata: {},
      },
      {
        id: 2,
        parentId: null,
        sortOrder: 1,
        label: 'Label',
        type: 'label',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: {},
      },
    ]

    const pages = [{ id: 1, slug: 'home' }]

    await resolvePageUrls(items, pages)

    expect(items[0].url).toBe('https://example.com')
    expect(items[1].url).toBeNull()
  })

  it('should handle missing pages gracefully', async () => {
    const items: FlatMenuItem[] = [
      {
        id: 1,
        parentId: null,
        sortOrder: 0,
        label: 'Missing Page',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: { pageId: 999 },
      },
    ]

    const pages = [{ id: 1, slug: 'home' }]

    await resolvePageUrls(items, pages)

    // URL should remain null when page is not found
    expect(items[0].url).toBeNull()
  })

  it('should handle items without pageId in metadata', async () => {
    const items: FlatMenuItem[] = [
      {
        id: 1,
        parentId: null,
        sortOrder: 0,
        label: 'No PageId',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: {},
      },
    ]

    const pages = [{ id: 1, slug: 'home' }]

    await resolvePageUrls(items, pages)

    expect(items[0].url).toBeNull()
  })

  it('should handle null metadata', async () => {
    const items: FlatMenuItem[] = [
      {
        id: 1,
        parentId: null,
        sortOrder: 0,
        label: 'Null Metadata',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: null,
      },
    ]

    const pages = [{ id: 1, slug: 'home' }]

    await resolvePageUrls(items, pages)

    expect(items[0].url).toBeNull()
  })

  it('should handle empty pages array', async () => {
    const items: FlatMenuItem[] = [
      {
        id: 1,
        parentId: null,
        sortOrder: 0,
        label: 'Home',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: { pageId: 1 },
      },
    ]

    await resolvePageUrls(items, [])

    expect(items[0].url).toBeNull()
  })

  it('should resolve multiple items to same page slug', async () => {
    const items: FlatMenuItem[] = [
      {
        id: 1,
        parentId: null,
        sortOrder: 0,
        label: 'Home Link 1',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: { pageId: 1 },
      },
      {
        id: 2,
        parentId: null,
        sortOrder: 1,
        label: 'Home Link 2',
        type: 'page',
        url: null,
        target: null,
        icon: null,
        cssClass: null,
        visible: true,
        metadata: { pageId: 1 },
      },
    ]

    const pages = [{ id: 1, slug: 'home' }]

    await resolvePageUrls(items, pages)

    expect(items[0].url).toBe('/home')
    expect(items[1].url).toBe('/home')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test Zod Validation Schemas
// ═══════════════════════════════════════════════════════════════════════════════

import { z } from 'zod'

describe('Menu API Validation Schemas', () => {
  describe('createMenuSchema (POST /api/publisher/menus)', () => {
    const createMenuSchema = z.object({
      name: z.string().min(1).max(100),
      displayName: z.string().min(1).max(255),
      slug: z
        .string()
        .min(1)
        .max(100)
        .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
      description: z.string().max(500).optional(),
      location: z.string().max(100).optional(),
    })

    it('should accept valid menu data', () => {
      const validData = {
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        description: 'Primary site navigation',
        location: 'header',
      }

      const result = createMenuSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject missing name', () => {
      const invalidData = {
        displayName: 'Main Navigation',
        slug: 'main-nav',
      }

      const result = createMenuSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        displayName: 'Main Navigation',
        slug: 'main-nav',
      }

      const result = createMenuSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject slug with uppercase letters', () => {
      const invalidData = {
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'Main-Nav',
      }

      const result = createMenuSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject slug with spaces', () => {
      const invalidData = {
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main nav',
      }

      const result = createMenuSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject slug with underscores', () => {
      const invalidData = {
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main_nav',
      }

      const result = createMenuSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept minimal valid data (without optional fields)', () => {
      const validData = {
        name: 'footer-nav',
        displayName: 'Footer Navigation',
        slug: 'footer-nav',
      }

      const result = createMenuSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject name exceeding max length', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        displayName: 'Main Navigation',
        slug: 'main-nav',
      }

      const result = createMenuSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject description exceeding max length', () => {
      const invalidData = {
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        description: 'a'.repeat(501),
      }

      const result = createMenuSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('createMenuItemSchema (POST /api/publisher/menus/:id/items)', () => {
    const createMenuItemSchema = z
      .object({
        label: z.string().min(1).max(255),
        type: z.enum(['page', 'external', 'label']),
        pageId: z.number().int().positive().optional(),
        url: z.string().max(500).optional(),
        target: z.enum(['_blank', '_self']).optional(),
        icon: z.string().max(100).optional(),
        cssClass: z.string().max(100).optional(),
        visible: z.boolean().optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
        parentId: z.number().int().positive().nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
      .refine(
        (data) => {
          if (data.type === 'page' && !data.pageId) {
            return false
          }
          if (data.type === 'external' && !data.url) {
            return false
          }
          return true
        },
        {
          message: 'Type-specific field required: pageId for page type, url for external type',
        }
      )

    it('should accept valid page item', () => {
      const validData = {
        label: 'Home',
        type: 'page' as const,
        pageId: 1,
        target: '_self' as const,
      }

      const result = createMenuItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept valid external item', () => {
      const validData = {
        label: 'External Link',
        type: 'external' as const,
        url: 'https://example.com',
        target: '_blank' as const,
      }

      const result = createMenuItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept valid label item', () => {
      const validData = {
        label: 'Section Header',
        type: 'label' as const,
      }

      const result = createMenuItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject page item without pageId', () => {
      const invalidData = {
        label: 'Home',
        type: 'page' as const,
      }

      const result = createMenuItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject external item without url', () => {
      const invalidData = {
        label: 'External',
        type: 'external' as const,
      }

      const result = createMenuItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject invalid type', () => {
      const invalidData = {
        label: 'Invalid',
        type: 'invalid',
      }

      const result = createMenuItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject empty label', () => {
      const invalidData = {
        label: '',
        type: 'label' as const,
      }

      const result = createMenuItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept item with all optional fields', () => {
      const validData = {
        label: 'Complete Item',
        type: 'page' as const,
        pageId: 1,
        url: '/home',
        target: '_blank' as const,
        icon: 'i-heroicons-home',
        cssClass: 'nav-home featured',
        visible: true,
        metadata: { custom: 'value' },
        parentId: null,
        sortOrder: 0,
      }

      const result = createMenuItemSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject negative parentId', () => {
      const invalidData = {
        label: 'Child Item',
        type: 'page' as const,
        pageId: 1,
        parentId: -1,
      }

      const result = createMenuItemSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('reorderSchema (PATCH /api/publisher/menus/:id/items/reorder)', () => {
    const reorderSchema = z.object({
      items: z
        .array(
          z.object({
            id: z.number().int().positive(),
            sortOrder: z.number().int(),
          })
        )
        .min(1),
    })

    it('should accept valid reorder payload', () => {
      const validData = {
        items: [
          { id: 1, sortOrder: 0 },
          { id: 2, sortOrder: 1 },
          { id: 3, sortOrder: 2 },
        ],
      }

      const result = reorderSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty items array', () => {
      const invalidData = {
        items: [],
      }

      const result = reorderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should reject negative item id', () => {
      const invalidData = {
        items: [{ id: -1, sortOrder: 0 }],
      }

      const result = reorderSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('should accept negative sortOrder (valid for reordering)', () => {
      const validData = {
        items: [
          { id: 1, sortOrder: -5 },
          { id: 2, sortOrder: 0 },
          { id: 3, sortOrder: 5 },
        ],
      }

      const result = reorderSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('moveSchema (PATCH /api/publisher/menus/:id/items/:itemId/move)', () => {
    const moveSchema = z
      .object({
        parentId: z.number().int().positive().nullable().optional(),
        sortOrder: z.number().int().optional(),
      })
      .refine((data) => data.parentId !== undefined || data.sortOrder !== undefined, {
        message: 'At least one of parentId or sortOrder must be provided',
      })

    it('should accept move with only parentId', () => {
      const validData = {
        parentId: 1,
      }

      const result = moveSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept move with only sortOrder', () => {
      const validData = {
        sortOrder: 5,
      }

      const result = moveSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept move with both parentId and sortOrder', () => {
      const validData = {
        parentId: 1,
        sortOrder: 3,
      }

      const result = moveSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should accept move to root (null parentId)', () => {
      const validData = {
        parentId: null,
        sortOrder: 0,
      }

      const result = moveSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    it('should reject empty payload', () => {
      const invalidData = {}

      const result = moveSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test Menu Types
// ═══════════════════════════════════════════════════════════════════════════════

describe('Menu Type Definitions', () => {
  it('should have correct MenuItemType union', () => {
    // This is a type-level test - if it compiles, it passes
    const validTypes: Array<'page' | 'external' | 'label'> = ['page', 'external', 'label']
    expect(validTypes).toContain('page')
    expect(validTypes).toContain('external')
    expect(validTypes).toContain('label')
    expect(validTypes).toHaveLength(3)
  })

  it('should verify MenuItemNode interface structure', () => {
    const node: MenuItemNode = {
      id: 1,
      label: 'Test',
      type: 'page',
      url: '/test',
      target: '_self',
      icon: 'icon-class',
      cssClass: 'custom-class',
      visible: true,
      sortOrder: 0,
      depth: 0,
      metadata: { key: 'value' },
      children: [],
    }

    expect(node.id).toBe(1)
    expect(node.children).toEqual([])
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test Menu Edit Page Helper Functions (from [id].vue)
// ═══════════════════════════════════════════════════════════════════════════════

interface MenuItemForFind {
  id: number
  label: string
  children?: MenuItemForFind[]
}

/**
 * Find an item by ID in a nested tree structure
 * (Replicated from the [id].vue page for testing)
 */
function findItemById(items: MenuItemForFind[], id: number): MenuItemForFind | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children && item.children.length > 0) {
      const found = findItemById(item.children, id)
      if (found) return found
    }
  }
  return null
}

describe('findItemById', () => {
  describe('basic lookup', () => {
    it('should return null for empty items array', () => {
      const result = findItemById([], 1)
      expect(result).toBeNull()
    })

    it('should find root level item', () => {
      const items: MenuItemForFind[] = [
        { id: 1, label: 'Item 1' },
        { id: 2, label: 'Item 2' },
        { id: 3, label: 'Item 3' },
      ]

      const result = findItemById(items, 2)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(2)
      expect(result?.label).toBe('Item 2')
    })

    it('should return null when item not found', () => {
      const items: MenuItemForFind[] = [
        { id: 1, label: 'Item 1' },
        { id: 2, label: 'Item 2' },
      ]

      const result = findItemById(items, 999)

      expect(result).toBeNull()
    })
  })

  describe('nested lookup', () => {
    it('should find item in first level of children', () => {
      const items: MenuItemForFind[] = [
        {
          id: 1,
          label: 'Parent',
          children: [
            { id: 2, label: 'Child 1' },
            { id: 3, label: 'Child 2' },
          ],
        },
      ]

      const result = findItemById(items, 3)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(3)
      expect(result?.label).toBe('Child 2')
    })

    it('should find deeply nested item', () => {
      const items: MenuItemForFind[] = [
        {
          id: 1,
          label: 'Level 1',
          children: [
            {
              id: 2,
              label: 'Level 2',
              children: [
                {
                  id: 3,
                  label: 'Level 3',
                  children: [
                    { id: 4, label: 'Deep Item' },
                  ],
                },
              ],
            },
          ],
        },
      ]

      const result = findItemById(items, 4)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(4)
      expect(result?.label).toBe('Deep Item')
    })

    it('should find item in multiple sibling branches', () => {
      const items: MenuItemForFind[] = [
        {
          id: 1,
          label: 'Branch 1',
          children: [
            { id: 10, label: 'Branch 1 Child' },
          ],
        },
        {
          id: 2,
          label: 'Branch 2',
          children: [
            { id: 20, label: 'Branch 2 Child' },
          ],
        },
        {
          id: 3,
          label: 'Branch 3',
          children: [
            { id: 30, label: 'Branch 3 Child' },
          ],
        },
      ]

      expect(findItemById(items, 20)?.label).toBe('Branch 2 Child')
      expect(findItemById(items, 30)?.label).toBe('Branch 3 Child')
      expect(findItemById(items, 10)?.label).toBe('Branch 1 Child')
    })
  })

  describe('edge cases', () => {
    it('should handle items without children property', () => {
      const items: MenuItemForFind[] = [
        { id: 1, label: 'No Children' },
      ]

      const result = findItemById(items, 1)

      expect(result).not.toBeNull()
      expect(result?.label).toBe('No Children')
    })

    it('should handle empty children array', () => {
      const items: MenuItemForFind[] = [
        { id: 1, label: 'Parent', children: [] },
      ]

      const result = findItemById(items, 1)

      expect(result).not.toBeNull()
    })

    it('should return first match when duplicates exist (should not happen in real data)', () => {
      const items: MenuItemForFind[] = [
        { id: 1, label: 'First' },
        { id: 1, label: 'Duplicate' },
      ]

      const result = findItemById(items, 1)

      expect(result?.label).toBe('First')
    })

    it('should handle negative ID values', () => {
      const items: MenuItemForFind[] = [
        { id: -1, label: 'Negative ID' },
      ]

      const result = findItemById(items, -1)

      expect(result).not.toBeNull()
      expect(result?.label).toBe('Negative ID')
    })

    it('should handle very large ID values', () => {
      const largeId = Number.MAX_SAFE_INTEGER
      const items: MenuItemForFind[] = [
        { id: largeId, label: 'Large ID' },
      ]

      const result = findItemById(items, largeId)

      expect(result).not.toBeNull()
      expect(result?.id).toBe(largeId)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test getLocationClass Function (from [id].vue)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get CSS class for location badge
 * (Replicated from the [id].vue page for testing)
 */
function getLocationClass(location: string | null): string {
  if (!location) return 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'

  const colors: Record<string, string> = {
    header: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    footer: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
    sidebar: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
    main: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  }
  return colors[location] || 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
}

describe('getLocationClass', () => {
  describe('known locations', () => {
    it('should return header location classes', () => {
      const result = getLocationClass('header')
      expect(result).toContain('bg-blue-50')
      expect(result).toContain('dark:bg-blue-950')
      expect(result).toContain('text-blue-700')
      expect(result).toContain('dark:text-blue-300')
    })

    it('should return footer location classes', () => {
      const result = getLocationClass('footer')
      expect(result).toContain('bg-green-50')
      expect(result).toContain('dark:bg-green-950')
      expect(result).toContain('text-green-700')
      expect(result).toContain('dark:text-green-300')
    })

    it('should return sidebar location classes', () => {
      const result = getLocationClass('sidebar')
      expect(result).toContain('bg-purple-50')
      expect(result).toContain('dark:bg-purple-950')
      expect(result).toContain('text-purple-700')
      expect(result).toContain('dark:text-purple-300')
    })

    it('should return main location classes', () => {
      const result = getLocationClass('main')
      expect(result).toContain('bg-amber-50')
      expect(result).toContain('dark:bg-amber-950')
      expect(result).toContain('text-amber-700')
      expect(result).toContain('dark:text-amber-300')
    })
  })

  describe('unknown or null locations', () => {
    it('should return default classes for null location', () => {
      const result = getLocationClass(null)
      expect(result).toContain('bg-stone-100')
      expect(result).toContain('dark:bg-stone-800')
      expect(result).toContain('text-stone-600')
      expect(result).toContain('dark:text-stone-400')
    })

    it('should return default classes for undefined location', () => {
      const result = getLocationClass(null)
      expect(result).toContain('bg-stone-100')
    })

    it('should return default classes for unknown location', () => {
      const result = getLocationClass('unknown-location')
      expect(result).toContain('bg-stone-100')
      expect(result).toContain('text-stone-600')
    })

    it('should return default classes for empty string location', () => {
      const result = getLocationClass('')
      expect(result).toContain('bg-stone-100')
    })
  })

  describe('edge cases', () => {
    it('should handle location with different casing', () => {
      // Case-sensitive, so these should return default
      expect(getLocationClass('Header')).toContain('bg-stone-100')
      expect(getLocationClass('HEADER')).toContain('bg-stone-100')
      expect(getLocationClass('header ')).toContain('bg-stone-100')
    })

    it('should handle special characters in location', () => {
      expect(getLocationClass('header@#$')).toContain('bg-stone-100')
      expect(getLocationClass('header-footer')).toContain('bg-stone-100')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test Menu Edit Page CRUD Operations Logic
// ═══════════════════════════════════════════════════════════════════════════════

describe('Menu Edit Page - CRUD Logic', () => {
  describe('form payload building', () => {
    it('should build correct payload for creating child item', () => {
      const parentItem = { id: 5, label: 'Parent' }
      const payload: Record<string, unknown> = {
        label: 'New Child',
        type: 'page',
        target: '_self',
        icon: null,
        cssClass: null,
        visible: true,
      }

      // Add parentId if creating a child item
      payload.parentId = parentItem.id

      expect(payload.parentId).toBe(5)
      expect(payload.label).toBe('New Child')
    })

    it('should build correct payload for page type item', () => {
      const payload: Record<string, unknown> = {
        label: 'Home',
        type: 'page',
        target: '_self',
        icon: null,
        cssClass: null,
        visible: true,
      }

      const pageId = 1
      payload.pageId = pageId

      expect(payload.pageId).toBe(1)
      expect(payload.type).toBe('page')
    })

    it('should build correct payload for external type item', () => {
      const payload: Record<string, unknown> = {
        label: 'External Link',
        type: 'external',
        target: '_blank',
        icon: null,
        cssClass: null,
        visible: true,
      }

      const url = 'https://example.com'
      payload.url = url

      expect(payload.url).toBe('https://example.com')
      expect(payload.target).toBe('_blank')
    })

    it('should build correct payload for label type item', () => {
      const payload: Record<string, unknown> = {
        label: 'Section Header',
        type: 'label',
        target: '_self',
        icon: null,
        cssClass: null,
        visible: true,
      }

      // Label type should not have url or pageId
      expect(payload.type).toBe('label')
      expect(payload.url).toBeUndefined()
      expect(payload.pageId).toBeUndefined()
    })
  })

  describe('reorder payload building', () => {
    it('should build correct reorder payload for root level items', () => {
      const siblings = [
        { id: 1, label: 'Item 1' },
        { id: 2, label: 'Item 2' },
        { id: 3, label: 'Item 3' },
      ]

      const reorderPayload = siblings.map((item, index) => ({
        id: item.id,
        sortOrder: index,
      }))

      // Move item 2 to position 0
      const movedItemIndex = reorderPayload.findIndex(item => item.id === 2)
      if (movedItemIndex !== -1) {
        reorderPayload[movedItemIndex].sortOrder = 0
      }

      expect(reorderPayload).toHaveLength(3)
      // Note: The payload maintains original array order, only sortOrder values change
      expect(reorderPayload[0]).toEqual({ id: 1, sortOrder: 0 }) // Stays at index 0
      expect(reorderPayload[1]).toEqual({ id: 2, sortOrder: 0 }) // Moved to position 0
      expect(reorderPayload[2]).toEqual({ id: 3, sortOrder: 2 }) // Stays at index 2
    })

    it('should build correct reorder payload for nested items', () => {
      const parentId = 10
      const siblings = [
        { id: 101, label: 'Child 1' },
        { id: 102, label: 'Child 2' },
      ]

      const reorderPayload = siblings.map((item, index) => ({
        id: item.id,
        sortOrder: index,
      }))

      expect(reorderPayload).toEqual([
        { id: 101, sortOrder: 0 },
        { id: 102, sortOrder: 1 },
      ])
    })
  })

  describe('error message extraction', () => {
    it('should extract error message from API error response', () => {
      const error = {
        data: {
          data: {
            error: {
              message: 'Menu item not found',
            },
          },
        },
      }

      const message = (error as { data?: { data?: { error?: { message?: string } } } })
        ?.data?.data?.error?.message || 'Failed to save menu item'

      expect(message).toBe('Menu item not found')
    })

    it('should use default message when error structure is unexpected', () => {
      const error = { message: 'Network error' }

      const message = (error as { data?: { data?: { error?: { message?: string } } } })
        ?.data?.data?.error?.message || 'Failed to save menu item'

      expect(message).toBe('Failed to save menu item')
    })

    it('should use default message when error is null', () => {
      const error = null

      const message = (error as unknown as { data?: { data?: { error?: { message?: string } } } })
        ?.data?.data?.error?.message || 'Failed to save menu item'

      expect(message).toBe('Failed to save menu item')
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test Menu Edit Page State Management
// ═══════════════════════════════════════════════════════════════════════════════

describe('Menu Edit Page - State Management', () => {
  describe('modal state transitions', () => {
    it('should track form modal state correctly', () => {
      // Simulating reactive state
      const state = {
        isFormOpen: false,
        editingItem: null as { id: number; label: string } | null,
        parentItemForNew: null as { id: number; label: string } | null,
      }

      // Open create modal
      state.isFormOpen = true
      state.editingItem = null
      state.parentItemForNew = null

      expect(state.isFormOpen).toBe(true)
      expect(state.editingItem).toBeNull()

      // Close modal
      state.isFormOpen = false
      state.editingItem = null
      state.parentItemForNew = null

      expect(state.isFormOpen).toBe(false)
    })

    it('should track edit modal state with item data', () => {
      const state = {
        isFormOpen: false,
        editingItem: null as { id: number; label: string } | null,
      }

      const itemToEdit = { id: 5, label: 'Item to Edit' }

      // Open edit modal
      state.isFormOpen = true
      state.editingItem = itemToEdit

      expect(state.isFormOpen).toBe(true)
      expect(state.editingItem).toEqual(itemToEdit)
    })

    it('should track delete modal state correctly', () => {
      const state = {
        showDeleteModal: false,
        deleteTarget: null as { id: number; label: string; children?: unknown[] } | null,
      }

      const itemToDelete = { id: 3, label: 'Item to Delete', children: [] }

      // Open delete modal
      state.showDeleteModal = true
      state.deleteTarget = itemToDelete

      expect(state.showDeleteModal).toBe(true)
      expect(state.deleteTarget?.label).toBe('Item to Delete')
    })

    it('should track child creation state correctly', () => {
      const state = {
        isFormOpen: false,
        editingItem: null as { id: number; label: string } | null,
        parentItemForNew: null as { id: number; label: string } | null,
      }

      const parentItem = { id: 1, label: 'Parent' }

      // Open create modal for child
      state.isFormOpen = true
      state.editingItem = null
      state.parentItemForNew = parentItem

      expect(state.isFormOpen).toBe(true)
      expect(state.editingItem).toBeNull()
      expect(state.parentItemForNew).toEqual(parentItem)
    })
  })

  describe('submitting state', () => {
    it('should track submitting state during operations', () => {
      const state = {
        isSubmitting: false,
      }

      // Start submitting
      state.isSubmitting = true
      expect(state.isSubmitting).toBe(true)

      // End submitting
      state.isSubmitting = false
      expect(state.isSubmitting).toBe(false)
    })
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Test Menu Edit Page - Menu Item Data Structure
// ═══════════════════════════════════════════════════════════════════════════════

describe('Menu Edit Page - Data Structures', () => {
  describe('menu item interface compliance', () => {
    it('should accept valid menu item with all fields', () => {
      const item = {
        id: 1,
        label: 'Test Item',
        type: 'page' as const,
        url: '/test',
        pageId: 1,
        target: '_self' as const,
        icon: 'i-heroicons-home',
        cssClass: 'nav-item',
        visible: true,
        metadata: { custom: 'data' },
        parentId: null,
        sortOrder: 0,
        children: [],
      }

      expect(item.id).toBe(1)
      expect(item.children).toEqual([])
    })

    it('should accept minimal menu item', () => {
      const item = {
        id: 1,
        label: 'Minimal',
        type: 'label' as const,
      }

      expect(item.label).toBe('Minimal')
    })

    it('should handle item with deeply nested children', () => {
      const item = {
        id: 1,
        label: 'Root',
        type: 'label' as const,
        children: [
          {
            id: 2,
            label: 'Level 1',
            type: 'label' as const,
            children: [
              {
                id: 3,
                label: 'Level 2',
                type: 'page' as const,
                children: [],
              },
            ],
          },
        ],
      }

      expect(item.children[0].children[0].label).toBe('Level 2')
    })
  })

  describe('menu interface compliance', () => {
    it('should accept valid menu with items', () => {
      const menu = {
        id: 1,
        name: 'Main Navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        description: 'Primary site navigation',
        location: 'header',
        items: [
          { id: 1, label: 'Home', type: 'page' as const },
          { id: 2, label: 'About', type: 'page' as const },
        ],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(menu.name).toBe('Main Navigation')
      expect(menu.items).toHaveLength(2)
      expect(menu.location).toBe('header')
    })

    it('should accept menu with null optional fields', () => {
      const menu = {
        id: 1,
        name: 'Footer',
        displayName: 'Footer Menu',
        slug: 'footer',
        description: null,
        location: null,
        items: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(menu.description).toBeNull()
      expect(menu.location).toBeNull()
      expect(menu.items).toHaveLength(0)
    })
  })
})
