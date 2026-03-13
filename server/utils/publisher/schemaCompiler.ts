import type { ContentTypeConfig, FieldConfig } from '../../../lib/publisher/types'
import { getProvider } from './database'
import { tableExists as dialectTableExists, getColumns as dialectGetColumns } from './database/dialect'
import type { SupportedDialect } from './database/provider'

/**
 * Compile a content type config into a SQL CREATE TABLE statement
 * and create the table in the database.
 *
 * Generates dialect-specific DDL for SQLite and PostgreSQL.
 * All content type tables are prefixed with `publisher_ct_`.
 */
export async function compileAndCreateTable(contentType: ContentTypeConfig): Promise<string> {
  // Validate content type name for safe table name generation
  if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(contentType.pluralName)) {
    throw new Error(`Invalid content type pluralName: "${contentType.pluralName}". Must be alphanumeric with underscores.`)
  }
  const tableName = `publisher_ct_${contentType.pluralName}`
  const provider = await getProvider()
  const dialect = provider.dialect
  const columns: string[] = []

  // Primary key
  columns.push(dialect === 'postgres' ? 'id SERIAL PRIMARY KEY' : 'id INTEGER PRIMARY KEY AUTOINCREMENT')

  // User-defined fields
  for (const [fieldName, fieldConfig] of Object.entries(contentType.fields)) {
    const col = compileField(fieldName, fieldConfig, dialect)
    if (col) columns.push(col)
  }

  // System fields based on options
  if (contentType.options?.draftAndPublish) {
    columns.push("status TEXT NOT NULL DEFAULT 'draft'")
    columns.push('published_at TEXT')
  }

  if (contentType.options?.timestamps !== false) {
    if (dialect === 'postgres') {
      columns.push('created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
      columns.push('updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()')
    } else {
      columns.push("created_at TEXT NOT NULL DEFAULT (datetime('now'))")
      columns.push("updated_at TEXT NOT NULL DEFAULT (datetime('now'))")
    }
  }

  if (contentType.options?.softDelete) {
    columns.push(dialect === 'postgres' ? 'deleted_at TIMESTAMPTZ' : 'deleted_at TEXT')
  }

  const sql = `CREATE TABLE IF NOT EXISTS ${tableName} (\n  ${columns.join(',\n  ')}\n)`

  // Execute the CREATE TABLE
  await provider.execute(sql)

  // ─── Create indexes for common query patterns ──────────────────

  // Index UID/slug fields for fast lookups
  for (const [fieldName, fieldConfig] of Object.entries(contentType.fields)) {
    if (fieldConfig.type === 'uid') {
      const colName = toSnakeCase(fieldName)
      await provider.execute(
        `CREATE INDEX IF NOT EXISTS idx_${tableName}_${colName} ON ${tableName}(${colName})`,
      )
    }
  }

  // Index status column for draft/publish filtering
  if (contentType.options?.draftAndPublish) {
    await provider.execute(
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_status ON ${tableName}(status)`,
    )
  }

  // Index deleted_at for soft delete filtering
  if (contentType.options?.softDelete) {
    await provider.execute(
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_deleted_at ON ${tableName}(deleted_at)`,
    )
  }

  // Index created_at for default sort order
  if (contentType.options?.timestamps !== false) {
    await provider.execute(
      `CREATE INDEX IF NOT EXISTS idx_${tableName}_created_at ON ${tableName}(created_at)`,
    )
  }

  return tableName
}

/**
 * Compile a single field config into a SQL column definition.
 */
function compileField(name: string, config: FieldConfig, dialect: SupportedDialect): string | null {
  // Validate field name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
    throw new Error(`Invalid field name: "${name}". Must be alphanumeric with underscores.`)
  }
  const colName = toSnakeCase(name)
  let sqlType: string
  let constraints = ''

  switch (config.type) {
    case 'string':
    case 'email':
    case 'password':
      sqlType = config.maxLength ? `VARCHAR(${config.maxLength})` : 'TEXT'
      break

    case 'text':
    case 'richtext':
      sqlType = 'TEXT'
      break

    case 'number':
      sqlType = 'INTEGER'
      break

    case 'boolean':
      sqlType = dialect === 'postgres' ? 'BOOLEAN' : 'INTEGER'
      break

    case 'date':
    case 'datetime':
      sqlType = 'TEXT' // ISO strings in both dialects for content type fields
      break

    case 'uid':
      sqlType = 'TEXT'
      constraints += ' UNIQUE'
      break

    case 'media':
      sqlType = 'INTEGER'
      break

    case 'relation':
      if ('relationType' in config && (config.relationType === 'oneToMany' || config.relationType === 'manyToMany')) {
        sqlType = dialect === 'postgres' ? 'JSONB' : 'TEXT'
      } else {
        sqlType = 'INTEGER'
      }
      break

    case 'enum':
      sqlType = 'TEXT'
      break

    case 'json':
      sqlType = dialect === 'postgres' ? 'JSONB' : 'TEXT'
      break

    default:
      return null
  }

  // Constraints
  if (config.required) {
    constraints += ' NOT NULL'
  }

  if (config.unique && config.type !== 'uid') {
    constraints += ' UNIQUE'
  }

  if (config.default !== undefined) {
    const defaultVal = formatDefault(config.default, dialect)
    constraints += ` DEFAULT ${defaultVal}`
  }

  return `${colName} ${sqlType}${constraints}`
}

/**
 * Format a default value for SQL.
 */
function formatDefault(value: unknown, dialect: SupportedDialect): string {
  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`
  if (typeof value === 'number') return String(value)
  if (typeof value === 'boolean') {
    if (dialect === 'postgres') return value ? 'true' : 'false'
    return value ? '1' : '0'
  }
  if (value === null) return 'NULL'
  return `'${JSON.stringify(value).replace(/'/g, "''")}'`
}

/**
 * Convert camelCase to snake_case.
 */
function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}

/**
 * Get the table name for a content type.
 */
export function getTableName(pluralName: string): string {
  return `publisher_ct_${pluralName}`
}

/**
 * Check if a table exists in the database (dialect-aware).
 * Uses centralized dialect helpers from ./database/dialect
 */
export async function contentTableExists(tableName: string): Promise<boolean> {
  const provider = await getProvider()
  return dialectTableExists(provider.dialect, provider, tableName)
}

/**
 * Get all column names for a table (dialect-aware).
 * Uses centralized dialect helpers from ./database/dialect
 */
export async function getTableColumns(tableName: string): Promise<string[]> {
  const provider = await getProvider()
  return dialectGetColumns(provider.dialect, provider, tableName)
}
