/**
 * Settings Service
 * 
 * Provides type-safe access to system settings stored in the database.
 * Uses in-memory caching for performance.
 */

import { getDb, getSchema } from './database'
import { eq, inArray } from 'drizzle-orm'

// ─── Cache ───────────────────────────────────────────────────────────

/** In-memory cache for settings */
const settingsCache = new Map<string, unknown>()

/** Whether the cache has been populated */
let cachePopulated = false

// ─── Types ────────────────────────────────────────────────────────────

export interface SettingRecord {
  id: number
  key: string
  value: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

// ─── Cache Management ─────────────────────────────────────────────────

/**
 * Clears the settings cache.
 * Call this after updating settings directly in the database.
 */
export function clearSettingsCache(): void {
  settingsCache.clear()
  cachePopulated = false
}

/**
 * Check if the cache has been populated.
 * Useful for debugging and cache invalidation strategies.
 */
export function isCachePopulated(): boolean {
  return cachePopulated
}

// ─── Core Functions ───────────────────────────────────────────────────

/**
 * Gets a setting value by key.
 * Returns the default value if the setting doesn't exist.
 * 
 * @param key - The setting key
 * @param defaultValue - Default value if setting doesn't exist
 * @returns The setting value or default
 * 
 * @example
 * ```typescript
 * // Get a setting with a default value
 * const theme = await getSetting<string>('theme', 'light')
 * 
 * // Get a complex setting
 * const config = await getSetting<DatabaseConfig>('database_config')
 * ```
 */
export async function getSetting<T = unknown>(
  key: string,
  defaultValue?: T
): Promise<T | undefined> {
  // Check cache first
  if (settingsCache.has(key)) {
    return settingsCache.get(key) as T
  }

  // Load from database
  const db = await getDb() as any // Cast once - db type is unknown due to pre-existing codebase issue
  const { publisherSettings } = await getSchema()

  const result = await db
    .select()
    .from(publisherSettings)
    .where(eq(publisherSettings.key, key))
    .limit(1)

  if (result.length === 0) {
    return defaultValue
  }

  const value = result[0].value as T
  settingsCache.set(key, value)
  return value
}

/**
 * Sets a setting value.
 * Creates the setting if it doesn't exist, updates if it does.
 * 
 * @param key - The setting key
 * @param value - The value to store (must be JSON-serializable)
 * 
 * @example
 * ```typescript
 * await setSetting('theme', { mode: 'dark', accent: 'blue' })
 * ```
 */
export async function setSetting(
  key: string,
  value: Record<string, unknown>
): Promise<void> {
  const db = await getDb() as any // Cast once - db type is unknown due to pre-existing codebase issue
  const { publisherSettings } = await getSchema()

  // Check if setting exists
  const existing = await db
    .select()
    .from(publisherSettings)
    .where(eq(publisherSettings.key, key))
    .limit(1)

  const now = new Date().toISOString()

  if (existing.length > 0) {
    // Update existing
    await db
      .update(publisherSettings)
      .set({
        value,
        updatedAt: now
      })
      .where(eq(publisherSettings.key, key))
  } else {
    // Insert new
    await db.insert(publisherSettings).values({
      key,
      value,
    })
  }

  // Update cache
  settingsCache.set(key, value)
}

/**
 * Gets all settings as a key-value map.
 * Populates the cache on first call.
 * 
 * @returns Record of all settings
 * 
 * @example
 * ```typescript
 * const settings = await getAllSettings()
 * console.log(settings['theme']) // { mode: 'dark', accent: 'blue' }
 * ```
 */
export async function getAllSettings(): Promise<Record<string, unknown>> {
  // Return cached values if available
  if (cachePopulated) {
    const result: Record<string, unknown> = {}
    settingsCache.forEach((value, key) => {
      result[key] = value
    })
    return result
  }

  // Load all from database
  const db = await getDb() as any // Cast once - db type is unknown due to pre-existing codebase issue
  const { publisherSettings } = await getSchema()

  const results = await db.select().from(publisherSettings)

  // Populate cache
  for (const row of results) {
    settingsCache.set(row.key, row.value)
  }
  cachePopulated = true

  // Return as object
  const result: Record<string, unknown> = {}
  for (const row of results) {
    result[row.key] = row.value
  }
  return result
}

/**
 * Deletes a setting by key.
 * Removes from both database and cache.
 * 
 * @param key - The setting key to delete
 * 
 * @example
 * ```typescript
 * await deleteSetting('deprecated_feature_flag')
 * ```
 */
export async function deleteSetting(key: string): Promise<void> {
  const db = await getDb() as any // Cast once - db type is unknown due to pre-existing codebase issue
  const { publisherSettings } = await getSchema()

  await db.delete(publisherSettings).where(eq(publisherSettings.key, key))
  settingsCache.delete(key)
}

/**
 * Checks if a setting exists.
 * 
 * @param key - The setting key to check
 * @returns true if the setting exists
 */
export async function hasSetting(key: string): Promise<boolean> {
  // Check cache first
  if (settingsCache.has(key)) {
    return true
  }

  // Check database
  const db = await getDb() as any // Cast once - db type is unknown due to pre-existing codebase issue
  const { publisherSettings } = await getSchema()

  const result = await db
    .select({ key: publisherSettings.key })
    .from(publisherSettings)
    .where(eq(publisherSettings.key, key))
    .limit(1)

  return result.length > 0
}

/**
 * Gets multiple settings by keys.
 * More efficient than multiple getSetting calls.
 * 
 * @param keys - Array of setting keys to retrieve
 * @returns Record of found settings
 * 
 * @example
 * ```typescript
 * const settings = await getSettings(['theme', 'language', 'timezone'])
 * ```
 */
export async function getSettings(keys: string[]): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = {}
  const uncachedKeys: string[] = []

  // Check cache for each key
  for (const key of keys) {
    if (settingsCache.has(key)) {
      result[key] = settingsCache.get(key)
    } else {
      uncachedKeys.push(key)
    }
  }

  // If all keys were cached, return early
  if (uncachedKeys.length === 0) {
    return result
  }

  // Fetch uncached keys from database
  const db = await getDb() as any // Cast once - db type is unknown due to pre-existing codebase issue
  const { publisherSettings } = await getSchema()

  // Use inArray for multiple keys, eq for single key
  const dbResults = uncachedKeys.length === 1
    ? await db
        .select()
        .from(publisherSettings)
        .where(eq(publisherSettings.key, uncachedKeys[0]))
    : await db
        .select()
        .from(publisherSettings)
        .where(inArray(publisherSettings.key, uncachedKeys))

  for (const row of dbResults) {
    settingsCache.set(row.key, row.value)
    result[row.key] = row.value
  }

  return result
}
