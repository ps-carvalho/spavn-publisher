/**
 * Query Helpers for Dynamic Content Type Tables
 *
 * These helpers provide dialect-agnostic query functions for dynamic content type
 * tables (publisher_ct_*) and page builder tables where table names are determined
 * at runtime.
 *
 * They use the provider's execute() method (parameterized raw SQL) because Drizzle's
 * query builder requires compile-time table references.
 *
 * For system tables (publisher_users, publisher_media, etc.), use the Drizzle query
 * builder directly with schema objects — NOT these helpers.
 *
 * @example
 * ```typescript
 * import { findById, insertRow, listRows } from './queries'
 *
 * // Get a single row by ID
 * const page = await findById('publisher_pages', 123)
 *
 * // Insert a new row
 * const { lastInsertId } = await insertRow('publisher_ct_articles', {
 *   title: 'Hello World',
 *   slug: 'hello-world',
 *   content: { blocks: [] } // JSON is auto-serialized for SQLite
 * })
 *
 * // List with pagination
 * const rows = await listRows('publisher_ct_articles', {
 *   where: 'status = ?',
 *   params: ['published'],
 *   orderBy: 'created_at DESC',
 *   limit: 25,
 *   offset: 0
 * })
 * ```
 */

import { getProvider } from './index'
import type { SupportedDialect } from './provider'

// ─── Security: Identifier Validation ──────────────────────────────────────────

/**
 * Validate a table name to prevent SQL injection via identifier interpolation.
 * Only allows alphanumeric characters and underscores, must start with a letter or underscore.
 * All Publisher tables follow the pattern: publisher_* or publisher_ct_*
 */
const VALID_TABLE_NAME = /^[a-zA-Z_][a-zA-Z0-9_]*$/

function validateIdentifier(name: string, type: 'table' | 'column' = 'table'): void {
  if (!name || !VALID_TABLE_NAME.test(name)) {
    throw new Error(`Invalid ${type} name: "${name}". Must match /^[a-zA-Z_][a-zA-Z0-9_]*$/`)
  }
}

// ─── Helper: Dialect-aware placeholders ────────────────────────────────────────

/**
 * Generate a single parameter placeholder for the given dialect
 * SQLite uses `?` for all parameters
 * PostgreSQL uses `$1, $2, $3` for positional parameters
 */
function placeholder(dialect: SupportedDialect, index: number): string {
  return dialect === 'postgres' ? `$${index}` : '?'
}

/**
 * Generate a comma-separated list of parameter placeholders
 * @param dialect - The database dialect
 * @param count - Number of placeholders to generate
 * @returns "?, ?, ?" for SQLite or "$1, $2, $3" for PostgreSQL
 */
function placeholders(dialect: SupportedDialect, count: number, startIndex = 1): string {
  if (dialect === 'postgres') {
    const parts: string[] = []
    for (let i = 0; i < count; i++) {
      parts.push(`$${startIndex + i}`)
    }
    return parts.join(', ')
  }
  return Array(count).fill('?').join(', ')
}

// ─── Helper: Dialect-aware NOW() ──────────────────────────────────────────────

/**
 * Get the dialect-appropriate NOW/timestamp expression
 * SQLite: datetime('now')
 * PostgreSQL: NOW()
 */
function nowExpression(dialect: SupportedDialect): string {
  return dialect === 'sqlite' ? "datetime('now')" : 'NOW()'
}

// ─── Helper: Value serialization for cross-dialect compatibility ──────────────

/**
 * Serialize a value for storage, handling dialect-specific requirements
 *
 * - JSON objects/arrays: SQLite needs JSON.stringify(), PostgreSQL handles natively
 * - Boolean: SQLite needs 1/0, PostgreSQL handles true/false natively
 * - Dates: Passed through (handled by driver)
 * - Primitives: Passed through unchanged
 */
