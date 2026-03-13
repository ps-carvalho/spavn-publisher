import { eq, and } from 'drizzle-orm'
import { getDb, getSchema } from './database'

export type FolderPermissionLevel = 'read' | 'write' | 'admin'

/**
 * Permission hierarchy: admin > write > read
 * admin implies write and read
 * write implies read
 */
const PERMISSION_HIERARCHY: Record<FolderPermissionLevel, number> = {
  read: 1,
  write: 2,
  admin: 3,
}

// Maximum depth for permission inheritance to prevent stack overflow
const MAX_PERMISSION_DEPTH = 50

/**
 * Check if a user role has the required permission on a folder.
 *
 * Permission resolution order:
 * 1. Super-admin and admin roles always have full access (bypass check)
 * 2. Check explicit permission on the folder for the user's role
 * 3. Walk up parent chain — inherit from nearest ancestor with a permission
 * 4. If no permission found anywhere, default to 'read' for editors, deny for viewers
 *
 * @param folderId - The folder to check permissions on
 * @param userRole - The user's role
 * @param requiredPermission - The permission level required
 * @param _depth - Internal: recursion depth counter (prevents stack overflow)
 */
export async function checkFolderPermission(
  folderId: number,
  userRole: string,
  requiredPermission: FolderPermissionLevel,
  _depth: number = 0,
): Promise<boolean> {
  // Prevent stack overflow from deeply nested folder structures
  if (_depth > MAX_PERMISSION_DEPTH) {
    console.error(`Permission check exceeded max depth of ${MAX_PERMISSION_DEPTH} for folder ${folderId}`)
    return false
  }

  // Super-admin and admin bypass all permission checks
  if (userRole === 'super-admin' || userRole === 'admin') {
    return true
  }

  const db = await getDb()
  const { publisherFolderPermissions, publisherFolders } = await getSchema()
  const requiredLevel = PERMISSION_HIERARCHY[requiredPermission]

  // Check explicit permission on this folder
  const [explicit] = await db
    .select()
    .from(publisherFolderPermissions)
    .where(
      and(
        eq(publisherFolderPermissions.folderId, folderId),
        eq(publisherFolderPermissions.roleId, userRole),
      ),
    )
    .limit(1)

  if (explicit) {
    const grantedLevel = PERMISSION_HIERARCHY[explicit.permission as FolderPermissionLevel] || 0
    return grantedLevel >= requiredLevel
  }

  // Walk up parent chain for inherited permissions
  const [folder] = await db
    .select({ parentId: publisherFolders.parentId })
    .from(publisherFolders)
    .where(eq(publisherFolders.id, folderId))
    .limit(1)

  if (folder?.parentId) {
    return checkFolderPermission(folder.parentId, userRole, requiredPermission, _depth + 1)
  }

  // No explicit permission found — apply defaults
  // Editors get read access by default, viewers get nothing
  if (userRole === 'editor') {
    return requiredPermission === 'read'
  }

  return false
}

/**
 * Get the effective permission for a role on a folder.
 * Returns the permission level or null if no access.
 *
 * @param folderId - The folder to check permissions on
 * @param userRole - The user's role
 * @param _depth - Internal: recursion depth counter (prevents stack overflow)
 */
export async function getEffectivePermission(
  folderId: number,
  userRole: string,
  _depth: number = 0,
): Promise<FolderPermissionLevel | null> {
  // Prevent stack overflow from deeply nested folder structures
  if (_depth > MAX_PERMISSION_DEPTH) {
    console.error(`Permission check exceeded max depth of ${MAX_PERMISSION_DEPTH} for folder ${folderId}`)
    return null
  }

  if (userRole === 'super-admin' || userRole === 'admin') {
    return 'admin'
  }

  const db = await getDb()
  const { publisherFolderPermissions, publisherFolders } = await getSchema()

  // Check explicit permission
  const [explicit] = await db
    .select()
    .from(publisherFolderPermissions)
    .where(
      and(
        eq(publisherFolderPermissions.folderId, folderId),
        eq(publisherFolderPermissions.roleId, userRole),
      ),
    )
    .limit(1)

  if (explicit) {
    return explicit.permission as FolderPermissionLevel
  }

  // Walk up parent chain
  const [folder] = await db
    .select({ parentId: publisherFolders.parentId })
    .from(publisherFolders)
    .where(eq(publisherFolders.id, folderId))
    .limit(1)

  if (folder?.parentId) {
    return getEffectivePermission(folder.parentId, userRole, _depth + 1)
  }

  // Default: editors get read, viewers get nothing
  if (userRole === 'editor') return 'read'
  return null
}

/**
 * Get all permissions for a folder (for admin UI).
 */
export async function getFolderPermissions(folderId: number) {
  const db = await getDb()
  const { publisherFolderPermissions } = await getSchema()
  return db
    .select()
    .from(publisherFolderPermissions)
    .where(eq(publisherFolderPermissions.folderId, folderId))
}

/**
 * Set permission for a role on a folder (upsert).
 */
export async function setFolderPermission(
  folderId: number,
  roleId: string,
  permission: FolderPermissionLevel,
) {
  const db = await getDb()
  const { publisherFolderPermissions } = await getSchema()

  // Try to update existing
  const [existing] = await db
    .select()
    .from(publisherFolderPermissions)
    .where(
      and(
        eq(publisherFolderPermissions.folderId, folderId),
        eq(publisherFolderPermissions.roleId, roleId),
      ),
    )
    .limit(1)

  if (existing) {
    await db
      .update(publisherFolderPermissions)
      .set({ permission })
      .where(eq(publisherFolderPermissions.id, existing.id))
    return { ...existing, permission }
  }

  const [created] = await db
    .insert(publisherFolderPermissions)
    .values({ folderId, roleId, permission })
    .returning()

  return created
}

/**
 * Remove permission for a role on a folder.
 */
export async function removeFolderPermission(folderId: number, roleId: string) {
  const db = await getDb()
  const { publisherFolderPermissions } = await getSchema()
  await db
    .delete(publisherFolderPermissions)
    .where(
      and(
        eq(publisherFolderPermissions.folderId, folderId),
        eq(publisherFolderPermissions.roleId, roleId),
      ),
    )
}
