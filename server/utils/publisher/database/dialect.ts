/**
 * Dialect Helper Utilities
 * 
 * Centralized dialect-aware SQL generation utilities for multi-database support.
 * Provides consistent SQL fragments and DDL generation for SQLite and PostgreSQL.
 */

import type { SupportedDialect, DatabaseProvider } from './provider'

/**
 * Returns the SQL fragment for current timestamp
 * - SQLite: `datetime('now')`
 * - PostgreSQL: `NOW()`
 */
export function now(dialect: SupportedDialect): string {
  return dialect === 'postgres' ? 'NOW()' : "datetime('now')"
}

/**
 * Returns SQL for date subtraction
 * - SQLite: `datetime('now', '-N days')`
 * - PostgreSQL: `NOW() - INTERVAL 'N days'`
 */
export function dateSubtract(dialect: SupportedDialect, days: number): string {
  if (dialect === 'postgres') {
    return `NOW() - INTERVAL '${days} days'`
  }
  return `datetime('now', '-${days} days')`
}

/**
 * Returns DDL fragment for auto-increment primary key
 * - SQLite: `INTEGER PRIMARY KEY AUTOINCREMENT`
 * - PostgreSQL: `SERIAL PRIMARY KEY`
 */
export function autoIncrementPk(dialect: SupportedDialect): string {
  return dialect === 'postgres' 
    ? 'SERIAL PRIMARY KEY' 
    : 'INTEGER PRIMARY KEY AUTOINCREMENT'
}

/**
 * Returns the column type for JSON storage
 * - SQLite: `TEXT`
 * - PostgreSQL: `JSONB`
 */
export function jsonType(dialect: SupportedDialect): string {
  return dialect === 'postgres' ? 'JSONB' : 'TEXT'
}

/**
 * Returns the column type for booleans
 * - SQLite: `INTEGER`
 * - PostgreSQL: `BOOLEAN`
 */
export function booleanType(dialect: SupportedDialect): string {
  return dialect === 'postgres' ? 'BOOLEAN' : 'INTEGER'
}

/**
 * Returns the SQL literal for a boolean value
 * - SQLite: `1` / `0`
 * - PostgreSQL: `true` / `false`
 */
export function booleanValue(dialect: SupportedDialect, value: boolean): string {
  if (dialect === 'postgres') {
    return value ? 'true' : 'false'
  }
  return value ? '1' : '0'
}

/**
 * Returns the column type for timestamps
 * - SQLite: `TEXT`
 * - PostgreSQL: `TIMESTAMPTZ`
 */
export function timestampType(dialect: SupportedDialect): string {
  return dialect === 'postgres' ? 'TIMESTAMPTZ' : 'TEXT'
}

/**
 * Returns the DEFAULT clause for timestamps
 * - SQLite: `DEFAULT (datetime('now'))`
 * - PostgreSQL: `DEFAULT NOW()`
 */
export function timestampDefault(dialect: SupportedDialect): string {
  return dialect === 'postgres' 
    ? 'DEFAULT NOW()' 
    : "DEFAULT (datetime('now'))"
}

/**
 * Check if a table exists in the database (async)
 * - SQLite: `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
 * - PostgreSQL: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`
 */
export async function tableExists(
  dialect: SupportedDialect, 
  provider: DatabaseProvider, 
  tableName: string
): Promise<boolean> {
  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: "${tableName}"`)
  }
  if (dialect === 'sqlite') {
    const result = await provider.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      [tableName]
    )
    return result.length > 0
  }
  // PostgreSQL
  const result = await provider.execute(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1",
    [tableName]
  )
  return result.length > 0
}

/**
 * Get all column names for a table (async)
 * - SQLite: `PRAGMA table_info(tableName)` → map `.name`
 * - PostgreSQL: `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1` → map `.column_name`
 */
export async function getColumns(
  dialect: SupportedDialect,
  provider: DatabaseProvider,
  tableName: string
): Promise<string[]> {
  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error(`Invalid table name: "${tableName}"`)
  }
  if (dialect === 'sqlite') {
    const rows = await provider.execute(`PRAGMA table_info(${tableName})`)
    return (rows as Array<{ name: string }>).map(r => r.name)
  }
  // PostgreSQL
  const rows = await provider.execute(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1",
    [tableName]
  )
  return (rows as Array<{ column_name: string }>).map(r => r.column_name)
}

/**
 * Returns ALTER TABLE DDL for adding a column
 * Both dialects: `ALTER TABLE {table} ADD COLUMN {column} {type}`
 */
export function addColumn(
  dialect: SupportedDialect, 
  table: string, 
  column: string, 
  type: string
): string {
  // Both SQLite and PostgreSQL use the same syntax
  return `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`
}

/**
 * Returns INSERT ... ON CONFLICT DO NOTHING SQL
 * - SQLite: `INSERT OR IGNORE INTO {table} (...) VALUES (...)`
 * - PostgreSQL: `INSERT INTO {table} (...) VALUES (...) ON CONFLICT ({conflictTarget}) DO NOTHING`
 * 
 * @param dialect - The database dialect
 * @param table - The table name
 * @param data - Object with column names as keys and values
 * @param conflictTarget - Column(s) for conflict detection (PostgreSQL only)
 */
export function upsertIgnore(
  dialect: SupportedDialect,
  table: string,
  data: Record<string, unknown>,
  conflictTarget: string | string[]
): { sql: string; params: unknown[] } {
  const columns = Object.keys(data)
  const values = Object.values(data)
  const placeholders = values.map((_, i) => dialect === 'postgres' ? `$${i + 1}` : '?')
  
  if (dialect === 'sqlite') {
    return {
      sql: `INSERT OR IGNORE INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      params: values
    }
  }
  
  // PostgreSQL
  const conflictCols = Array.isArray(conflictTarget) ? conflictTarget.join(', ') : conflictTarget
  return {
    sql: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) ON CONFLICT (${conflictCols}) DO NOTHING`,
    params: values
  }
}

/**
 * Convenience object that groups all dialect helpers
 * Can be used with destructuring: `const { now, jsonType } = dialectHelpers(dialect)`
 */
export function dialectHelpers(dialect: SupportedDialect) {
  return {
    now: () => now(dialect),
    dateSubtract: (days: number) => dateSubtract(dialect, days),
    autoIncrementPk: () => autoIncrementPk(dialect),
    jsonType: () => jsonType(dialect),
    booleanType: () => booleanType(dialect),
    booleanValue: (value: boolean) => booleanValue(dialect, value),
    timestampType: () => timestampType(dialect),
    timestampDefault: () => timestampDefault(dialect),
    addColumn: (table: string, column: string, type: string) => addColumn(dialect, table, column, type),
    upsertIgnore: (table: string, data: Record<string, unknown>, conflictTarget: string | string[]) => 
      upsertIgnore(dialect, table, data, conflictTarget),
  }
}