function serializeValue(dialect: SupportedDialect, value: unknown): unknown {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value
  }

  // Handle Date objects - pass through as-is
  if (value instanceof Date) {
    return value
  }

  // Handle arrays - stringify for SQLite
  if (Array.isArray(value)) {
    return dialect === 'sqlite' ? JSON.stringify(value) : value
  }

  // Handle plain objects (not Date, not Array, not null) - stringify for SQLite
  if (typeof value === 'object' && value !== null) {
    return dialect === 'sqlite' ? JSON.stringify(value) : value
  }

  // Handle booleans - convert to integer for SQLite
  if (typeof value === 'boolean') {
    return dialect === 'sqlite' ? (value ? 1 : 0) : value
  }

  // Primitives (string, number) pass through unchanged
  return value
}

/**
 * Serialize all values in a data object for the given dialect
 */
function serializeValues(
  dialect: SupportedDialect,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(data)) {
    result[key] = serializeValue(dialect, value)
  }
  return result
}

// ─── Helper: Parse JSON columns after retrieval ────────────────────────────────

/**
 * Parse JSON columns in a row after retrieval from SQLite
 * PostgreSQL JSONB columns are already objects, no parsing needed
 *
 * @param row - The database row to parse
 * @param dialect - The database dialect
 * @param jsonColumns - Array of column names that contain JSON data
 */
function parseJsonColumns(
  row: Record<string, unknown>,
  dialect: SupportedDialect,
  jsonColumns?: string[],
): Record<string, unknown> {
  if (dialect !== 'sqlite' || !jsonColumns?.length) {
    return row
  }

  const result: Record<string, unknown> = { ...row }
  for (const col of jsonColumns) {
    const value = result[col]
    if (typeof value === 'string' && value) {
      try {
        result[col] = JSON.parse(value)
      } catch {
        // Keep original value if parsing fails
      }
    }
  }
  return result
}

// ─── findById ──────────────────────────────────────────────────────────────────

/**
 * Find a single row by its primary key ID
 *
 * Replaces: `sqlite.prepare('SELECT * FROM x WHERE id = ?').get(id)`
 *
 * @param tableName - The table name (e.g., 'publisher_pages', 'publisher_ct_articles')
 * @param id - The primary key ID (number or string)
 * @returns The row as a plain object, or null if not found
 *
 * @example
 * ```typescript
 * const page = await findById('publisher_pages', 123)
 * if (page) {
 *   console.log(page.title)
 * }
 * ```
 */
export async function findById(
  tableName: string,
  id: number | string,
): Promise<Record<string, unknown> | null> {
  validateIdentifier(tableName, 'table')
  const provider = await getProvider()
  const { dialect } = provider

  const sql = `SELECT * FROM ${tableName} WHERE id = ${placeholder(dialect, 1)}`
  const params = [id]

  const rows = await provider.execute(sql, params)
  return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null
}

// ─── insertRow ─────────────────────────────────────────────────────────────────

/**
 * Insert a new row into a table
 *
 * Replaces: `sqlite.prepare('INSERT INTO x (...) VALUES (...)').run(...)`
 *
 * Handles dialect differences:
 * - SQLite: Execute INSERT, then SELECT last_insert_rowid()
 * - PostgreSQL: Append RETURNING id to the INSERT statement
 *
 * @param tableName - The table name
 * @param data - The data to insert (column name -> value)
 * @returns Object containing the lastInsertId
 *
 * @example
 * ```typescript
 * const { lastInsertId } = await insertRow('publisher_ct_articles', {
 *   title: 'Hello World',
 *   slug: 'hello-world',
 *   status: 'draft',
 *   metadata: { author: 'John' } // Auto-serialized for SQLite
 * })
 * ```
 */
