import { defineConfig } from 'drizzle-kit'

/**
 * Drizzle Kit Configuration
 *
 * Supports multiple dialects based on the DB_PROVIDER environment variable.
 * Default: SQLite (zero-config)
 *
 * Usage:
 *   SQLite (default):  npx drizzle-kit generate
 *   PostgreSQL:        DB_PROVIDER=postgres DATABASE_URL=postgresql://... npx drizzle-kit generate
 */

const provider = process.env.DB_PROVIDER || 'sqlite'

function getConfig() {
  if (provider === 'postgres') {
    return defineConfig({
      schema: './server/utils/publisher/database/schema/postgres.ts',
      out: './server/database/migrations/postgres',
      dialect: 'postgresql',
      dbCredentials: {
        url: process.env.DATABASE_URL || 'postgresql://publisher:publisher@localhost:5432/publisher',
      },
    })
  }

  // Default: SQLite
  return defineConfig({
    schema: './server/utils/publisher/database/schema/sqlite.ts',
    out: './server/database/migrations/sqlite',
    dialect: 'sqlite',
    dbCredentials: {
      url: process.env.DATABASE_URL || '.data/publisher.db',
    },
  })
}

export default getConfig()
