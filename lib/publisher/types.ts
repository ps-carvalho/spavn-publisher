// ─── Menu Types ───────────────────────────────────────────────────

/**
 * Type of menu item
 */
export type MenuItemType = 'page' | 'external' | 'label'

// ─── Field Types ─────────────────────────────────────────────────

export type FieldType =
  | 'string'
  | 'text'
  | 'richtext'
  | 'number'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'uid'
  | 'media'
  | 'relation'
  | 'enum'
  | 'json'
  | 'email'
  | 'password'

export type RelationType = 'oneToOne' | 'oneToMany' | 'manyToOne' | 'manyToMany'

// ─── Field Definition ────────────────────────────────────────────

export interface BaseFieldConfig {
  /** Field type */
  type: FieldType
  /** Whether this field is required */
  required?: boolean
  /** Whether this field must be unique */
  unique?: boolean
  /** Default value */
  default?: unknown
  /** Display label in admin UI */
  label?: string
  /** Help text shown below the field */
  hint?: string
  /** If true, excluded from public API responses */
  private?: boolean
  /** Maximum length (for string types) */
  maxLength?: number
  /** Minimum length (for string types) */
  minLength?: number
}

export interface StringFieldConfig extends BaseFieldConfig {
  type: 'string' | 'text' | 'richtext' | 'email' | 'password'
  default?: string
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: 'number'
  default?: number
  min?: number
  max?: number
}

export interface BooleanFieldConfig extends BaseFieldConfig {
  type: 'boolean'
  default?: boolean
}

export interface DateFieldConfig extends BaseFieldConfig {
  type: 'date' | 'datetime'
  default?: string
}

export interface UidFieldConfig extends BaseFieldConfig {
  type: 'uid'
  /** The field name to generate the UID from */
  targetField: string
}

export interface MediaFieldConfig extends BaseFieldConfig {
  type: 'media'
  /** Allow multiple media files */
  multiple?: boolean
  /** Allowed MIME types */
  allowedTypes?: string[]
  /** Allow selecting an entire folder (for gallery blocks) */
  allowFolderSelection?: boolean
  /** Maximum number of items when multiple is true */
  maxSelection?: number
}

export interface RelationFieldConfig extends BaseFieldConfig {
  type: 'relation'
  /** Name of the related content type */
  relationTo: string
  /** Type of relation */
  relationType: RelationType
}

export interface EnumFieldConfig extends BaseFieldConfig {
  type: 'enum'
  /** Allowed values */
  options: string[]
  default?: string
}

export interface JsonFieldConfig extends BaseFieldConfig {
  type: 'json'
  default?: Record<string, unknown>
}

export type FieldConfig =
  | StringFieldConfig
  | NumberFieldConfig
  | BooleanFieldConfig
  | DateFieldConfig
  | UidFieldConfig
  | MediaFieldConfig
  | RelationFieldConfig
  | EnumFieldConfig
  | JsonFieldConfig

// ─── Content Type Options ────────────────────────────────────────

export interface ContentTypeOptions {
  /** Add status (draft/published) and publishedAt fields */
  draftAndPublish?: boolean
  /** Add createdAt / updatedAt fields */
  timestamps?: boolean
  /** Add deletedAt field, filter deleted from API by default */
  softDelete?: boolean
}

// ─── Content Type Configuration ──────────────────────────────────

export interface ContentTypeConfig {
  /** Internal name (e.g., 'article') */
  name: string
  /** Display name in admin UI (e.g., 'Article') */
  displayName: string
  /** Plural name for API routes (e.g., 'articles') */
  pluralName: string
  /** Icon class for admin sidebar */
  icon?: string
  /** Description shown in admin */
  description?: string
  /** Content type options */
  options?: ContentTypeOptions
  /** Field definitions */
  fields: Record<string, FieldConfig>
}

// ─── Page Builder Types ────────────────────────────────────────────

/**
 * A block instance on a page
 */
export interface PageBlock {
  id: number
  blockType: string
  sortOrder: number
  data: Record<string, unknown>
}

/**
 * Configuration for a reusable block type in the page builder
 */
export interface BlockTypeConfig {
  /** Internal name (e.g., 'hero', 'cta', 'text-block') */
  name: string
  /** Display name in admin UI (e.g., 'Hero Section') */
  displayName: string
  /** Icon class for block picker */
  icon?: string
  /** Category for grouping in block picker (e.g., 'layout', 'media', 'text') */
  category?: string
  /** Description shown in block picker */
  description?: string
  /** Field definitions for block content */
  fields: Record<string, FieldConfig>
}