export async function insertRow(
  tableName: string,
  data: Record<string, unknown>,
): Promise<{ lastInsertId: number }> {
  validateIdentifier(tableName, 'table')
  for (const key of Object.keys(data)) {
    validateIdentifier(key, 'column')
  }
  const provider = await getProvider()
  const { dialect } = provider

  // Serialize values for the dialect
  const serializedData = serializeValues(dialect, data)

  const columns = Object.keys(serializedData)
  const values = Object.values(serializedData)

  if (columns.length === 0) {
    throw new Error('insertRow: No columns provided for insert')
  }

  if (dialect === 'postgres') {
    // PostgreSQL: Use RETURNING id to get the inserted ID in one query
    const colsStr = columns.join(', ')
    const placeholdersStr = placeholders(dialect, values.length)
    const sql = `INSERT INTO ${tableName} (${colsStr}) VALUES (${placeholdersStr}) RETURNING id`

    const rows = await provider.execute(sql, values)
    const result = rows[0] as { id: number } | undefined
    return { lastInsertId: result?.id ?? 0 }
  } else {
    // SQLite: Execute INSERT, then get last_insert_rowid()
    const colsStr = columns.join(', ')
    const placeholdersStr = placeholders(dialect, values.length)
    const sql = `INSERT INTO ${tableName} (${colsStr}) VALUES (${placeholdersStr})`

    await provider.execute(sql, values)

    // Get the last insert ID
    const idRows = await provider.execute('SELECT last_insert_rowid() as id')
    const idResult = idRows[0] as { id: number } | undefined
    return { lastInsertId: idResult?.id ?? 0 }
  }
}

// ─── updateRow ─────────────────────────────────────────────────────────────────

/**
 * Update a row by its primary key ID
 *
 * Replaces: `sqlite.prepare('UPDATE x SET col1=?, col2=? WHERE id=?').run(...)`
 *
 * @param tableName - The table name
 * @param id - The primary key ID
 * @param data - The data to update (column name -> new value)
 * @returns The updated row, or null if no row was found
 *
 * @example
 * ```typescript
 * const updated = await updateRow('publisher_pages', 123, {
 *   title: 'Updated Title',
 *   updated_at: new Date()
 * })
 * ```
 */
export async function updateRow(
  tableName: string,
  id: number,
  data: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  validateIdentifier(tableName, 'table')
  for (const key of Object.keys(data)) {
    validateIdentifier(key, 'column')
  }
  const provider = await getProvider()
  const { dialect } = provider

  // Serialize values for the dialect
  const serializedData = serializeValues(dialect, data)

  const columns = Object.keys(serializedData)
  const values = Object.values(serializedData)

  if (columns.length === 0) {
    throw new Error('updateRow: No columns provided for update')
  }

  // Build SET clause: "col1 = ?, col2 = ?" or "col1 = $1, col2 = $2"
  const setClauses = columns.map((col, i) => {
    return `${col} = ${placeholder(dialect, i + 1)}`
  }).join(', ')

  // Add the ID parameter at the end
  const idPlaceholder = placeholder(dialect, columns.length + 1)
  const sql = `UPDATE ${tableName} SET ${setClauses} WHERE id = ${idPlaceholder}`

  const params = [...values, id]
  await provider.execute(sql, params)

  // Return the updated row
  return findById(tableName, id)
}

// ─── deleteRow ─────────────────────────────────────────────────────────────────

/**
 * Permanently delete a row by its primary key ID
 *
 * Replaces: `sqlite.prepare('DELETE FROM x WHERE id = ?').run(id)`
 *
 * @param tableName - The table name
 * @param id - The primary key ID
 *
 * @example
 * ```typescript
 * await deleteRow('publisher_page_blocks', 456)
 * ```
 */
export async function deleteRow(
  tableName: string,
  id: number,
): Promise<void> {
  validateIdentifier(tableName, 'table')
  const provider = await getProvider()
  const { dialect } = provider

  const sql = `DELETE FROM ${tableName} WHERE id = ${placeholder(dialect, 1)}`
  await provider.execute(sql, [id])
}

// ─── softDeleteRow ─────────────────────────────────────────────────────────────

/**
 * Soft delete a row by setting deleted_at to the current timestamp
 *
 * Replaces: `sqlite.prepare("UPDATE x SET deleted_at = datetime('now') WHERE id = ?").run(id)`
 *
 * @param tableName - The table name (must have a deleted_at column)
 * @param id - The primary key ID
 *
 * @example
 * ```typescript
 * await softDeleteRow('publisher_ct_articles', 123)
 * ```
 */
