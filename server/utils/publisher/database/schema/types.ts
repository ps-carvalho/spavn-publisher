/**
 * Shared TypeScript Types
 * 
 * Type definitions inferred from schema tables.
 * These types are identical across SQLite and PostgreSQL schemas
 * since column names are consistent between dialects.
 * 
 * We use the SQLite schema as the canonical type source because:
 * 1. Column names are identical across dialects
 * 2. TypeScript types abstract away database-specific type differences
 * 3. InferSelectModel/InferInsertModel provide consistent typing
 */
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
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
  publisherContentTypeDefs,
  publisherBlockTypeDefs,
  publisherPageTypeDefs,
  publisherWebAuthnCredentials,
  publisherTOTPSecrets,
  publisherMagicLinkTokens,
  publisherUserDevices,
  publisherSecurityPolicies,
} from './sqlite'

// ─── User Types ────────────────────────────────────────────────────

/** User record as stored in the database */
export type User = InferSelectModel<typeof publisherUsers>
/** User record for insertion */
export type NewUser = InferInsertModel<typeof publisherUsers>

// ─── Revoked Token Types ────────────────────────────────────────────

/** Revoked token record as stored in the database */
export type RevokedToken = InferSelectModel<typeof publisherRevokedTokens>
/** Revoked token record for insertion */
export type NewRevokedToken = InferInsertModel<typeof publisherRevokedTokens>

// ─── API Token Types ────────────────────────────────────────────────

/** API token record as stored in the database */
export type ApiToken = InferSelectModel<typeof publisherApiTokens>
/** API token record for insertion */
export type NewApiToken = InferInsertModel<typeof publisherApiTokens>

// ─── Folder Types ───────────────────────────────────────────────────

/** Folder record as stored in the database */
export type Folder = InferSelectModel<typeof publisherFolders>
/** Folder record for insertion */
export type NewFolder = InferInsertModel<typeof publisherFolders>

// ─── Folder Permission Types ────────────────────────────────────────

/** Folder permission record as stored in the database */
export type FolderPermission = InferSelectModel<typeof publisherFolderPermissions>
/** Folder permission record for insertion */
export type NewFolderPermission = InferInsertModel<typeof publisherFolderPermissions>

// ─── Media Types ────────────────────────────────────────────────────

/** Media record as stored in the database */
export type Media = InferSelectModel<typeof publisherMedia>
/** Media record for insertion */
export type NewMedia = InferInsertModel<typeof publisherMedia>

// ─── Webhook Types ──────────────────────────────────────────────────

/** Webhook record as stored in the database */
export type Webhook = InferSelectModel<typeof publisherWebhooks>
/** Webhook record for insertion */
export type NewWebhook = InferInsertModel<typeof publisherWebhooks>

// ─── Webhook Log Types ──────────────────────────────────────────────

/** Webhook log record as stored in the database */
export type WebhookLog = InferSelectModel<typeof publisherWebhookLogs>
/** Webhook log record for insertion */
export type NewWebhookLog = InferInsertModel<typeof publisherWebhookLogs>

// ─── Page Types ─────────────────────────────────────────────────────

/** Page record as stored in the database */
export type Page = InferSelectModel<typeof publisherPages>
/** Page record for insertion */
export type NewPage = InferInsertModel<typeof publisherPages>

// ─── Page Block Types ───────────────────────────────────────────────

/** Page block record as stored in the database */
export type PageBlock = InferSelectModel<typeof publisherPageBlocks>
/** Page block record for insertion */
export type NewPageBlock = InferInsertModel<typeof publisherPageBlocks>

// ─── Content Type Definition Types ───────────────────────────────────

/** Content type definition record as stored in the database */
export type ContentTypeDef = InferSelectModel<typeof publisherContentTypeDefs>
/** Content type definition record for insertion */
export type NewContentTypeDef = InferInsertModel<typeof publisherContentTypeDefs>

// ─── Block Type Definition Types ──────────────────────────────────────

/** Block type definition record as stored in the database */
export type BlockTypeDef = InferSelectModel<typeof publisherBlockTypeDefs>
/** Block type definition record for insertion */
export type NewBlockTypeDef = InferInsertModel<typeof publisherBlockTypeDefs>

// ─── Page Type Definition Types ───────────────────────────────────────

/** Page type definition record as stored in the database */
export type PageTypeDef = InferSelectModel<typeof publisherPageTypeDefs>
/** Page type definition record for insertion */
export type NewPageTypeDef = InferInsertModel<typeof publisherPageTypeDefs>

// ─── WebAuthn Credential Types ──────────────────────────────────────

/** WebAuthn credential record as stored in the database */
export type WebAuthnCredential = InferSelectModel<typeof publisherWebAuthnCredentials>
/** WebAuthn credential record for insertion */
export type NewWebAuthnCredential = InferInsertModel<typeof publisherWebAuthnCredentials>

// ─── TOTP Secret Types ──────────────────────────────────────────────

/** TOTP secret record as stored in the database */
export type TOTPSecret = InferSelectModel<typeof publisherTOTPSecrets>
/** TOTP secret record for insertion */
export type NewTOTPSecret = InferInsertModel<typeof publisherTOTPSecrets>

// ─── Magic Link Token Types ─────────────────────────────────────────

/** Magic link token record as stored in the database */
export type MagicLinkToken = InferSelectModel<typeof publisherMagicLinkTokens>
/** Magic link token record for insertion */
export type NewMagicLinkToken = InferInsertModel<typeof publisherMagicLinkTokens>

// ─── User Device Types ──────────────────────────────────────────────

/** User device record as stored in the database */
export type UserDevice = InferSelectModel<typeof publisherUserDevices>
/** User device record for insertion */
export type NewUserDevice = InferInsertModel<typeof publisherUserDevices>

// ─── Security Policy Types ───────────────────────────────────────────

/** Security policy record as stored in the database */
export type SecurityPolicy = InferSelectModel<typeof publisherSecurityPolicies>
/** Security policy record for insertion */
export type NewSecurityPolicy = InferInsertModel<typeof publisherSecurityPolicies>

// ─── Auth Method Type ───────────────────────────────────────────────

/** Supported authentication methods */
export type AuthMethod = 'password' | 'magic-link' | 'passkey' | 'totp'

// ─── JSON Type Helpers ──────────────────────────────────────────────

/** Media format variant */
export type MediaFormat = {
  url: string
  width: number
  height: number
}

/** Media formats collection */
export type MediaFormats = Record<string, MediaFormat>

/** Page block data (flexible structure based on block type) */
export type PageBlockData = Record<string, unknown>
