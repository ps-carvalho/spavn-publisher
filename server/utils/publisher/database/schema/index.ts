/**
 * Schema Loader
 * 
 * Exports dialect-specific schemas for SQLite and PostgreSQL.
 * Use loadSchema() for runtime selection based on the active provider.
 */
import type { SupportedDialect } from '../provider'

// NOTE: No re-exports of individual schema tables or types here.
// Nuxt auto-imports from server/utils/ recursively, so re-exporting
// symbols from sqlite.ts, postgres.ts, or types.ts causes "Duplicated imports"
// warnings. Consumers should either:
// 1. Use Nuxt auto-imports (no import statement needed)
// 2. Import directly from the sub-module (e.g., './database/schema/sqlite')

/** Schema aggregate type — same shape for both dialects */
export interface SchemaMap {
  publisherUsers: any
  publisherRevokedTokens: any
  publisherApiTokens: any
  publisherFolders: any
  publisherFolderPermissions: any
  publisherMedia: any
  publisherWebhooks: any
  publisherWebhookLogs: any
  publisherPages: any
  publisherPageBlocks: any
  publisherSettings: any
  publisherContentTypeDefs: any
  publisherBlockTypeDefs: any
  publisherPageTypeDefs: any
  publisherWebAuthnCredentials: any
  publisherTOTPSecrets: any
  publisherMagicLinkTokens: any
  publisherUserDevices: any
  publisherMenus: any
  publisherMenuItems: any
}

/**
 * Lazy-load the correct schema based on dialect.
 * 
 * Returns the schema aggregate object with standard property names
 * (publisherUsers, publisherMedia, etc.) regardless of dialect.
 * 
 * @param dialect - The database dialect ('sqlite' | 'postgres')
 * @returns Promise resolving to the schema aggregate
 * 
 * @example
 * ```ts
 * const schema = await loadSchema('postgres')
 * db.select().from(schema.publisherUsers)
 * ```
 */
export async function loadSchema(dialect: SupportedDialect): Promise<SchemaMap> {
  if (dialect === 'postgres') {
    const mod = await import('./postgres')
    return mod.pgSchema
  }
  const mod = await import('./sqlite')
  return mod.schema
}
