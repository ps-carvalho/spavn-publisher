/**
 * SQLite Database Provider
 * 
 * Implements the DatabaseProvider interface for SQLite using better-sqlite3.
 * Wraps synchronous operations in Promises for API compatibility with PostgreSQL.
 */

import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { mkdirSync } from 'fs'
import type { DatabaseConfig, DatabaseProvider, RawQueryFn, SupportedDialect } from './provider'
// Import schema from the SQLite schema definitions
import { schema } from './schema/sqlite'

/**
 * SQLite-specific configuration derived from DatabaseConfig
 */
interface SqliteConfig {
  path: string
}

/**
 * Parse and validate SQLite configuration
 */
function resolveSqliteConfig(config: DatabaseConfig): SqliteConfig {
  const path = config.sqlitePath 
    || process.env.DATABASE_URL 
    || join(process.cwd(), '.data', 'publisher.db')
  
  return { path }
}

/** Singleton SQLite connection */
let _provider: SqliteDatabaseProvider | null = null

/**
 * SQLite Database Provider Implementation
 */
class SqliteDatabaseProvider implements DatabaseProvider {
  readonly dialect: SupportedDialect = 'sqlite'
  
  /** The raw better-sqlite3 instance */
  private sqlite: InstanceType<typeof Database>
  
  /** The Drizzle ORM instance */
  readonly db: BetterSQLite3Database<typeof schema>
  
  /** Query counter for statistics */
  private queryCount = 0
  
  constructor(sqlite: InstanceType<typeof Database>) {
    this.sqlite = sqlite
    this.db = drizzle(sqlite, { schema })
  }
  
  /**
   * Execute raw SQL queries
   * Wraps synchronous better-sqlite3 calls in Promise.resolve()
   * @param sql - The SQL query string
   * @param params - Optional array of parameters for prepared statements
   * @returns Promise resolving to array of result rows
   */
  execute: RawQueryFn = async (sql: string, params?: unknown[]): Promise<unknown[]> => {
    this.queryCount++
    
    // Use Promise.resolve to wrap the synchronous operation
    return Promise.resolve().then(() => {
      try {
        const stmt = this.sqlite.prepare(sql)
        
        if (stmt.reader) {
          // SELECT queries — return result rows
          const result = params ? stmt.all(...params) : stmt.all()
          return result as unknown[]
        } else {
          // DDL/DML statements (CREATE, INSERT, UPDATE, DELETE) — use run()
          params ? stmt.run(...params) : stmt.run()
          return []
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        const truncatedSql = sql.length > 200 ? sql.slice(0, 200) + '...' : sql
        throw new Error(`[Publisher DB] SQLite error: ${msg} | SQL: ${truncatedSql}`)
      }
    })
  }
  
  /**
   * Close the database connection
   * For SQLite, this closes the file handle
   */
  close = async (): Promise<void> => {
    return Promise.resolve().then(() => {
      if (this.sqlite) {
        this.sqlite.close()
      }
    })
  }
  
  /**
   * Get connection statistics
   */
  getStats() {
    return {
      activeConnections: 1,
      idleConnections: 1,
      queriesExecuted: this.queryCount,
      isHealthy: true, // SQLite doesn't have connection health concept
    }
  }
}

/**
 * Create a SQLite database provider
 * 
 * Initializes a better-sqlite3 connection with WAL mode and foreign keys enabled.
 * Uses singleton pattern - subsequent calls return the same instance.
 * 
 * @param config - Database configuration with optional sqlitePath
 * @returns Promise resolving to a DatabaseProvider instance
 * 
 * @example
 * ```typescript
 * const provider = await createSqliteProvider({ provider: 'sqlite' })
 * const results = await provider.execute('SELECT * FROM users')
 * ```
 */
export async function createSqliteProvider(config: DatabaseConfig): Promise<DatabaseProvider> {
  // Return existing singleton if available
  if (_provider) {
    return _provider
  }
  
  const { path } = resolveSqliteConfig(config)
  
  // Ensure parent directory exists
  mkdirSync(dirname(path), { recursive: true })
  
  // Create SQLite connection
  const sqlite = new Database(path)
  
  // Enable WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL')
  // Enable foreign key constraints
  sqlite.pragma('foreign_keys = ON')
  
  // Create provider instance
  _provider = new SqliteDatabaseProvider(sqlite)
  
  return _provider
}

/**
 * Get the singleton SQLite provider instance
 * Throws if provider hasn't been initialized via createSqliteProvider()
 */
export function getSqliteProvider(): DatabaseProvider {
  if (!_provider) {
    throw new Error('SQLite provider not initialized. Call createSqliteProvider() first.')
  }
  return _provider
}

/**
 * Reset the singleton (for testing)
 * Closes the connection and clears the singleton
 */
export async function resetSqliteProvider(): Promise<void> {
  if (_provider) {
    await _provider.close()
    _provider = null
  }
}