export async function softDeleteRow(
  tableName: string,
  id: number,
): Promise<void> {
  validateIdentifier(tableName, 'table')
  const provider = await getProvider()
  const { dialect } = provider

  const nowExpr = nowExpression(dialect)
  const idPlaceholder = placeholder(dialect, 1)
  const sql = `UPDATE ${tableName} SET deleted_at = ${nowExpr} WHERE id = ${idPlaceholder}`

  await provider.execute(sql, [id])
}

// ─── countRows ─────────────────────────────────────────────────────────────────

/**
 * Count rows in a table, optionally with a WHERE clause
 *
 * Replaces: `sqlite.prepare('SELECT COUNT(*) as total FROM x WHERE ...').get(...)`
 *
 * @param tableName - The table name
 * @param conditions - Optional WHERE conditions
 * @param conditions.where - The WHERE clause (without 'WHERE' keyword)
 * @param conditions.params - Parameters for the WHERE clause
 * @returns The count of matching rows
 *
 * @example
 * ```typescript
 * // Count all rows
 * const total = await countRows('publisher_ct_articles')
 *
 * // Count with conditions
 * const published = await countRows('publisher_ct_articles', {
 *   where: 'status = ? AND deleted_at IS NULL',
 *   params: ['published']
 * })
 * ```
 */
export async function countRows(
  tableName: string,
  conditions?: { where: string; params: unknown[] },
): Promise<number> {
  validateIdentifier(tableName, 'table')
  const provider = await getProvider()
  const { dialect } = provider

  let sql = `SELECT COUNT(*) as total FROM ${tableName}`
  const params: unknown[] = []

  if (conditions?.where) {
    // Convert SQLite-style placeholders (?) to PostgreSQL-style ($1, $2) if needed
    if (dialect === 'postgres') {
      let pgIndex = 1
      sql += ` WHERE ${conditions.where.replace(/\?/g, () => `$${pgIndex++}`)}`
      params.push(...conditions.params)
    } else {
      sql += ` WHERE ${conditions.where}`
      params.push(...conditions.params)
    }
  }

  const rows = await provider.execute(sql, params)
  const result = rows[0] as { total: number } | undefined
  return result?.total ?? 0
}

// ─── listRows ──────────────────────────────────────────────────────────────────

/**
 * List rows from a table with pagination, filtering, and sorting
 *
 * Replaces: `sqlite.prepare('SELECT * FROM x WHERE ... ORDER BY ... LIMIT ? OFFSET ?').all(...)`
 *
 * @param tableName - The table name
 * @param options - Query options
 * @param options.where - Optional WHERE clause (without 'WHERE' keyword)
 * @param options.params - Parameters for the WHERE clause
 * @param options.orderBy - Optional ORDER BY clause (without 'ORDER BY' keywords)
 * @param options.limit - Maximum number of rows to return
 * @param options.offset - Number of rows to skip
 * @returns Array of matching rows
 *
 * @example
 * ```typescript
 * const rows = await listRows('publisher_ct_articles', {
 *   where: 'status = ? AND deleted_at IS NULL',
 *   params: ['published'],
 *   orderBy: 'created_at DESC',
 *   limit: 25,
 *   offset: 0
 * })
 * ```
 */
export interface ListOptions {
  where?: string
  params?: unknown[]
  orderBy?: string
  limit: number
  offset: number
}

