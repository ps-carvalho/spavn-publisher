/**
 * Database Provider Types and Interface
 * 
 * This module defines the abstraction layer for multi-database support.
 * Providers implement this interface for SQLite, PostgreSQL, and future databases.
 */

/**
 * Supported database dialects
 */
export type SupportedDialect = 'sqlite' | 'postgres'

/**
 * Database configuration options
 * 
 * Supports both SQLite (file-based) and PostgreSQL (connection-based) configurations.
 */
export interface DatabaseConfig {
  /** The database provider to use */
  provider: SupportedDialect
  
  // ─── SQLite Configuration ────────────────────────────────────────
  /** Path to SQLite database file (default: .data/publisher.db) */
  sqlitePath?: string
  
  // ─── PostgreSQL Configuration ─────────────────────────────────────
  /** Full connection URL (overrides individual connection settings) */
  url?: string
  /** PostgreSQL host (default: localhost) */
  host?: string
  /** PostgreSQL port (default: 5432) */
  port?: number
  /** Database user */
  user?: string
  /** Database password */
  password?: string
  /** Database name */
  database?: string
  /** Maximum number of connections in the pool (default: 10) */
  poolSize?: number
  /** Connection timeout in milliseconds (default: 5000) */
  connectionTimeout?: number
  /** Idle timeout in milliseconds (default: 30000) */
  idleTimeout?: number
}

/**
 * Raw SQL execution function type
 * Always async for API consistency across providers
 */
export type RawQueryFn = (sql: string, params?: unknown[]) => Promise<unknown[]>

/**
 * Database Provider Interface
 * 
 * Abstracts database operations behind a consistent async API.
 * Implementations handle dialect-specific connection management.
 */
export interface DatabaseProvider {
  /** 
   * The Drizzle ORM instance for type-safe queries
   * Schema type will be refined when unified schemas are created
   */
  db: unknown
  
  /**
   * Execute raw SQL queries
   * Always returns a Promise for cross-dialect API compatibility
   * @param sql - The SQL query string
   * @param params - Optional array of parameters for prepared statements
   * @returns Promise resolving to array of result rows
   */
  execute: RawQueryFn
  
  /** The current database dialect */
  dialect: SupportedDialect
  
  /**
   * Close all database connections gracefully
   * Should be called during server shutdown
   * @returns Promise that resolves when connections are closed
   */
  close: () => Promise<void>

  /**
   * Get connection pool statistics (optional — only for pooled providers like PostgreSQL)
   * @returns Connection stats or undefined if not supported
   */
  stats?: () => ConnectionStats
}

/**
 * Connection statistics for monitoring
 */
export interface ConnectionStats {
  /** Total connections currently open */
  activeConnections: number
  /** Connections currently idle in pool */
  idleConnections: number
  /** Number of queries executed */
  queriesExecuted: number
  /** Whether the connection is healthy */
  isHealthy: boolean
}
