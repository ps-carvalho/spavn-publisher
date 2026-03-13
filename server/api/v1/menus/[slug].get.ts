import { getDb, getSchema } from '../../../utils/publisher/database'
import { eq, asc, inArray } from 'drizzle-orm'
import type { MenuItemType, MenuItemNode } from '../../../../lib/publisher/types'

/**
 * GET /api/v1/menus/[slug]
 * Get single menu with hierarchical tree of items
 * No auth required (public API)
 */

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

interface PageReference {
  id: number
  slug: string
}

/**
 * Build a hierarchical tree structure from flat menu items
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
 * Updates the items in place with the resolved URL
 */
async function resolvePageUrls(
  items: FlatMenuItem[],
  pages: PageReference[]
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

export default defineEventHandler(async (event) => {
  // Validate slug parameter
  const slug = getRouterParam(event, 'slug')

  if (!slug || typeof slug !== 'string' || slug.trim() === '') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Missing or invalid slug parameter', code: 'INVALID_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherMenus, publisherMenuItems, publisherPages } = await getSchema()

  // Fetch the menu by slug
  const [menu] = await db
    .select()
    .from(publisherMenus)
    .where(eq(publisherMenus.slug, slug))

  if (!menu) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Menu not found', code: 'NOT_FOUND' } },
    })
  }

  // Fetch all items for this menu
  // Order by: parent_id NULLS FIRST, then sort_order
  const rawItems = await db
    .select({
      id: publisherMenuItems.id,
      parentId: publisherMenuItems.parentId,
      sortOrder: publisherMenuItems.sortOrder,
      label: publisherMenuItems.label,
      type: publisherMenuItems.type,
      url: publisherMenuItems.url,
      target: publisherMenuItems.target,
      icon: publisherMenuItems.icon,
      cssClass: publisherMenuItems.cssClass,
      visible: publisherMenuItems.visible,
      metadata: publisherMenuItems.metadata,
    })
    .from(publisherMenuItems)
    .where(eq(publisherMenuItems.menuId, menu.id))
    .orderBy(asc(publisherMenuItems.parentId), asc(publisherMenuItems.sortOrder))

  // Filter to only visible items first
  const visibleItems = rawItems.filter((item) => item.visible)

  // Collect page IDs that need URL resolution
  const pageIds: number[] = []
  for (const item of visibleItems) {
    if (item.type === 'page' && item.metadata?.pageId) {
      pageIds.push(item.metadata.pageId as number)
    }
  }

  // Resolve page URLs if there are any page-type items
  if (pageIds.length > 0) {
    const pages = await db
      .select({
        id: publisherPages.id,
        slug: publisherPages.slug,
      })
      .from(publisherPages)
      .where(inArray(publisherPages.id, pageIds))

    await resolvePageUrls(visibleItems as FlatMenuItem[], pages as PageReference[])
  }

  // Build hierarchical tree
  const treeItems = buildMenuTree(visibleItems as FlatMenuItem[])

  return {
    data: {
      id: menu.id,
      name: menu.name,
      slug: menu.slug,
      description: menu.description,
      location: menu.location,
      items: treeItems,
    },
  }
})