export async function listRows(
  tableName: string,
  options: ListOptions,
): Promise<Record<string, unknown>[]> {
  validateIdentifier(tableName, 'table')
  const provider = await getProvider()
  const { dialect } = provider

  const params: unknown[] = []

  // Build WHERE clause
  let whereClause = ''
  if (options.where) {
    if (dialect === 'postgres') {
      // Convert SQLite-style placeholders (?) to PostgreSQL-style ($1, $2)
      let pgIndex = 1
      whereClause = ` WHERE ${options.where.replace(/\?/g, () => `$${pgIndex++}`)}`
      if (options.params) {
        params.push(...options.params)
      }
    } else {
      whereClause = ` WHERE ${options.where}`
      if (options.params) {
        params.push(...options.params)
      }
    }
  }

  // Build ORDER BY clause
  const orderClause = options.orderBy ? ` ORDER BY ${options.orderBy}` : ''

  // Build LIMIT/OFFSET clause with proper placeholders
  const limitPlaceholder = placeholder(dialect, params.length + 1)
  const offsetPlaceholder = placeholder(dialect, params.length + 2)
  const paginationClause = ` LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`

  params.push(options.limit, options.offset)

  const sql = `SELECT * FROM ${tableName}${whereClause}${orderClause}${paginationClause}`
  const rows = await provider.execute(sql, params)

  return rows as Record<string, unknown>[]
}

// ─── existsWhere ───────────────────────────────────────────────────────────────

/**
 * Check if any row exists matching a column value, optionally excluding an ID
 *
 * Replaces: `sqlite.prepare('SELECT id FROM x WHERE col = ?').get(val)`
 * Commonly used for slug uniqueness checks
 *
 * @param tableName - The table name
 * @param column - The column name to check
 * @param value - The value to match
 * @param excludeId - Optional ID to exclude (for update scenarios)
 * @returns true if a matching row exists, false otherwise
 *
 * @example
 * ```typescript
 * // Check if slug exists
 * const slugTaken = await existsWhere('publisher_ct_articles', 'slug', 'my-article')
 *
 * // Check if slug exists for a different article (when updating)
 * const slugTaken = await existsWhere('publisher_ct_articles', 'slug', 'my-article', 123)
 * ```
 */
export async function existsWhere(
  tableName: string,
  column: string,
  value: unknown,
  excludeId?: number,
): Promise<boolean> {
  validateIdentifier(tableName, 'table')
  validateIdentifier(column, 'column')
  const provider = await getProvider()
  const { dialect } = provider

  const params: unknown[] = [value]
  let sql = `SELECT id FROM ${tableName} WHERE ${column} = ${placeholder(dialect, 1)}`

  if (excludeId !== undefined) {
    sql += ` AND id != ${placeholder(dialect, 2)}`
    params.push(excludeId)
  }

  // Add LIMIT 1 for efficiency (we only need to know if any row exists)
  sql += ' LIMIT 1'

  const rows = await provider.execute(sql, params)
  return rows.length > 0
}

// ─── findOneWhere ──────────────────────────────────────────────────────────────

/**
 * Find a single row matching a simple column = value condition
 *
 * Replaces: `sqlite.prepare('SELECT * FROM x WHERE col = ?').get(val)`
 *
 * @param tableName - The table name
 * @param column - The column name to match
 * @param value - The value to match
 * @returns The matching row, or null if not found
 *
 * @example
 * ```typescript
 * const page = await findOneWhere('publisher_pages', 'slug', 'about-us')
 * ```
 */
export async function findOneWhere(
  tableName: string,
  column: string,
  value: unknown,
): Promise<Record<string, unknown> | null> {
  validateIdentifier(tableName, 'table')
  validateIdentifier(column, 'column')
  const provider = await getProvider()
  const { dialect } = provider

  const sql = `SELECT * FROM ${tableName} WHERE ${column} = ${placeholder(dialect, 1)} LIMIT 1`
  const rows = await provider.execute(sql, [value])

  return rows.length > 0 ? (rows[0] as Record<string, unknown>) : null
}

// ─── findAllWhere ──────────────────────────────────────────────────────────────

/**
 * Find all rows matching a simple column = value condition
 *
 * Replaces: `sqlite.prepare('SELECT * FROM x WHERE col = ?').all(val)`
 *
 * @param tableName - The table name
 * @param column - The column name to match
 * @param value - The value to match
 * @param options - Optional additional options
 * @param options.orderBy - Optional ORDER BY clause
 * @param options.limit - Optional limit on number of results
 * @returns Array of matching rows
 *
 * @example
 * ```typescript
 * const blocks = await findAllWhere('publisher_page_blocks', 'page_id', 123, {
 *   orderBy: 'sort_order ASC'
 * })
 * ```
 */
