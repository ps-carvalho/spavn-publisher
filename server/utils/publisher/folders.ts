import { eq, like } from 'drizzle-orm'
import { getDb, getSchema } from './database'

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * Represents a single item in a folder's breadcrumb trail.
 */
export interface FolderBreadcrumb {
  id: number
  name: string
  slug: string
  path: string
}

/**
 * Represents a folder node in a hierarchical tree structure.
 */
export interface FolderTreeNode {
  id: number
  name: string
  slug: string
  parentId: number | null
  path: string
  createdAt: string
  updatedAt: string
  children: FolderTreeNode[]
}

/**
 * Result of validating a folder name.
 */
export interface FolderNameValidation {
  valid: boolean
  error?: string
}

// ─── SQL LIKE Pattern Escaping ──────────────────────────────────────────────

/**
 * Escape special characters in a string for use in SQL LIKE patterns.
 * Escapes: % _ [ ]
 */
export function escapeLikePattern(str: string): string {
  return str.replace(/[%_[\]\\]/g, '\\$&')
}

// ─── Reserved Names ────────────────────────────────────────────────────────

/**
 * Reserved names that cannot be used for folders (Windows compatibility).
 * These names are reserved for devices and special purposes on Windows.
 */
const RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9',
])

/**
 * Characters that are invalid in folder names across platforms.
 */
const INVALID_CHARS_PATTERN = /[\/\\:*?"<>|]/

// ─── Slug Generation ───────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a folder name.
 * 
 * Converts the name to lowercase, replaces spaces and special characters
 * with dashes, removes leading/trailing dashes, and collapses multiple
 * consecutive dashes into one.
 * 
 * @param name - The folder name to convert to a slug
 * @returns A URL-safe slug string, or empty string if name contains no valid characters
 * 
 * @example
 * generateSlug('My Folder Name') // Returns 'my-folder-name'
 * generateSlug('Test@Folder!123') // Returns 'test-folder-123'
 * generateSlug('   spaces   ') // Returns 'spaces'
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]/g, '-') // Replace special chars with dash
    .replace(/-+/g, '-') // Collapse multiple dashes
    .replace(/^-|-$/g, '') // Remove leading/trailing dashes
}

// ─── Validation ────────────────────────────────────────────────────────────

/**
 * Validate a folder name for common issues.
 * 
 * Checks for:
 * - Empty names
 * - Names that would result in an empty slug
 * - Reserved Windows device names (CON, PRN, AUX, NUL, COM1-9, LPT1-9)
 * - Invalid characters (/, \, :, *, ?, ", <, >, |)
 * 
 * @param name - The folder name to validate
 * @returns Validation result with error message if invalid
 * 
 * @example
 * validateFolderName('My Folder') // { valid: true }
 * validateFolderName('CON') // { valid: false, error: '...' }
 * validateFolderName('folder/name') // { valid: false, error: '...' }
 */
export function validateFolderName(name: string): FolderNameValidation {
  // Check if name is empty
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Folder name cannot be empty' }
  }

  // Check if name exceeds max length
  if (name.length > 255) {
    return { valid: false, error: 'Folder name must be 255 characters or less' }
  }

  // Check if slug would be empty
  const slug = generateSlug(name)
  if (!slug) {
    return { valid: false, error: 'Folder name must contain alphanumeric characters' }
  }

  // Check for reserved names (case-insensitive)
  const upperName = name.toUpperCase().trim()
  if (RESERVED_NAMES.has(upperName)) {
    return { valid: false, error: `"${name}" is a reserved name and cannot be used` }
  }

  // Check for invalid characters
  if (INVALID_CHARS_PATTERN.test(name)) {
    return { valid: false, error: 'Folder name contains invalid characters (/, \\, :, *, ?, ", <, >, |)' }
  }

  return { valid: true }
}

// ─── Path Building ──────────────────────────────────────────────────────────

/**
 * Build the full folder path by combining parent path with slug.
 * 
 * Root folders have paths like "/slug", while nested folders have
 * paths like "/parent/child/grandchild".
 * 
 * @param db - Drizzle database instance
 * @param parentId - Parent folder ID, or null for root folders
 * @param slug - The slug of the current folder
 * @returns The full path string for the folder
 * 
 * @example
 * // Root folder
 * await buildFolderPath(db, null, 'images') // Returns '/images'
 * 
 * // Nested folder
 * await buildFolderPath(db, 5, 'photos') // Returns '/media/images/photos' (if parent path is '/media/images')
 */
