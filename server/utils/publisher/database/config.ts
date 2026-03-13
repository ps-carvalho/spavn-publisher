/**
 * Database Configuration Resolver
 *
 * Resolves database configuration from multiple sources with proper priority:
 * 1. DATABASE_URL env var (highest priority - auto-detect provider from URL scheme)
 * 2. Individual DB_* env vars (DB_PROVIDER, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
 * 3. publisher.config.ts database section
 * 4. Default: SQLite at .data/publisher.db
 *
 * Uses Zod for configuration validation at startup.
 */

import { z } from 'zod'
import type { DatabaseConfig, SupportedDialect } from './provider'

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas for Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Zod schema for database provider validation
 */
const providerSchema = z.enum(['sqlite', 'postgres'], {
  message: 'Provider must be "sqlite" or "postgres"',
})

/**
 * Zod schema for SQLite configuration
 */
const sqliteConfigSchema = z.object({
  provider: z.literal('sqlite'),
  sqlitePath: z.string().optional().default('.data/publisher.db'),
})

/**
 * Zod schema for PostgreSQL configuration
 */
const postgresConfigSchema = z.object({
  provider: z.literal('postgres'),
  url: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().min(1).max(65535).optional(),
  user: z.string().optional(),
  password: z.string().optional(),
  database: z.string().optional(),
  poolSize: z.number().int().positive().optional(),
  connectionTimeout: z.number().int().positive().optional(),
  idleTimeout: z.number().int().positive().optional(),
}).refine(
  (data) => data.url || (data.host && data.database),
  {
    message: 'PostgreSQL requires either "url" or both "host" and "database"',
  }
)

/**
 * Combined database configuration schema
 */
const databaseConfigSchema = z.discriminatedUnion('provider', [
  sqliteConfigSchema,
  postgresConfigSchema,
])

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Sources
// ─────────────────────────────────────────────────────────────────────────────

/** Configuration source for logging */
type ConfigSource = 'env-url' | 'env-vars' | 'config-file' | 'default'

/** Interface for the resolved configuration with metadata */
interface ResolvedDatabaseConfig {
  config: DatabaseConfig
  source: ConfigSource
}

/**
 * Detect database provider from a connection URL
 *
 * @param url - The connection URL to parse
 * @returns The detected provider or null if not recognized
 */
function detectProviderFromUrl(url: string): SupportedDialect | null {
  if (url.startsWith('file:') || url.startsWith('sqlite:')) {
    return 'sqlite'
  }
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgres'
  }
  return null
}

/**
 * Parse individual DB_* environment variables into a config object
 *
 * @returns Partial database config from individual env vars, or null if none set
 */
function parseEnvVarsConfig(): Partial<DatabaseConfig> | null {
  const envProvider = process.env.DB_PROVIDER as SupportedDialect | undefined

  // Check if any DB_* env vars are set
  const hasEnvConfig =
    envProvider ||
    process.env.DB_HOST ||
    process.env.DB_PORT ||
    process.env.DB_USER ||
    process.env.DB_PASSWORD ||
    process.env.DB_NAME

  if (!hasEnvConfig) {
    return null
  }

  const provider = envProvider || 'postgres' // Default to postgres when using individual vars

  if (provider === 'sqlite') {
    return {
      provider: 'sqlite',
      sqlitePath: process.env.DATABASE_URL || '.data/publisher.db',
    }
  }

  return {
    provider: 'postgres',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : undefined,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  }
}

/**
 * Load configuration from publisher.config.ts
 *
 * Uses dynamic import with try/catch to handle missing or invalid config files.
 *
 * @returns Database config from file, or null if not defined
 */
function loadFileConfig(): Partial<DatabaseConfig> | null {
  try {
    // Use require for synchronous loading since config resolution should be sync
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const configPath = require.resolve('../../../publisher.config.ts')
    // Clear cache to ensure fresh config on each call (useful for testing)
    delete require.cache[configPath]
    const config = require(configPath)

    if (config?.default?.database) {
      return config.default.database as Partial<DatabaseConfig>
    }
    return null
  } catch {
    // Config file doesn't exist or has errors - use defaults
    return null
  }
}