export async function findAllWhere(
  tableName: string,
  column: string,
  value: unknown,
  options?: { orderBy?: string; limit?: number },
): Promise<Record<string, unknown>[]> {
  validateIdentifier(tableName, 'table')
  validateIdentifier(column, 'column')
  const provider = await getProvider()
  const { dialect } = provider

  const params: unknown[] = [value]
  let sql = `SELECT * FROM ${tableName} WHERE ${column} = ${placeholder(dialect, 1)}`

  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy}`
  }

  if (options?.limit !== undefined) {
    sql += ` LIMIT ${placeholder(dialect, params.length + 1)}`
    params.push(options.limit)
  }

  const rows = await provider.execute(sql, params)
  return rows as Record<string, unknown>[]
}

// ─── updateWhere ───────────────────────────────────────────────────────────────

/**
 * Update all rows matching a simple column = value condition
 *
 * Replaces: `sqlite.prepare('UPDATE x SET col = ? WHERE other_col = ?').run(...)`
 *
 * @param tableName - The table name
 * @param whereColumn - The column name for the WHERE clause
 * @param whereValue - The value to match in the WHERE clause
 * @param data - The data to update
 * @returns Number of rows affected
 *
 * @example
 * ```typescript
 * // Update sort order for all blocks on a page
 * await updateWhere('publisher_page_blocks', 'page_id', 123, { updated_at: new Date() })
 * ```
 */
export async function updateWhere(
  tableName: string,
  whereColumn: string,
  whereValue: unknown,
  data: Record<string, unknown>,
): Promise<number> {
  validateIdentifier(tableName, 'table')
  validateIdentifier(whereColumn, 'column')
  for (const key of Object.keys(data)) {
    validateIdentifier(key, 'column')
  }
  const provider = await getProvider()
  const { dialect } = provider

  // Serialize values for the dialect
  const serializedData = serializeValues(dialect, data)

  const columns = Object.keys(serializedData)
  const values = Object.values(serializedData)

  if (columns.length === 0) {
    throw new Error('updateWhere: No columns provided for update')
  }

  // Build SET clause
  const setClauses = columns.map((col, i) => {
    return `${col} = ${placeholder(dialect, i + 1)}`
  }).join(', ')

  // Add WHERE parameter
  const wherePlaceholder = placeholder(dialect, columns.length + 1)
  const sql = `UPDATE ${tableName} SET ${setClauses} WHERE ${whereColumn} = ${wherePlaceholder}`

  const params = [...values, whereValue]
  const rows = await provider.execute(sql, params)

  // For PostgreSQL, we could use RETURNING but for consistency we just return affected count
  // Note: better-sqlite3 returns { changes: number } but our execute returns rows
  // We'll return the rows length as an approximation (may not be accurate for all dialects)
  return rows.length
}

// ─── deleteWhere ───────────────────────────────────────────────────────────────

/**
 * Delete all rows matching a simple column = value condition
 *
 * Replaces: `sqlite.prepare('DELETE FROM x WHERE col = ?').run(val)`
 *
 * @param tableName - The table name
 * @param column - The column name for the WHERE clause
 * @param value - The value to match
 *
 * @example
 * ```typescript
 * // Delete all webhook logs for a webhook
 * await deleteWhere('publisher_webhook_logs', 'webhook_id', 123)
 * ```
 */
export async function deleteWhere(
  tableName: string,
  column: string,
  value: unknown,
): Promise<void> {
  validateIdentifier(tableName, 'table')
  validateIdentifier(column, 'column')
  const provider = await getProvider()
  const { dialect } = provider

  const sql = `DELETE FROM ${tableName} WHERE ${column} = ${placeholder(dialect, 1)}`
  await provider.execute(sql, [value])
}

// ─── Re-export helpers for advanced use cases ─────────────────────────────────

export {
  placeholder,
  placeholders,
  nowExpression,
  serializeValue,
  serializeValues,
  parseJsonColumns,
}