export async function buildFolderPath(
  db: Awaited<ReturnType<typeof getDb>>,
  parentId: number | null,
  slug: string,
): Promise<string> {
  const { publisherFolders } = await getSchema()
  if (!parentId) return `/${slug}`

  const [parent] = await db
    .select()
    .from(publisherFolders)
    .where(eq(publisherFolders.id, parentId))
    .limit(1)

  return parent ? `${parent.path}/${slug}` : `/${slug}`
}

// ─── Breadcrumb Trail ───────────────────────────────────────────────────────

/**
 * Get the breadcrumb trail for a folder (path from root to current folder).
 * 
 * Returns an array of folder objects starting from the root folder
 * and ending with the specified folder, useful for building navigation UI.
 * 
 * @param db - Drizzle database instance
 * @param folderId - The ID of the folder to get the breadcrumb trail for
 * @returns Array of folder breadcrumbs from root to current, or empty array if not found
 * 
 * @example
 * // For folder at path '/media/images/photos'
 * await getBreadcrumbTrail(db, 15)
 * // Returns:
 * // [
 * //   { id: 1, name: 'Media', slug: 'media', path: '/media' },
 * //   { id: 5, name: 'Images', slug: 'images', path: '/media/images' },
 * //   { id: 15, name: 'Photos', slug: 'photos', path: '/media/images/photos' }
 * // ]
 */
export async function getBreadcrumbTrail(
  db: Awaited<ReturnType<typeof getDb>>,
  folderId: number,
): Promise<FolderBreadcrumb[]> {
  const { publisherFolders } = await getSchema()
  // First, get the target folder
  const [folder] = await db
    .select({
      id: publisherFolders.id,
      name: publisherFolders.name,
      slug: publisherFolders.slug,
      parentId: publisherFolders.parentId,
      path: publisherFolders.path,
    })
    .from(publisherFolders)
    .where(eq(publisherFolders.id, folderId))
    .limit(1)

  if (!folder) {
    return []
  }

  // Build breadcrumb trail by walking up the parent chain
  const trail: FolderBreadcrumb[] = []
  let currentFolder = folder

  // Add the current folder to the trail
  trail.unshift({
    id: currentFolder.id,
    name: currentFolder.name,
    slug: currentFolder.slug,
    path: currentFolder.path,
  })

  // Walk up the parent chain
  while (currentFolder.parentId !== null) {
    const [parent] = await db
      .select({
        id: publisherFolders.id,
        name: publisherFolders.name,
        slug: publisherFolders.slug,
        parentId: publisherFolders.parentId,
        path: publisherFolders.path,
      })
      .from(publisherFolders)
      .where(eq(publisherFolders.id, currentFolder.parentId))
      .limit(1)

    if (!parent) break

    trail.unshift({
      id: parent.id,
      name: parent.name,
      slug: parent.slug,
      path: parent.path,
    })

    currentFolder = parent
  }

  return trail
}

// ─── Descendants ────────────────────────────────────────────────────────────

/**
 * Get all descendant folder IDs recursively.
 * 
 * Traverses the folder tree and collects IDs of all folders that are
 * descendants of the specified folder. Useful for:
 * - Preventing circular references when moving folders
 * - Bulk operations on folder hierarchies
 * - Checking folder hierarchy depth
 * 
 * @param db - Drizzle database instance
 * @param folderId - The ID of the parent folder
 * @returns Array of descendant folder IDs (not including the folder itself)
 * 
 * @example
 * // For a folder with children and grandchildren
 * await getDescendantFolderIds(db, 5)
 * // Returns [10, 11, 12, 20, 21] (all descendant IDs)
 */
export async function getDescendantFolderIds(
  db: Awaited<ReturnType<typeof getDb>>,
  folderId: number,
): Promise<number[]> {
  const { publisherFolders } = await getSchema()
  const descendants: number[] = []

  const fetchChildren = async (parentId: number) => {
    const children = await db
      .select({ id: publisherFolders.id })
      .from(publisherFolders)
      .where(eq(publisherFolders.parentId, parentId))

    for (const child of children) {
      descendants.push(child.id)
      await fetchChildren(child.id)
    }
  }

  await fetchChildren(folderId)
  return descendants
}

// ─── Folder Tree ────────────────────────────────────────────────────────────