/**
 * Configuration for a page area that can contain blocks
 */
export interface AreaConfig {
  /** Internal name (e.g., 'main', 'sidebar', 'header') */
  name: string
  /** Display name in admin UI (e.g., 'Main Content') */
  displayName: string
  /** Array of block type names allowed in this area */
  allowedBlocks: string[]
  /** Minimum number of blocks required */
  minBlocks?: number
  /** Maximum number of blocks allowed */
  maxBlocks?: number
}

/**
 * Options for page type configuration
 */
export interface PageTypeOptions extends ContentTypeOptions {
  /** Enable SEO fields (metaTitle, metaDescription, ogImage) */
  seo?: boolean
}

/**
 * Configuration for a page type in the page builder
 */
export interface PageTypeConfig {
  /** Internal name (e.g., 'landing-page', 'blog-post') */
  name: string
  /** Display name in admin UI (e.g., 'Landing Page') */
  displayName: string
  /** Icon class for admin UI */
  icon?: string
  /** Description shown in admin */
  description?: string
  /** Area definitions for this page type */
  areas: Record<string, AreaConfig>
  /** Page type options */
  options?: PageTypeOptions
}

// ─── Menu System Types ─────────────────────────────────────────────

/**
 * Configuration for a menu item
 */
export interface MenuItemConfig {
  /** Display label for the menu item */
  label: string
  /** Type of menu item: 'page' links to CMS page, 'external' links to URL, 'label' is non-clickable */
  type: MenuItemType
  /** URL for external links (required when type is 'external') */
  url?: string
  /** Page ID for internal page links (required when type is 'page') */
  pageId?: number
  /** Link target: '_blank' for new tab, '_self' for same tab (default) */
  target?: '_blank' | '_self'
  /** Icon class or identifier */
  icon?: string
  /** CSS class(es) to apply to the menu item */
  cssClass?: string
  /** Whether the item is visible (default: true) */
  visible?: boolean
  /** Additional metadata for custom use cases */
  metadata?: Record<string, unknown>
  /** Nested child menu items */
  children?: MenuItemConfig[]
}

/**
 * Configuration for a menu
 */
export interface MenuConfig {
  /** Internal name (e.g., 'main-navigation') */
  name: string
  /** Display name in admin UI (e.g., 'Main Navigation') */
  displayName: string
  /** Unique slug for API access (lowercase, alphanumeric, hyphens) */
  slug: string
  /** Description of the menu's purpose */
  description?: string
  /** Location hint for where this menu is used (e.g., 'header', 'footer', 'sidebar') */
  location?: string
  /** Initial menu items (can also be managed via admin UI) */
  items?: MenuItemConfig[]
}

// ─── Menu API Response Types ───────────────────────────────────────

/**
 * A single menu item node in the API response tree
 */
export interface MenuItemNode {
  /** Unique identifier for this menu item */
  id: number
  /** Display label */
  label: string
  /** Type of menu item */
  type: MenuItemType
  /** URL (for external links) or generated URL (for page links) */
  url?: string
  /** Page ID (for page links) */
  pageId?: number
  /** Link target */
  target?: '_blank' | '_self'
  /** Icon class */
  icon?: string
  /** CSS class */
  cssClass?: string
  /** Visibility status */
  visible: boolean
  /** Sort order among siblings */
  sortOrder: number
  /** Depth level in the tree (0 = root) */
  depth: number
  /** Additional metadata */
  metadata?: Record<string, unknown>
  /** Nested child items */
  children: MenuItemNode[]
}

/**
 * Full menu tree response for the public API
 */
export interface MenuTreeResponse {
  /** Menu slug */
  slug: string
  /** Display name */
  displayName: string
  /** Location hint */
  location?: string
  /** Root-level menu items */
  items: MenuItemNode[]
}

// ─── Drag-Drop Operation Types ─────────────────────────────────────

/**
 * Payload for moving a single menu item to a new parent/position
 */
export interface MovePayload {
  /** ID of the menu item being moved */
  itemId: number
  /** New parent ID (null for root level) */
  newParentId: number | null
  /** New position among siblings (0-indexed) */
  newPosition: number
}

/**
 * Single item in a batch reorder operation
 */
export interface ReorderItem {
  /** ID of the menu item */
  id: number
  /** New sort order */
  sortOrder: number
  /** New parent ID (for moving between parents in batch) */
  parentId?: number | null
}

/**
 * Payload for batch reordering menu items
 */
export interface ReorderPayload {
  /** Menu ID or slug */
  menuId: number | string
  /** Items to reorder with their new positions */
  items: ReorderItem[]
}
