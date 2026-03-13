/**
 * SQLite Schema Definitions
 * 
 * Schema definitions for SQLite database using drizzle-orm.
 * This is the canonical schema with column names used across all dialects.
 */
import { sqliteTable, text, integer, unique, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

// ─── Table Definitions ─────────────────────────────────────────────

/** CMS admin users */
export const publisherUsers = sqliteTable('publisher_users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email', { length: 255 }).notNull().unique(),
  password: text('password', { length: 255 }),
  firstName: text('first_name', { length: 100 }),
  lastName: text('last_name', { length: 100 }),
  role: text('role', { length: 50 }).notNull().default('editor'),
  authMethod: text('auth_method', { length: 20 }).notNull().default('password'),
  emailVerified: text('email_verified'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

/** Revoked JWT tokens for server-side logout */
export const publisherRevokedTokens = sqliteTable('publisher_revoked_tokens', {
  jti: text('jti').primaryKey(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at').notNull().default(sql`(datetime('now'))`),
})

/** API tokens for programmatic access */
export const publisherApiTokens = sqliteTable('publisher_api_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 255 }).notNull(),
  tokenHash: text('token_hash', { length: 255 }).notNull(),
  tokenPrefix: text('token_prefix', { length: 8 }).notNull(),
  scopes: text('scopes', { mode: 'json' }).$type<string[]>().notNull().default([]),
  userId: integer('user_id').references(() => publisherUsers.id),
  lastUsedAt: text('last_used_at'),
  expiresAt: text('expires_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

/** Hierarchical folders for media organization */
export const publisherFolders = sqliteTable('publisher_folders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 255 }).notNull(),
  slug: text('slug', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): any => publisherFolders.id),
  path: text('path', { length: 1000 }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  parentIdSlugUnique: unique().on(table.parentId, table.slug),
}))

/** Uploaded media files */
export const publisherMedia = sqliteTable('publisher_media', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 255 }).notNull(),
  originalName: text('original_name', { length: 255 }).notNull(),
  mimeType: text('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  url: text('url', { length: 500 }).notNull(),
  formats: text('formats', { mode: 'json' }).$type<Record<string, { url: string; width: number; height: number }>>(),
  alternativeText: text('alternative_text', { length: 500 }),
  folder: text('folder', { length: 255 }),
  folderId: integer('folder_id').references(() => publisherFolders.id),
  storageProvider: text('storage_provider', { length: 50 }).default('local'),
  storageKey: text('storage_key', { length: 500 }),
  publicUrl: text('public_url', { length: 500 }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

/** Folder-level permissions (RBAC) */
export const publisherFolderPermissions = sqliteTable('publisher_folder_permissions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folderId: integer('folder_id').notNull().references(() => publisherFolders.id, { onDelete: 'cascade' }),
  roleId: text('role_id', { length: 50 }).notNull(),
  permission: text('permission', { length: 20 }).notNull(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  folderRoleUnique: unique().on(table.folderId, table.roleId),
}))

/** Webhook configurations */
export const publisherWebhooks = sqliteTable('publisher_webhooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 255 }).notNull(),
  url: text('url', { length: 500 }).notNull(),
  events: text('events', { mode: 'json' }).$type<string[]>().notNull().default([]),
  secret: text('secret', { length: 255 }),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

/** Webhook delivery logs */
export const publisherWebhookLogs = sqliteTable('publisher_webhook_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  webhookId: integer('webhook_id').notNull().references(() => publisherWebhooks.id),
  event: text('event', { length: 100 }).notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  deliveredAt: text('delivered_at').notNull().default(sql`(datetime('now'))`),
})

/** Pages for the CMS */
export const publisherPages = sqliteTable('publisher_pages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pageType: text('page_type', { length: 100 }).notNull(),
  title: text('title', { length: 255 }).notNull(),
  slug: text('slug', { length: 255 }).notNull().unique(),
  status: text('status', { length: 20 }).notNull().default('draft'),
  metaTitle: text('meta_title', { length: 255 }),
  metaDescription: text('meta_description', { length: 500 }),
  metaImage: integer('meta_image'),
  metaExtra: text('meta_extra', { mode: 'json' }),
  publishedAt: text('published_at'),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
  deletedAt: text('deleted_at'),
})

/** Page blocks for modular content */
export const publisherPageBlocks = sqliteTable('publisher_page_blocks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pageId: integer('page_id').notNull().references(() => publisherPages.id, { onDelete: 'cascade' }),
  areaName: text('area_name', { length: 100 }).notNull(),
  blockType: text('block_type', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull().default({}),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

/** System settings for runtime configuration */
export const publisherSettings = sqliteTable('publisher_settings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key', { length: 100 }).notNull().unique(),
  value: text('value', { mode: 'json' }).$type<Record<string, unknown>>(),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

/** Content type definitions stored as JSON config records */
export const publisherContentTypeDefs = sqliteTable('publisher_content_type_defs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 100 }).notNull().unique(),
  displayName: text('display_name', { length: 255 }).notNull(),
  pluralName: text('plural_name', { length: 100 }).notNull().unique(),
  icon: text('icon', { length: 100 }),
  description: text('description'),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

/** Block type definitions stored as JSON config records */
export const publisherBlockTypeDefs = sqliteTable('publisher_block_type_defs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 100 }).notNull().unique(),
  displayName: text('display_name', { length: 255 }).notNull(),
  category: text('category', { length: 100 }),
  icon: text('icon', { length: 100 }),
  description: text('description'),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

/** Page type definitions stored as JSON config records */
export const publisherPageTypeDefs = sqliteTable('publisher_page_type_defs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 100 }).notNull().unique(),
  displayName: text('display_name', { length: 255 }).notNull(),
  icon: text('icon', { length: 100 }),
  description: text('description'),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  isSystem: integer('is_system', { mode: 'boolean' }).notNull().default(false),
  active: integer('active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

// ─── Passwordless Auth Tables ──────────────────────────────────────

/** WebAuthn (passkey) credentials for passwordless authentication */
export const publisherWebAuthnCredentials = sqliteTable('publisher_webauthn_credentials', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => publisherUsers.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  transports: text('transports', { mode: 'json' }).$type<string[]>(),
  deviceName: text('device_name', { length: 255 }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  lastUsedAt: text('last_used_at'),
})

/** TOTP secrets for time-based one-time password authentication */
export const publisherTOTPSecrets = sqliteTable('publisher_totp_secrets', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => publisherUsers.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: text('backup_codes', { mode: 'json' }).$type<string[]>().notNull().default([]),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  lastUsedAt: text('last_used_at'),
})

/** Magic link tokens for email-based passwordless authentication */
export const publisherMagicLinkTokens = sqliteTable('publisher_magic_link_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id').notNull().references(() => publisherUsers.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  ipAddress: text('ip_address', { length: 45 }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

/** Tracked user devices for security and session management */
export const publisherUserDevices = sqliteTable('publisher_user_devices', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').notNull().references(() => publisherUsers.id, { onDelete: 'cascade' }),
  fingerprint: text('fingerprint', { length: 255 }).notNull(),
  deviceName: text('device_name', { length: 255 }),
  ipAddress: text('ip_address', { length: 45 }),
  isTrusted: integer('is_trusted', { mode: 'boolean' }).notNull().default(false),
  lastUsedAt: text('last_used_at').notNull().default(sql`(datetime('now'))`),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
})

// ─── Menu Tables ───────────────────────────────────────────────────

/** Menus for navigation and content organization */
export const publisherMenus = sqliteTable('publisher_menus', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name', { length: 255 }).notNull(),
  slug: text('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  location: text('location', { length: 100 }),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
})

/** Menu items with hierarchical support for nested navigation */
export const publisherMenuItems = sqliteTable('publisher_menu_items', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  menuId: integer('menu_id').notNull().references(() => publisherMenus.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id').references((): any => publisherMenuItems.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  label: text('label', { length: 255 }).notNull(),
  type: text('type', { length: 50 }).notNull().default('custom'),
  url: text('url', { length: 500 }),
  target: text('target', { length: 20 }),
  icon: text('icon', { length: 100 }),
  cssClass: text('css_class', { length: 255 }),
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  createdAt: text('created_at').notNull().default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  menuIdIdx: index('publisher_menu_items_menu_id_idx').on(table.menuId),
  parentIdIdx: index('publisher_menu_items_parent_id_idx').on(table.parentId),
  sortOrderIdx: index('publisher_menu_items_sort_order_idx').on(table.sortOrder),
}))

// ─── Schema Export ─────────────────────────────────────────────────

export const schema = {
  publisherUsers,
  publisherRevokedTokens,
  publisherApiTokens,
  publisherFolders,
  publisherFolderPermissions,
  publisherMedia,
  publisherWebhooks,
  publisherWebhookLogs,
  publisherPages,
  publisherPageBlocks,
  publisherSettings,
  publisherContentTypeDefs,
  publisherBlockTypeDefs,
  publisherPageTypeDefs,
  publisherWebAuthnCredentials,
  publisherTOTPSecrets,
  publisherMagicLinkTokens,
  publisherUserDevices,
  publisherMenus,
  publisherMenuItems,
}