/**
 * Build a hierarchical tree structure of folders.
 * 
 * Creates a nested tree structure where each folder node contains
 * its children in a `children` array. Can build the full tree or
 * start from a specific folder.
 * 
 * @param db - Drizzle database instance
 * @param rootId - Optional ID of the root folder. If not provided, builds full tree from actual root folders
 * @returns Array of folder tree nodes
 * 
 * @example
 * // Get full folder tree
 * const tree = await getFolderTree(db)
 * // Returns:
 * // [
 * //   {
 * //     id: 1, name: 'Media', slug: 'media', parentId: null,
 * //     path: '/media', children: [
 * //       { id: 5, name: 'Images', ..., children: [] },
 * //       { id: 6, name: 'Videos', ..., children: [...] }
 * //     ]
 * //   }
 * // ]
 * 
 * // Get subtree starting from folder 5
 * const subtree = await getFolderTree(db, 5)
 */
export async function getFolderTree(
  db: Awaited<ReturnType<typeof getDb>>,
  rootId?: number,
): Promise<FolderTreeNode[]> {
  const { publisherFolders } = await getSchema()
  // Fetch all folders
  const folders = await db
    .select()
    .from(publisherFolders)

  // Create a map for quick lookup
  const folderMap = new Map<number, FolderTreeNode>()
  const rootFolders: FolderTreeNode[] = []

  // First pass: create map and initialize children arrays
  for (const folder of folders) {
    folderMap.set(folder.id, {
      id: folder.id,
      name: folder.name,
      slug: folder.slug,
      parentId: folder.parentId,
      path: folder.path,
      createdAt: folder.createdAt,
      updatedAt: folder.updatedAt,
      children: [],
    })
  }

  // If rootId is specified, only return that subtree
  if (rootId !== undefined) {
    const rootNode = folderMap.get(rootId)
    if (!rootNode) {
      return []
    }

    // Build tree starting from rootId
    const buildSubtree = (node: FolderTreeNode) => {
      for (const folder of folders) {
        if (folder.parentId === node.id) {
          const childNode = folderMap.get(folder.id)
          if (childNode) {
            node.children.push(childNode)
            buildSubtree(childNode)
          }
        }
      }
      // Sort children by name
      node.children.sort((a, b) => a.name.localeCompare(b.name))
    }

    buildSubtree(rootNode)
    return [rootNode]
  }

  // Second pass: build full tree structure
  for (const folder of folders) {
    const node = folderMap.get(folder.id)!
    if (folder.parentId === null) {
      rootFolders.push(node)
    } else {
      const parent = folderMap.get(folder.parentId)
      if (parent) {
        parent.children.push(node)
      }
    }
  }

  // Sort children recursively by name
  const sortChildren = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children)
      }
    }
  }

  sortChildren(rootFolders)

  return rootFolders
}

// ─── Path Updates ───────────────────────────────────────────────────────────

/**
 * Update paths for all descendants when a folder is renamed or moved.
 * 
 * When a folder's path changes (due to rename or move), all descendant
 * folders need their paths updated to reflect the new hierarchy.
 * This function finds all descendants whose paths start with the old
 * path and replaces the prefix with the new path.
 * 
 * @param db - Drizzle database instance
 * @param folderId - The ID of the folder that was moved/renamed
 * @param oldPath - The previous path of the folder
 * @param newPath - The new path of the folder
 * 
 * @example
 * // Folder was moved from '/media/images' to '/assets/images'
 * await updateDescendantPaths(db, 5, '/media/images', '/assets/images')
 * // Updates all descendants:
 * // '/media/images/photos' -> '/assets/images/photos'
 * // '/media/images/logos' -> '/assets/images/logos'
 */
export async function updateDescendantPaths(
  db: Awaited<ReturnType<typeof getDb>>,
  folderId: number,
  oldPath: string,
  newPath: string,
): Promise<void> {
  const { publisherFolders } = await getSchema()
  // Find all folders whose path starts with oldPath
  const descendants = await db
    .select()
    .from(publisherFolders)
    .where(like(publisherFolders.path, `${escapeLikePattern(oldPath)}/%`))

  // Update each descendant's path
  for (const descendant of descendants) {
    const updatedPath = descendant.path.replace(oldPath, newPath)
    await db
      .update(publisherFolders)
      .set({
        path: updatedPath,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(publisherFolders.id, descendant.id))
  }
}
