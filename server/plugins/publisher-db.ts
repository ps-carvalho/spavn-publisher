import { getProvider } from '../utils/publisher/database'
import { loadSchema } from '../utils/publisher/database/schema'
import { count, eq } from 'drizzle-orm'
import { registerContentType } from '../utils/publisher/registry'
import { compileAndCreateTable } from '../utils/publisher/schemaCompiler'
import { registerBlockType } from '../utils/publisher/blockRegistry'
import { registerPageType } from '../utils/publisher/pageTypeRegistry'
import { seedCoreTypes, seedMenus } from '../core/seeds'
import { safeSchemaSync } from '../utils/publisher/schemaMigration'
import { getSetting } from '../utils/publisher/settings'
import type { ContentTypeConfig } from '../../lib/publisher/types'
import type { BlockTypeConfig } from '../../lib/publisher/types'
import type { PageTypeConfig } from '../../lib/publisher/types'
import {
  initStorageRegistry,
  isInitialized as isStorageInitialized,
} from '../utils/publisher/storage/registry'
import {
  validateStorageConfigAsync,
  formatValidationResults,
} from '../utils/publisher/storage/validator'
import type { StorageConfig } from '../utils/publisher/storage/types'

export default defineNitroPlugin(async (nitroApp) => {
  console.log('[Publisher] Initializing database...')

  // Initialize the database provider (auto-detects from config)
  const provider = await getProvider()
  const dialect = provider.dialect
  console.log(`[Publisher] Database provider: ${dialect}`)

  // Log pool metrics for PostgreSQL
  if (provider.stats) {
    const stats = provider.stats()
    console.log(`[Publisher] Connection pool: active=${stats.activeConnections}, idle=${stats.idleConnections}`)
  }

  // Load dialect-specific schema
  const schema = await loadSchema(dialect)

  // ─── Create system tables (dialect-aware) ──────────────────────

  if (dialect === 'sqlite') {
    // SQLite: can execute multiple statements in one call
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'editor',
        auth_method TEXT NOT NULL DEFAULT 'password',
        email_verified TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_revoked_tokens (
        jti TEXT PRIMARY KEY,
        expires_at TEXT NOT NULL,
        revoked_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_api_tokens (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        token_prefix VARCHAR(8) NOT NULL,
        scopes TEXT NOT NULL DEFAULT '[]',
        user_id INTEGER REFERENCES publisher_users(id),
        last_used_at TEXT,
        expires_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        parent_id INTEGER REFERENCES publisher_folders(id),
        path TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(parent_id, slug)
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_media (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        url VARCHAR(500) NOT NULL,
        formats TEXT,
        alternative_text VARCHAR(500),
        folder VARCHAR(255),
        folder_id INTEGER REFERENCES publisher_folders(id),
        storage_provider TEXT DEFAULT 'local',
        storage_key TEXT,
        public_url TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_webhooks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        events TEXT NOT NULL DEFAULT '[]',
        secret VARCHAR(255),
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_webhook_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        webhook_id INTEGER NOT NULL REFERENCES publisher_webhooks(id),
        event VARCHAR(100) NOT NULL,
        status_code INTEGER,
        response_body TEXT,
        delivered_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_folder_permissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        folder_id INTEGER NOT NULL REFERENCES publisher_folders(id) ON DELETE CASCADE,
        role_id VARCHAR(50) NOT NULL,
        permission VARCHAR(20) NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(folder_id, role_id)
      )
    `)
    // Page builder tables
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_pages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_type TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'draft',
        meta_title TEXT,
        meta_description TEXT,
        meta_image INTEGER,
        meta_extra TEXT,
        published_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        deleted_at TEXT
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_page_blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        page_id INTEGER NOT NULL REFERENCES publisher_pages(id) ON DELETE CASCADE,
        area_name TEXT NOT NULL,
        block_type TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_content_type_defs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        plural_name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(100),
        description TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        is_system INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_block_type_defs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        icon VARCHAR(100),
        description TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        is_system INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_page_type_defs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        description TEXT,
        config TEXT NOT NULL DEFAULT '{}',
        is_system INTEGER NOT NULL DEFAULT 0,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    // Menu tables
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_menus (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        location VARCHAR(100),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_menu_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        menu_id INTEGER NOT NULL REFERENCES publisher_menus(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES publisher_menu_items(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        label VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'custom',
        url VARCHAR(500),
        target VARCHAR(20),
        icon VARCHAR(100),
        css_class VARCHAR(255),
        visible INTEGER NOT NULL DEFAULT 1,
        metadata TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  } else {
    // PostgreSQL
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) NOT NULL DEFAULT 'editor',
        auth_method VARCHAR(20) NOT NULL DEFAULT 'password',
        email_verified TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_revoked_tokens (
        jti TEXT PRIMARY KEY,
        expires_at TEXT NOT NULL,
        revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_api_tokens (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        token_prefix VARCHAR(8) NOT NULL,
        scopes JSONB NOT NULL DEFAULT '[]',
        user_id INTEGER REFERENCES publisher_users(id),
        last_used_at TEXT,
        expires_at TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_folders (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL,
        parent_id INTEGER REFERENCES publisher_folders(id),
        path TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(parent_id, slug)
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_media (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        size INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        url VARCHAR(500) NOT NULL,
        formats JSONB,
        alternative_text VARCHAR(500),
        folder VARCHAR(255),
        folder_id INTEGER REFERENCES publisher_folders(id),
        storage_provider TEXT DEFAULT 'local',
        storage_key TEXT,
        public_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_webhooks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        url VARCHAR(500) NOT NULL,
        events JSONB NOT NULL DEFAULT '[]',
        secret VARCHAR(255),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_webhook_logs (
        id SERIAL PRIMARY KEY,
        webhook_id INTEGER NOT NULL REFERENCES publisher_webhooks(id),
        event VARCHAR(100) NOT NULL,
        status_code INTEGER,
        response_body TEXT,
        delivered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_folder_permissions (
        id SERIAL PRIMARY KEY,
        folder_id INTEGER NOT NULL REFERENCES publisher_folders(id) ON DELETE CASCADE,
        role_id VARCHAR(50) NOT NULL,
        permission VARCHAR(20) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(folder_id, role_id)
      )
    `)
    // Page builder tables
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_pages (
        id SERIAL PRIMARY KEY,
        page_type TEXT NOT NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'draft',
        meta_title TEXT,
        meta_description TEXT,
        meta_image INTEGER,
        meta_extra JSONB,
        published_at TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_page_blocks (
        id SERIAL PRIMARY KEY,
        page_id INTEGER NOT NULL REFERENCES publisher_pages(id) ON DELETE CASCADE,
        area_name TEXT NOT NULL,
        block_type TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        data JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_settings (
        id SERIAL PRIMARY KEY,
        key TEXT NOT NULL UNIQUE,
        value JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_content_type_defs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        plural_name VARCHAR(100) NOT NULL UNIQUE,
        icon VARCHAR(100),
        description TEXT,
        config JSONB NOT NULL DEFAULT '{}',
        is_system BOOLEAN NOT NULL DEFAULT false,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_block_type_defs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        icon VARCHAR(100),
        description TEXT,
        config JSONB NOT NULL DEFAULT '{}',
        is_system BOOLEAN NOT NULL DEFAULT false,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_page_type_defs (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        display_name VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        description TEXT,
        config JSONB NOT NULL DEFAULT '{}',
        is_system BOOLEAN NOT NULL DEFAULT false,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    // Menu tables
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_menus (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        location VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
    await provider.execute(`
      CREATE TABLE IF NOT EXISTS publisher_menu_items (
        id SERIAL PRIMARY KEY,
        menu_id INTEGER NOT NULL REFERENCES publisher_menus(id) ON DELETE CASCADE,
        parent_id INTEGER REFERENCES publisher_menu_items(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        label VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'custom',
        url VARCHAR(500),
        target VARCHAR(20),
        icon VARCHAR(100),
        css_class VARCHAR(255),
        visible BOOLEAN NOT NULL DEFAULT true,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)
  }

  // ─── Create indexes (same syntax for both dialects) ────────────

  await provider.execute('CREATE INDEX IF NOT EXISTS idx_api_tokens_prefix ON publisher_api_tokens(token_prefix)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_publisher_folders_parent_id ON publisher_folders(parent_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_publisher_folders_path ON publisher_folders(path)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook_id ON publisher_webhook_logs(webhook_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_webhook_logs_delivered ON publisher_webhook_logs(delivered_at)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_folder_permissions_folder_id ON publisher_folder_permissions(folder_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_folder_permissions_role_id ON publisher_folder_permissions(role_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_media_folder_id ON publisher_media(folder_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_media_storage_provider ON publisher_media(storage_provider)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_page_blocks_page_id ON publisher_page_blocks(page_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_page_blocks_page_area ON publisher_page_blocks(page_id, area_name)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_pages_slug ON publisher_pages(slug)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_pages_status ON publisher_pages(status)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_menu_items_menu_id ON publisher_menu_items(menu_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_menu_items_parent_id ON publisher_menu_items(parent_id)')
  await provider.execute('CREATE INDEX IF NOT EXISTS idx_menu_items_sort_order ON publisher_menu_items(sort_order)')

  console.log('[Publisher] System tables verified.')

  // ─── Migration: Add new columns to publisher_media (dialect-aware) ───

  const addColumnSql = (table: string, column: string, type: string) => {
    return `ALTER TABLE ${table} ADD COLUMN ${column} ${type}`
  }

  const mediaColumns = [
    { col: 'folder_id', type: 'INTEGER REFERENCES publisher_folders(id)' },
    { col: 'storage_provider', type: "TEXT DEFAULT 'local'" },
    { col: 'storage_key', type: 'TEXT' },
    { col: 'public_url', type: 'TEXT' },
  ]

  for (const { col, type } of mediaColumns) {
    try {
      await provider.execute(addColumnSql('publisher_media', col, type))
      console.log(`[Publisher] Added ${col} column to publisher_media`)
    } catch {
      // Column already exists — expected on subsequent startups
    }
  }

  // ─── Migration: Add passwordless auth columns to publisher_users ───

  if (dialect === 'sqlite') {
    // SQLite migrations
    try {
      await provider.execute(`ALTER TABLE publisher_users ADD COLUMN auth_method TEXT NOT NULL DEFAULT 'password'`)
      console.log('[Publisher] Added auth_method column to publisher_users')
    } catch {
      // Column already exists
    }
    try {
      await provider.execute(`ALTER TABLE publisher_users ADD COLUMN email_verified TEXT`)
      console.log('[Publisher] Added email_verified column to publisher_users')
    } catch {
      // Column already exists
    }

    // Create passwordless auth tables
    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_webauthn_credentials (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          public_key TEXT NOT NULL,
          counter INTEGER NOT NULL DEFAULT 0,
          transports TEXT,
          device_name TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_used_at TEXT
        )
      `)
      console.log('[Publisher] Created publisher_webauthn_credentials table')
    } catch (err) {
      console.error('[Publisher] Error creating webauthn table:', err)
    }

    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_totp_secrets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          secret TEXT NOT NULL,
          backup_codes TEXT NOT NULL DEFAULT '[]',
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          last_used_at TEXT
        )
      `)
      console.log('[Publisher] Created publisher_totp_secrets table')
    } catch (err) {
      console.error('[Publisher] Error creating totp table:', err)
    }

    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_magic_link_tokens (
          token_hash TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          expires_at TEXT NOT NULL,
          used_at TEXT,
          ip_address TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      console.log('[Publisher] Created publisher_magic_link_tokens table')
    } catch (err) {
      console.error('[Publisher] Error creating magic link table:', err)
    }

    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_user_devices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          fingerprint TEXT NOT NULL,
          device_name TEXT,
          ip_address TEXT,
          is_trusted INTEGER NOT NULL DEFAULT 0,
          last_used_at TEXT NOT NULL DEFAULT (datetime('now')),
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      console.log('[Publisher] Created publisher_user_devices table')
    } catch (err) {
      console.error('[Publisher] Error creating user devices table:', err)
    }

    // Create publisher_settings table if not exists
    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT NOT NULL UNIQUE,
          value TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `)
      console.log('[Publisher] Created publisher_settings table')
    } catch (err) {
      console.error('[Publisher] Error creating publisher_settings table:', err)
    }
  } else {
    // PostgreSQL migrations
    try {
      await provider.execute(`ALTER TABLE publisher_users ADD COLUMN IF NOT EXISTS auth_method VARCHAR(20) NOT NULL DEFAULT 'password'`)
      console.log('[Publisher] Added auth_method column to publisher_users')
    } catch (err) {
      console.error('[Publisher] Error adding auth_method column:', err)
    }
    try {
      await provider.execute(`ALTER TABLE publisher_users ADD COLUMN IF NOT EXISTS email_verified TIMESTAMPTZ`)
      console.log('[Publisher] Added email_verified column to publisher_users')
    } catch (err) {
      console.error('[Publisher] Error adding email_verified column:', err)
    }

    // Create passwordless auth tables
    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_webauthn_credentials (
          id TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          public_key TEXT NOT NULL,
          counter INTEGER NOT NULL DEFAULT 0,
          transports JSONB,
          device_name TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ
        )
      `)
      console.log('[Publisher] Created publisher_webauthn_credentials table')
    } catch (err) {
      console.error('[Publisher] Error creating webauthn table:', err)
    }

    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_totp_secrets (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          secret TEXT NOT NULL,
          backup_codes JSONB NOT NULL DEFAULT '[]',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_used_at TIMESTAMPTZ
        )
      `)
      console.log('[Publisher] Created publisher_totp_secrets table')
    } catch (err) {
      console.error('[Publisher] Error creating totp table:', err)
    }

    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_magic_link_tokens (
          token_hash TEXT PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          ip_address TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      console.log('[Publisher] Created publisher_magic_link_tokens table')
    } catch (err) {
      console.error('[Publisher] Error creating magic link table:', err)
    }

    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_user_devices (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES publisher_users(id) ON DELETE CASCADE,
          fingerprint TEXT NOT NULL,
          device_name TEXT,
          ip_address TEXT,
          is_trusted BOOLEAN NOT NULL DEFAULT false,
          last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      console.log('[Publisher] Created publisher_user_devices table')
    } catch (err) {
      console.error('[Publisher] Error creating user devices table:', err)
    }

    // Create publisher_settings table if not exists
    try {
      await provider.execute(`
        CREATE TABLE IF NOT EXISTS publisher_settings (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
      console.log('[Publisher] Created publisher_settings table')
    } catch (err) {
      console.error('[Publisher] Error creating publisher_settings table:', err)
    }
  }

  // ─── Create default root folder (dialect-aware) ────────────────

  if (dialect === 'sqlite') {
    await provider.execute(`
      INSERT OR IGNORE INTO publisher_folders (id, name, slug, parent_id, path)
      VALUES (1, 'Media Library', 'media-library', NULL, '/')
    `)
  } else {
    await provider.execute(`
      INSERT INTO publisher_folders (id, name, slug, parent_id, path)
      VALUES (1, 'Media Library', 'media-library', NULL, '/')
      ON CONFLICT (id) DO NOTHING
    `)
  }
  console.log('[Publisher] Default root folder ensured')

  // ─── Migrate existing media to root folder ─────────────────────

  if (dialect === 'sqlite') {
    await provider.execute(`
      UPDATE publisher_media
      SET folder_id = 1,
          storage_provider = COALESCE(storage_provider, 'local'),
          storage_key = COALESCE(storage_key, 'root/' || name),
          public_url = COALESCE(public_url, url)
      WHERE folder_id IS NULL
    `)
  } else {
    await provider.execute(`
      UPDATE publisher_media
      SET folder_id = 1,
          storage_provider = COALESCE(storage_provider, 'local'),
          storage_key = COALESCE(storage_key, 'root/' || name),
          public_url = COALESCE(public_url, url)
      WHERE folder_id IS NULL
    `)
  }
  console.log('[Publisher] Existing media migrated to root folder')

  // ─── Seed default admin if no users exist ──────────────────────

  const db = provider.db as any
  const [userCount] = await db.select({ value: count() }).from(schema.publisherUsers)

  if (!userCount || userCount.value === 0) {
    const { hashPassword } = await import('../utils/publisher/auth')
    const hashedPassword = await hashPassword('admin')

    await db.insert(schema.publisherUsers).values({
      email: 'admin@publisher.local',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'super-admin',
      isActive: true,
    })

    console.log('[Publisher] Default admin user created: admin@publisher.local / admin')
  } else {
    console.log(`[Publisher] ${userCount.value} user(s) found, skipping seed.`)
  }

  // ─── Seed core types (content types, block types, page types) ─────

  await seedCoreTypes(db, schema)

  // ─── Seed default menu ──────────────────────────────────────────

  await seedMenus(db, schema)

  // ─── Clean expired revoked tokens (dialect-aware) ──────────────

  if (dialect === 'sqlite') {
    await provider.execute(`DELETE FROM publisher_revoked_tokens WHERE expires_at < datetime('now')`)
  } else {
    await provider.execute(`DELETE FROM publisher_revoked_tokens WHERE expires_at < NOW()::text`)
  }

  // ─── Clean old webhook delivery logs (retain 30 days) ──────────

  if (dialect === 'sqlite') {
    await provider.execute(`DELETE FROM publisher_webhook_logs WHERE delivered_at < datetime('now', '-30 days')`)
  } else {
    await provider.execute(`DELETE FROM publisher_webhook_logs WHERE delivered_at < NOW() - INTERVAL '30 days'`)
  }

  // ─── Load and register content types ─────────────────────────

  console.log('[Publisher] Loading content types...')

  try {
    // Load active content types from database
    const contentTypeDefs = await db
      .select()
      .from(schema.publisherContentTypeDefs)
      .where(eq(schema.publisherContentTypeDefs.active, true))
    const contentTypes = contentTypeDefs.map((row: { config: unknown }) => row.config as unknown as ContentTypeConfig)

    const createdTables: string[] = []
    for (const config of contentTypes) {
      if (!config || !config.name) {
        console.warn('[Publisher] Skipping invalid content type config')
        continue
      }
      registerContentType(config)
      const tableName = await compileAndCreateTable(config)
      createdTables.push(tableName)

      // Safe schema migration — add new columns if config has new fields
      const migration = await safeSchemaSync(config)
      if (migration.added.length > 0) {
        console.log(`[Publisher] Migrated '${config.pluralName}': added columns [${migration.added.join(', ')}]`)
      }
      if (migration.removed.length > 0) {
        console.log(`[Publisher] Note: '${config.pluralName}' has hidden columns [${migration.removed.join(', ')}] (removed from config but data preserved)`)
      }
      if (migration.warnings.length > 0) {
        migration.warnings.forEach(w => console.warn(`[Publisher] Warning: ${w}`))
      }

      console.log(`[Publisher] Registered content type '${config.displayName}' → ${tableName}`)
    }

    if (createdTables.length === 0) {
      console.log('[Publisher] No content types found.')
    } else {
      console.log(`[Publisher] ${createdTables.length} content type table(s) verified.`)
    }
  } catch (err) {
    console.error('[Publisher] Error loading content types:', err)
  }

  // ─── Initialize and validate storage configuration ──────────────

  console.log('[Publisher] Initializing storage...')

  try {
    // Load persisted storage config from database (overrides publisher.config.ts)
    const persistedStorageConfig = await getSetting('storage_config')

    if (persistedStorageConfig) {
      console.log('[Publisher] Loading storage config from database')
      await initStorageRegistry(persistedStorageConfig as unknown as StorageConfig)
    } else {
      await initStorageRegistry()
    }

    if (isStorageInitialized()) {
      const { getStorageConfig } = await import('../utils/publisher/storage/registry')
      const storageConfig = getStorageConfig()

      if (storageConfig) {
        const testConnectivity = process.env.PUBLISHER_TEST_STORAGE_CONNECTIVITY === 'true'
        const validationResult = await validateStorageConfigAsync(storageConfig, {
          testConnectivity,
          connectivityTimeout: 5000,
        })

        const logLines = formatValidationResults(storageConfig, validationResult)
        logLines.forEach(line => console.log(line))

        if (!validationResult.valid) {
          const defaultProvider = storageConfig.defaultProvider || Object.keys(storageConfig.providers)[0]
          const defaultErrors = validationResult.errors.filter(
            e => e.provider === defaultProvider || (e.provider === '_global' && e.field === 'defaultProvider'),
          )

          if (defaultErrors.length > 0) {
            console.warn('[Publisher] Warning: Default storage provider has errors - uploads may fail')
          }
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[Publisher] Storage initialization error:', message)
    console.warn('[Publisher] Falling back to default local storage configuration')
  }

  // ─── Load and register block types ────────────────────────────────

  console.log('[Publisher] Loading block types...')

  try {
    // Load active block types from database
    const blockTypeDefs = await db
      .select()
      .from(schema.publisherBlockTypeDefs)
      .where(eq(schema.publisherBlockTypeDefs.active, true))
    const blockTypes = blockTypeDefs.map((row: { config: unknown }) => row.config as unknown as BlockTypeConfig)

    for (const config of blockTypes) {
      if (!config || !config.name) {
        console.warn('[Publisher] Skipping invalid block type config')
        continue
      }
      registerBlockType(config)
    }
    console.log(`[Publisher] Registered ${blockTypes.length} block types`)
  } catch (err) {
    console.error('[Publisher] Error loading block types:', err)
  }

  // ─── Load and register page types ────────────────────────────────

  console.log('[Publisher] Loading page types...')

  try {
    // Load active page types from database
    const pageTypeDefs = await db
      .select()
      .from(schema.publisherPageTypeDefs)
      .where(eq(schema.publisherPageTypeDefs.active, true))
    const pageTypes = pageTypeDefs.map((row: { config: unknown }) => row.config as unknown as PageTypeConfig)

    for (const config of pageTypes) {
      if (!config || !config.name) {
        console.warn('[Publisher] Skipping invalid page type config')
        continue
      }
      registerPageType(config)
    }
    console.log(`[Publisher] Registered ${pageTypes.length} page types`)
  } catch (err) {
    console.error('[Publisher] Error loading page types:', err)
  }

  console.log('[Publisher] Database initialization complete.')

  // Register graceful shutdown hook
  nitroApp.hooks.hookOnce('close', async () => {
    console.log('[Publisher] Shutting down database connections...')
    try {
      const provider = await getProvider()
      await provider.close()
      console.log(`[Publisher] ${provider.dialect} connections closed.`)
    } catch (error) {
      console.error('[Publisher] Error closing database:', error instanceof Error ? error.message : String(error))
    }
  })
})