/**
 * Create the default SQLite configuration
 */
function getDefaultConfig(): DatabaseConfig {
  return {
    provider: 'sqlite',
    sqlitePath: '.data/publisher.db',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Resolver Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve database configuration with proper priority
 *
 * Priority order (highest to lowest):
 * 1. DATABASE_URL env var - auto-detect provider from URL scheme
 * 2. Individual DB_* env vars - DB_PROVIDER, DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 * 3. publisher.config.ts database section
 * 4. Default: SQLite at .data/publisher.db
 *
 * @returns Resolved configuration with source metadata
 * @throws ZodError if configuration is invalid
 */
export function resolveDbConfig(): ResolvedDatabaseConfig {
  const databaseUrl = process.env.DATABASE_URL

  // Priority 1: DATABASE_URL environment variable
  if (databaseUrl) {
    const detectedProvider = detectProviderFromUrl(databaseUrl)

    if (detectedProvider === 'postgres') {
      const config: DatabaseConfig = {
        provider: 'postgres',
        url: databaseUrl,
      }
      const validated = databaseConfigSchema.parse(config)
      return { config: validated as DatabaseConfig, source: 'env-url' }
    }

    if (detectedProvider === 'sqlite') {
      // Extract path from file: URL
      const sqlitePath = databaseUrl.replace(/^file:|^sqlite:/, '')
      const config: DatabaseConfig = {
        provider: 'sqlite',
        sqlitePath,
      }
      const validated = databaseConfigSchema.parse(config)
      return { config: validated as DatabaseConfig, source: 'env-url' }
    }

    // Unknown URL scheme - fall through to other sources
    // This allows DATABASE_URL to be used by the storage config or other systems
  }

  // Priority 2: Individual DB_* environment variables
  const envVarsConfig = parseEnvVarsConfig()
  if (envVarsConfig && envVarsConfig.provider) {
    const validated = databaseConfigSchema.parse(envVarsConfig)
    return { config: validated as DatabaseConfig, source: 'env-vars' }
  }

  // Priority 3: publisher.config.ts database section
  const fileConfig = loadFileConfig()
  if (fileConfig && fileConfig.provider) {
    const validated = databaseConfigSchema.parse(fileConfig)
    return { config: validated as DatabaseConfig, source: 'config-file' }
  }

  // Priority 4: Default to SQLite
  const defaultConfig = getDefaultConfig()
  const validated = databaseConfigSchema.parse(defaultConfig)
  return { config: validated as DatabaseConfig, source: 'default' }
}

/**
 * Log the resolved configuration source
 *
 * Outputs a startup message indicating which database provider and config source is being used.
 */
export function logConfigSource(): void {
  const { config, source } = resolveDbConfig()

  const sourceLabels: Record<ConfigSource, string> = {
    'env-url': 'DATABASE_URL env',
    'env-vars': 'DB_* env vars',
    'config-file': 'publisher.config.ts',
    'default': 'default',
  }

  // Use console.log for server startup messages
  console.log(
    `[Publisher] Database: ${config.provider}` +
      (config.provider === 'sqlite' && config.sqlitePath ? ` (${config.sqlitePath})` : '') +
      (config.provider === 'postgres' && config.host ? ` (${config.host})` : '') +
      ` (source: ${sourceLabels[source]})`
  )
}

/**
 * Validate database configuration without resolving
 *
 * Useful for testing configuration validity before the application starts.
 *
 * @param config - Configuration to validate
 * @returns true if valid, throws ZodError if invalid
 */
export function validateDbConfig(config: unknown): config is DatabaseConfig {
  databaseConfigSchema.parse(config)
  return true
}

// Re-export the schema for external use
export { databaseConfigSchema }
