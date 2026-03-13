/**
 * Centralized type definitions for the Publisher CMS Media system.
 * These types are used across components, composables, and API endpoints.
 */

// ─── Media Types ─────────────────────────────────────────────────────

/**
 * Represents an uploaded media file in the system.
 */
export interface MediaItem {
  id: number
  name: string
  originalName: string
  mimeType: string
  size: number
  width: number | null
  height: number | null
  url: string
  formats?: Record<string, MediaFormat>
  alternativeText: string | null
  folderId: number | null
  storageProvider?: string | null
  storageKey?: string | null
  createdAt: string
}

/**
 * A specific format/variant of a media file (e.g., thumbnail, small, large).
 */
export interface MediaFormat {
  url: string
  width: number
  height: number
}

// ─── Folder Types ────────────────────────────────────────────────────

/**
 * Represents a folder in the media library.
 */
export interface Folder {
  id: number | string
  name: string
  path: string
  parentId?: number | null
  children?: Folder[]
  itemCount?: number
  previewThumbnail?: string
  createdAt?: string
}

/**
 * A folder node in the tree structure (with nested children).
 */
export interface FolderNode extends Folder {
  children: FolderNode[]
}

/**
 * Detailed folder information including breadcrumb.
 */
export interface FolderDetail {
  id: number
  name: string
  parentId: number | null
  breadcrumb: Array<{ id: number; name: string }>
}

/**
 * Folder tree node from server (mirrored from server/utils/publisher/folders.ts
 * to avoid #server alias dependency).
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
 * Folder tree node with media count.
 */
export interface FolderTreeNodeWithCount extends FolderTreeNode {
  mediaCount?: number
}

// ─── Selection Types ──────────────────────────────────────────────────

/**
 * Selection mode for the media picker.
 */
export type SelectionMode = 'single' | 'multiple' | 'folder'

/**
 * View mode for the file browser.
 */
export type ViewMode = 'grid' | 'list'

/**
 * Options for opening the media picker.
 */
export interface MediaPickerOptions {
  multiple?: boolean
  allowedTypes?: string[]
  allowFolderSelection?: boolean
  maxSelection?: number
  initialSelection?: number | number[]
  label?: string
}

// ─── API Response Types ───────────────────────────────────────────────

/**
 * Paginated API response wrapper.
 */
export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    pagination: {
      page: number
      pageSize: number
      total: number
      pageCount: number
    }
    folder?: {
      id: number
      name: string
      path: string
    }
  }
}

/**
 * Single item API response wrapper.
 */
export interface SingleResponse<T> {
  data: T
}

/**
 * Metadata for media list responses including storage info.
 */
export interface MediaListMeta {
  pagination: { total: number; pageCount: number }
  storage?: {
    defaultProvider: string
    availableProviders: string[]
  }
}

// ─── Utility Types ────────────────────────────────────────────────────

/**
 * Media preview data for UI display.
 */
export interface MediaPreview {
  id: number
  name: string
  originalName: string
  mimeType: string
  thumbnailUrl: string
  fullUrl: string
  width?: number
  height?: number
  size: number
  alternativeText?: string
}

/**
 * Breadcrumb item for folder navigation.
 */
export interface BreadcrumbItem {
  label: string
  id: number | string
}
