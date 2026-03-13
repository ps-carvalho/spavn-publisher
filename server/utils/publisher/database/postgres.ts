/**
 * PostgreSQL Database Provider
 * 
 * Implements the DatabaseProvider interface for PostgreSQL using pg (node-postgres).
 * Uses connection pooling for efficient resource management.
 */

import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { ConnectionStats, DatabaseConfig, DatabaseProvider, RawQueryFn, SupportedDialect } from './provider'

/**
 * PostgreSQL-specific configuration derived from DatabaseConfig
 */
interface PostgresConfig {
  host: string
  port: number
  user: string
  password: string
  database: string
  max: number
  idleTimeoutMillis: number
  connectionTimeoutMillis: number
}

/** Type for the pg Pool - loaded dynamically */
type PgPool = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
  end: () => Promise<void>
  totalCount: number
  idleCount: number
  waitingCount: number
}

/** Type for the pg module */
type PgModule = {
  Pool: new (config: PostgresConfig) => PgPool
}

/**
 * Parse and validate PostgreSQL configuration
 */
function resolvePostgresConfig(config: DatabaseConfig): PostgresConfig {
  // Parse connection URL if provided
  let urlConfig: Partial<PostgresConfig> = {}
  
  if (config.url) {
    try {
      const url = new URL(config.url)
      urlConfig = {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        user: url.username,
        password: url.password,
        database: url.pathname.slice(1), // Remove leading slash
      }
    } catch (e) {
      throw new Error(`Invalid PostgreSQL connection URL: ${config.url}`)
    }
  }
  
  return {
    host: config.host ?? urlConfig.host ?? process.env.PGHOST ?? 'localhost',
    port: config.port ?? urlConfig.port ?? parseInt(process.env.PGPORT ?? '5432'),
    user: config.user ?? urlConfig.user ?? process.env.PGUSER ?? 'postgres',
    password: config.password ?? urlConfig.password ?? process.env.PGPASSWORD ?? '',
    database: config.database ?? urlConfig.database ?? process.env.PGDATABASE ?? 'publisher',
    max: config.poolSize ?? 10,
    idleTimeoutMillis: config.idleTimeout ?? 30000,
    connectionTimeoutMillis: config.connectionTimeout ?? 5000,
  }
}

/** Singleton PostgreSQL provider */
let _provider: PostgresDatabaseProvider | null = null

/**
 * PostgreSQL Database Provider Implementation
 */
class PostgresDatabaseProvider implements DatabaseProvider {
  readonly dialect: SupportedDialect = 'postgres'
  
  /** The pg Pool instance */
  private pool: PgPool
  
  /** The Drizzle ORM instance */
  readonly db: NodePgDatabase
  
  /** Query counter for statistics */
  private queryCount = 0
  
  constructor(pool: PgPool, db: NodePgDatabase) {
    this.pool = pool
    this.db = db
  }
  
  /**
   * Execute raw SQL queries
   * @param sql - The SQL query string
   * @param params - Optional array of parameters for prepared statements
   * @returns Promise resolving to array of result rows
   */
  execute: RawQueryFn = async (sql: string, params?: unknown[]): Promise<unknown[]> => {
    this.queryCount++
    
    try {
      const result = params 
        ? await this.pool.query(sql, params)
        : await this.pool.query(sql)
      
      return result.rows
    } catch (error) {
      // Re-throw with context
      throw new Error(`PostgreSQL query error: ${error instanceof Error ? error.message : String(error)}\nSQL: ${sql}`)
    }
  }
  
  /**
   * Close all connections in the pool
   */
  close = async (): Promise<void> => {
    await this.pool.end()
  }
  
  /**
   * Get connection pool statistics
   */
  stats = (): ConnectionStats => {
    return {
      activeConnections: this.pool.totalCount - this.pool.idleCount,
      idleConnections: this.pool.idleCount,
      queriesExecuted: this.queryCount,
      isHealthy: this.pool.totalCount >= 0,
    }
  }
}

/**
 * Dynamically load the pg module
 * Throws a helpful error if not installed
 * 
 * Note: TypeScript may show an error here if pg is not installed,
 * but this is intentional - the module is loaded at runtime and
 * we handle the case where it's not available.
 */
async function loadPgModule(): Promise<PgModule> {
  try {
    // Dynamic import for ESM/CJS compatibility
    // @ts-expect-error - pg is optional and may not be installed; we handle this at runtime
    const pg = await import('pg').catch(() => null)
    
    if (!pg) {
      throw new Error('pg module not found')
    }
    
    return pg as PgModule
  } catch (error) {
    throw new Error(
      'pg package is required for PostgreSQL. Install with: npm install pg\n' +
      'For TypeScript support, also install: npm install -D @types/pg'
    )
  }
}

/**
 * Create a PostgreSQL database provider
 * 
 * Initializes a pg Pool connection with configurable pool size.
 * Uses singleton pattern - subsequent calls return the same instance.
 * 
 * Note: The 'pg' package must be installed. If not, a clear error is thrown.
 * 
 * @param config - Database configuration with connection details
 * @returns Promise resolving to a DatabaseProvider instance
 * 
 * @example
 * ```typescript
 * const provider = await createPostgresProvider({
 *   provider: 'postgres',
 *   url: 'postgresql://user:pass@localhost:5432/mydb'
 * })
 * const results = await provider.execute('SELECT * FROM users')
 * ```
 */
export async function createPostgresProvider(config: DatabaseConfig): Promise<DatabaseProvider> {
  // Return existing singleton if available
  if (_provider) {
    return _provider
  }
  
  // Load pg module (throws clear error if not installed)
  const pg = await loadPgModule()
  
  const pgConfig = resolvePostgresConfig(config)
  
  // Create connection pool
  const pool = new pg.Pool(pgConfig)
  
  // Test the connection
  try {
    await pool.query('SELECT 1')
  } catch (error) {
    await pool.end()
    throw new Error(
      `Failed to connect to PostgreSQL at ${pgConfig.host}:${pgConfig.port}/${pgConfig.database}: ` +
      (error instanceof Error ? error.message : String(error))
    )
  }
  
  // Create Drizzle instance
  // Note: For now, we pass empty schema - will be replaced in Task 2.1 with unified schema
  const db = drizzle(pool, { schema: {} })
  
  // Create provider instance
  _provider = new PostgresDatabaseProvider(pool, db)
  
  return _provider
}

/**
 * Get the singleton PostgreSQL provider instance
 * Throws if provider hasn't been initialized via createPostgresProvider()
 */
export function getPostgresProvider(): DatabaseProvider {
  if (!_provider) {
    throw new Error('PostgreSQL provider not initialized. Call createPostgresProvider() first.')
  }
  return _provider
}

/**
 * Reset the singleton (for testing)
 * Closes the pool and clears the singleton
 */
export async function resetPostgresProvider(): Promise<void> {
  if (_provider) {
    await _provider.close()
    _provider = null
  }
}
