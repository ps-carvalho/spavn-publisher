/**
 * PostgreSQL Schema Definitions
 * 
 * Schema definitions for PostgreSQL database using drizzle-orm.
 * Uses native PostgreSQL types for better performance and type safety.
 *
 * All exports use a `pg` prefix to avoid Nuxt auto-import collisions with
 * the identically-structured SQLite schema. Access these tables via
 * `loadSchema('postgres')` which returns the `pgSchema` aggregate with
 * standard (unprefixed) property names for dialect-agnostic usage.
 */
import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, unique, index } from 'drizzle-orm/pg-core'

// ─── Table Definitions ─────────────────────────────────────────────

/** CMS admin users */
export const pgPublisherUsers = pgTable('publisher_users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  role: varchar('role', { length: 50 }).notNull().default('editor'),
  authMethod: varchar('auth_method', { length: 20 }).notNull().default('password'),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Revoked JWT tokens for server-side logout */
export const pgPublisherRevokedTokens = pgTable('publisher_revoked_tokens', {
  jti: text('jti').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  revokedAt: timestamp('revoked_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** API tokens for programmatic access */
export const pgPublisherApiTokens = pgTable('publisher_api_tokens', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  tokenHash: varchar('token_hash', { length: 255 }).notNull(),
  tokenPrefix: varchar('token_prefix', { length: 8 }).notNull(),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  userId: integer('user_id').references(() => pgPublisherUsers.id),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true, mode: 'string' }),
  expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Hierarchical folders for media organization */
export const pgPublisherFolders = pgTable('publisher_folders', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  parentId: integer('parent_id').references((): any => pgPublisherFolders.id),
  path: varchar('path', { length: 1000 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => ({
  parentIdSlugUnique: unique().on(table.parentId, table.slug),
}))

/** Uploaded media files */
export const pgPublisherMedia = pgTable('publisher_media', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimeType: varchar('mime_type', { length: 100 }).notNull(),
  size: integer('size').notNull(),
  width: integer('width'),
  height: integer('height'),
  url: varchar('url', { length: 500 }).notNull(),
  formats: jsonb('formats').$type<Record<string, { url: string; width: number; height: number }>>(),
  alternativeText: varchar('alternative_text', { length: 500 }),
  folder: varchar('folder', { length: 255 }),
  folderId: integer('folder_id').references(() => pgPublisherFolders.id),
  storageProvider: varchar('storage_provider', { length: 50 }).default('local'),
  storageKey: varchar('storage_key', { length: 500 }),
  publicUrl: varchar('public_url', { length: 500 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Folder-level permissions (RBAC) */
export const pgPublisherFolderPermissions = pgTable('publisher_folder_permissions', {
  id: serial('id').primaryKey(),
  folderId: integer('folder_id').notNull().references(() => pgPublisherFolders.id, { onDelete: 'cascade' }),
  roleId: varchar('role_id', { length: 50 }).notNull(),
  permission: varchar('permission', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => ({
  folderRoleUnique: unique().on(table.folderId, table.roleId),
}))

/** Webhook configurations */
export const pgPublisherWebhooks = pgTable('publisher_webhooks', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  events: jsonb('events').$type<string[]>().notNull().default([]),
  secret: varchar('secret', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Webhook delivery logs */
export const pgPublisherWebhookLogs = pgTable('publisher_webhook_logs', {
  id: serial('id').primaryKey(),
  webhookId: integer('webhook_id').notNull().references(() => pgPublisherWebhooks.id),
  event: varchar('event', { length: 100 }).notNull(),
  statusCode: integer('status_code'),
  responseBody: text('response_body'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Pages for the CMS */
export const pgPublisherPages = pgTable('publisher_pages', {
  id: serial('id').primaryKey(),
  pageType: varchar('page_type', { length: 100 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  status: varchar('status', { length: 20 }).notNull().default('draft'),
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: varchar('meta_description', { length: 500 }),
  metaImage: integer('meta_image'),
  metaExtra: jsonb('meta_extra').$type<Record<string, unknown>>(),
  publishedAt: timestamp('published_at', { withTimezone: true, mode: 'string' }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
})

/** Page blocks for modular content */
export const pgPublisherPageBlocks = pgTable('publisher_page_blocks', {
  id: serial('id').primaryKey(),
  pageId: integer('page_id').notNull().references(() => pgPublisherPages.id, { onDelete: 'cascade' }),
  areaName: varchar('area_name', { length: 100 }).notNull(),
  blockType: varchar('block_type', { length: 100 }).notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  data: jsonb('data').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** System settings for runtime configuration */
export const pgPublisherSettings = pgTable('publisher_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: jsonb('value').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Content type definitions stored as JSON config records */
export const pgPublisherContentTypeDefs = pgTable('publisher_content_type_defs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  pluralName: varchar('plural_name', { length: 100 }).notNull().unique(),
  icon: varchar('icon', { length: 100 }),
  description: text('description'),
  config: jsonb('config').$type<Record<string, unknown>>().notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Block type definitions stored as JSON config records */
export const pgPublisherBlockTypeDefs = pgTable('publisher_block_type_defs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }),
  icon: varchar('icon', { length: 100 }),
  description: text('description'),
  config: jsonb('config').$type<Record<string, unknown>>().notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Page type definitions stored as JSON config records */
export const pgPublisherPageTypeDefs = pgTable('publisher_page_type_defs', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 100 }),
  description: text('description'),
  config: jsonb('config').$type<Record<string, unknown>>().notNull(),
  isSystem: boolean('is_system').notNull().default(false),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

// ─── Passwordless Auth Tables ──────────────────────────────────────

/** WebAuthn (passkey) credentials for passwordless authentication */
export const pgPublisherWebAuthnCredentials = pgTable('publisher_webauthn_credentials', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => pgPublisherUsers.id, { onDelete: 'cascade' }),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  transports: jsonb('transports').$type<string[]>(),
  deviceName: varchar('device_name', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
})

/** TOTP secrets for time-based one-time password authentication */
export const pgPublisherTOTPSecrets = pgTable('publisher_totp_secrets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => pgPublisherUsers.id, { onDelete: 'cascade' }),
  secret: text('secret').notNull(),
  backupCodes: jsonb('backup_codes').$type<string[]>().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
})

/** Magic link tokens for email-based passwordless authentication */
export const pgPublisherMagicLinkTokens = pgTable('publisher_magic_link_tokens', {
  tokenHash: text('token_hash').primaryKey(),
  userId: integer('user_id').notNull().references(() => pgPublisherUsers.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  ipAddress: varchar('ip_address', { length: 45 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** Tracked user devices for security and session management */
export const pgPublisherUserDevices = pgTable('publisher_user_devices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => pgPublisherUsers.id, { onDelete: 'cascade' }),
  fingerprint: varchar('fingerprint', { length: 255 }).notNull(),
  deviceName: varchar('device_name', { length: 255 }),
  ipAddress: varchar('ip_address', { length: 45 }),
  isTrusted: boolean('is_trusted').notNull().default(false),
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ─── Menu Tables ───────────────────────────────────────────────────

/** Menus for navigation and content organization */
export const pgPublisherMenus = pgTable('publisher_menus', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  location: varchar('location', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

/** Menu items with hierarchical support for nested navigation */
export const pgPublisherMenuItems = pgTable('publisher_menu_items', {
  id: serial('id').primaryKey(),
  menuId: integer('menu_id').notNull().references(() => pgPublisherMenus.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id').references((): any => pgPublisherMenuItems.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').notNull().default(0),
  label: varchar('label', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('custom'),
  url: varchar('url', { length: 500 }),
  target: varchar('target', { length: 20 }),
  icon: varchar('icon', { length: 100 }),
  cssClass: varchar('css_class', { length: 255 }),
  visible: boolean('visible').notNull().default(true),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
}, (table) => ({
  menuIdIdx: index('publisher_menu_items_menu_id_idx').on(table.menuId),
  parentIdIdx: index('publisher_menu_items_parent_id_idx').on(table.parentId),
  sortOrderIdx: index('publisher_menu_items_sort_order_idx').on(table.sortOrder),
}))


// ─── Security Tables ───────────────────────────────────────────────

/** Security policies per role */
export const pgPublisherSecurityPolicies = pgTable('publisher_security_policies', {
  id: serial('id').primaryKey(),
  role: varchar('role', { length: 50 }).notNull().unique(),
  require2FA: boolean('require_2fa').notNull().default(false),
  allowedMethods: jsonb('allowed_methods').$type<string[]>().notNull().default(['magic-link', 'passkey', 'totp']),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).notNull().defaultNow(),
})

// ─── Schema Aggregate ──────────────────────────────────────────────
// Uses unprefixed property names so loadSchema('postgres') returns
// the same interface as loadSchema('sqlite') — fully interchangeable.

export const pgSchema = {
  publisherUsers: pgPublisherUsers,
  publisherRevokedTokens: pgPublisherRevokedTokens,
  publisherApiTokens: pgPublisherApiTokens,
  publisherFolders: pgPublisherFolders,
  publisherFolderPermissions: pgPublisherFolderPermissions,
  publisherMedia: pgPublisherMedia,
  publisherWebhooks: pgPublisherWebhooks,
  publisherWebhookLogs: pgPublisherWebhookLogs,
  publisherPages: pgPublisherPages,
  publisherPageBlocks: pgPublisherPageBlocks,
  publisherSettings: pgPublisherSettings,
  publisherContentTypeDefs: pgPublisherContentTypeDefs,
  publisherBlockTypeDefs: pgPublisherBlockTypeDefs,
  publisherPageTypeDefs: pgPublisherPageTypeDefs,
  publisherWebAuthnCredentials: pgPublisherWebAuthnCredentials,
  publisherTOTPSecrets: pgPublisherTOTPSecrets,
  publisherMagicLinkTokens: pgPublisherMagicLinkTokens,
  publisherUserDevices: pgPublisherUserDevices,
  publisherMenus: pgPublisherMenus,
  publisherMenuItems: pgPublisherMenuItems,
  publisherSecurityPolicies: pgPublisherSecurityPolicies,
}
