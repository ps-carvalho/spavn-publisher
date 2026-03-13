/**
 * Configuration for the Publisher CMS client
 */
export interface PublisherConfig {
  /** Base URL of the Publisher CMS (e.g., 'https://my-site.com') */
  baseUrl: string
  /** API token for authentication */
  token?: string
  /** Custom fetch implementation (defaults to global fetch) */
  fetch?: typeof fetch
}

/**
 * Pagination metadata returned with list responses
 */
export interface PaginationInfo {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

/**
 * Paginated response wrapper for list endpoints
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: PaginationInfo
}

/**
 * Single item response wrapper
 */
export interface PublisherResponse<T> {
  data: T
}

/**
 * Options for find/list operations
 */
export interface FindOptions {
  page?: number
  pageSize?: number
  sort?: string
  filters?: Record<string, unknown>
}

/**
 * Data for creating a new page
 */
export interface PageCreateData {
  title: string
  pageType: string
  slug?: string
  meta?: Record<string, unknown>
}

/**
 * Data for updating an existing page
 */
export interface PageUpdateData {
  title?: string
  slug?: string
  status?: 'draft' | 'published'
  meta?: Record<string, unknown>
}

/**
 * Data for adding a block to a page
 */
export interface BlockAddData {
  blockType: string
  area: string
  data?: Record<string, unknown>
  sortOrder?: number
}

/**
 * Data for updating a block's content
 */
export interface BlockUpdateData {
  data: Record<string, unknown>
}

/**
 * Data for reordering blocks within an area
 */
export interface BlockReorderData {
  area: string
  blockIds: number[]
}

/**
 * Options for listing media files
 */
export interface MediaListOptions {
  folder?: string
  page?: number
  pageSize?: number
}

/**
 * Options for media upload
 */
export interface MediaUploadOptions {
  folder?: string
  filename?: string
}
