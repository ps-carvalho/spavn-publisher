/**
 * Database Provider Factory
 * 
 * Provides a unified interface for creating and accessing database providers.
 * Supports SQLite (default) and PostgreSQL with automatic configuration detection.
 * 
 * @example
 * ```typescript
 * // Auto-detect from DATABASE_URL
 * const provider = await getProvider()
 * 
 * // Explicit configuration
 * const provider = await createDatabaseProvider({
 *   provider: 'postgres',
 *   url: 'postgresql://user:pass@localhost:5432/mydb'
 * })
 * 
 * // Use the provider
 * const db = getDb()
 * const results = await provider.execute('SELECT * FROM users')
 * ```
 */

import type { DatabaseConfig, DatabaseProvider, SupportedDialect } from './provider'
import { createSqliteProvider, resetSqliteProvider } from './sqlite'
import { createPostgresProvider, resetPostgresProvider } from './postgres'
import { resolveDbConfig, logConfigSource } from './config'
import { loadSchema, type SchemaMap } from './schema'

// NOTE: No re-exports here. Nuxt auto-imports from server/utils/ recursively,
// so re-exporting symbols from sub-modules (config, dialect, provider, etc.)
// causes "Duplicated imports" warnings. Consumers should either:
// 1. Use Nuxt auto-imports (no import statement needed)
// 2. Import directly from the sub-module (e.g., './database/dialect')

/** Singleton provider instance */
let _provider: DatabaseProvider | null = null

/** Cached schema for current dialect */
let _schema: SchemaMap | null = null

/**
 * Resolved database configuration from environment and defaults
 * @deprecated Use resolveDbConfig() from './config' instead
 */
interface ResolvedConfig {
  provider: 'sqlite' | 'postgres'
  config: DatabaseConfig
}

/**
 * Resolve database configuration from environment variables
 *
 * This function is now a thin wrapper around resolveDbConfig() from config.ts.
 * Maintained for backward compatibility.
 *
 * @deprecated Use resolveDbConfig() from './config' for richer metadata
 * @internal
 */
function resolveConfig(): ResolvedConfig {
  const { config } = resolveDbConfig()
  return {
    provider: config.provider,
    config,
  }
}

/**
 * Create a database provider based on configuration
 * 
 * Factory function that creates the appropriate provider (SQLite or PostgreSQL)
 * based on the provided or auto-detected configuration.
 * 
 * @param config - Optional database configuration. If not provided, auto-detects from env.
 * @returns Promise resolving to a DatabaseProvider instance
 * 
 * @example
 * ```typescript
 * // Auto-detect
 * const provider = await createDatabaseProvider()
 * 
 * // SQLite with custom path
 * const provider = await createDatabaseProvider({
 *   provider: 'sqlite',
 *   sqlitePath: '/path/to/db.sqlite'
 * })
 * 
 * // PostgreSQL with connection URL
 * const provider = await createDatabaseProvider({
 *   provider: 'postgres',
 *   url: 'postgresql://user:pass@localhost:5432/mydb'
 * })
 * ```
 */
export async function createDatabaseProvider(config?: DatabaseConfig): Promise<DatabaseProvider> {
  // Use provided config or resolve from environment
  const resolvedConfig = config || resolveConfig().config
  
  switch (resolvedConfig.provider) {
    case 'sqlite':
      return createSqliteProvider(resolvedConfig)
      
    case 'postgres':
      return createPostgresProvider(resolvedConfig)
      
    default:
      throw new Error(`Unsupported database provider: ${(resolvedConfig as any).provider}`)
  }
}

/**
 * Get the singleton database provider
 *
 * Initializes the provider on first call using auto-detected configuration.
 * Subsequent calls return the same instance.
 * Logs the configuration source on first initialization.
 *
 * @returns Promise resolving to the DatabaseProvider instance
 */
export async function getProvider(): Promise<DatabaseProvider> {
  if (!_provider) {
    const { config } = resolveDbConfig()
    // Log which configuration source was used
    logConfigSource()
    _provider = await createDatabaseProvider(config)
  }
  return _provider
}

/**
 * Get the Drizzle ORM database instance
 * 
 * Convenience function that returns the Drizzle instance from the provider.
 * Initializes the provider on first call.
 * 
 * @returns Promise resolving to the Drizzle database instance
 */
export async function getDb(): Promise<unknown> {
  const provider = await getProvider()
  return provider.db
}

/**
 * Get the dialect-correct Drizzle schema tables
 * 
 * Returns the schema matching the current database dialect (SQLite or PostgreSQL).
 * Cached after first call — subsequent calls return the same instance.
 * 
 * This MUST be used instead of importing from schema/sqlite or schema/postgres
 * directly, otherwise Drizzle column mappers will mismatch the database driver
 * (e.g., SQLiteTextJson trying to JSON.parse() an already-parsed PostgreSQL JSONB value).
 * 
 * @returns Promise resolving to the SchemaMap with all table definitions
 * 
 * @example
 * ```typescript
 * const db = await getDb()
 * const { publisherMedia, publisherFolders } = await getSchema()
 * const items = await db.select().from(publisherMedia).limit(10)
 * ```
 */
export async function getSchema(): Promise<SchemaMap> {
  if (!_schema) {
    const provider = await getProvider()
    _schema = await loadSchema(provider.dialect)
  }
  return _schema
}

/**
 * Get the current database dialect
 * 
 * @returns Promise resolving to the current dialect ('sqlite' or 'postgres')
 */
export async function getDialect(): Promise<SupportedDialect> {
  const provider = await getProvider()
  return provider.dialect
}

/**
 * Execute a raw SQL query
 * 
 * Convenience function that uses the provider's execute method.
 * Always returns a Promise for cross-dialect API compatibility.
 * 
 * @param sql - The SQL query string
 * @param params - Optional array of parameters for prepared statements
 * @returns Promise resolving to array of result rows
 */
export async function execute(sql: string, params?: unknown[]): Promise<unknown[]> {
  const provider = await getProvider()
  return provider.execute(sql, params)
}

/**
 * Close all database connections
 * 
 * Should be called during server shutdown for graceful termination.
 * Resets the singleton so subsequent calls will create a new connection.
 */
export async function closeDatabase(): Promise<void> {
  if (_provider) {
    await _provider.close()
    _provider = null
  }
}

/**
 * Reset all providers (for testing)
 * 
 * Closes connections and clears all singletons.
 */
export async function resetDatabase(): Promise<void> {
  _schema = null
  await Promise.all([
    closeDatabase(),
    resetSqliteProvider(),
    resetPostgresProvider(),
  ])
}

/**
 * Check if the database provider is initialized
 * 
 * @returns true if a provider instance exists
 */
export function isProviderInitialized(): boolean {
  return _provider !== null
}
