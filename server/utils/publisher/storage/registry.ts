import type {
  StorageConfig,
  StorageProvider,
  AnyStorageConfig,
} from './types'
import { LocalFilesystemProvider } from './providers/local'
import { CloudflareR2Provider } from './providers/r2'
import { S3Provider } from './providers/s3'
import { getSetting, setSetting, clearSettingsCache } from '../settings'

// ─── Registry State ─────────────────────────────────────────────────────────────

/**
 * Internal registry state for managing storage providers.
 */
interface RegistryState {
  /** Map of provider names to provider instances */
  providers: Map<string, StorageProvider>
  /** Name of the default provider */
  defaultProviderName: string
  /** Whether the registry has been initialized */
  initialized: boolean
  /** The configuration used to initialize the registry */
  config: StorageConfig | null
}

/**
 * Singleton registry state.
 */
const state: RegistryState = {
  providers: new Map(),
  defaultProviderName: 'local',
  initialized: false,
  config: null,
}

// ─── Default Configuration ──────────────────────────────────────────────────────

/**
 * Creates the default storage configuration using environment variables
 * and sensible defaults.
 *
 * @returns Default StorageConfig
 */
function createDefaultConfig(): StorageConfig {
  return {
    providers: {
      local: {
        type: 'local',
        basePath: process.env.PUBLISHER_UPLOAD_DIR || './public/uploads',
        baseUrl: '/uploads',
        createDirectories: true,
        default: true,
      },
    },
    defaultProvider: 'local',
  }
}

// ─── Provider Factory ───────────────────────────────────────────────────────────

/**
 * Creates a storage provider instance based on configuration type.
 *
 * @param name - Provider name
 * @param config - Provider configuration
 * @returns StorageProvider instance
 * @throws Error if provider type is not supported
 */
function createProvider(name: string, config: AnyStorageConfig): StorageProvider {
  const providerType = config.type

  if (providerType === 'local') {
    return new LocalFilesystemProvider(config)
  }

  if (providerType === 'r2') {
    return new CloudflareR2Provider(config)
  }

  if (providerType === 's3') {
    return new S3Provider(config)
  }

  // Handle any custom/unknown provider types
  throw new Error(
    `Unknown storage provider type: "${providerType}". ` +
    `Supported types: local, r2, s3`
  )
}

/**
 * Finds the default provider name from configuration.
 * Checks for explicit default flag, then falls back to defaultProvider setting,
 * then uses the first provider in the map.
 *
 * @param config - Storage configuration
 * @returns Name of the default provider
 */
function findDefaultProviderName(config: StorageConfig): string {
  // Check for explicit default flag in provider configs
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    if (providerConfig.default) {
      return name
    }
  }

  // Fall back to defaultProvider setting
  if (config.defaultProvider && config.providers[config.defaultProvider]) {
    return config.defaultProvider
  }

  // Use first provider in the map
  const firstProvider = Object.keys(config.providers)[0]
  if (firstProvider) {
    return firstProvider
  }

  // Ultimate fallback
  return 'local'
}

// ─── Configuration Loading ──────────────────────────────────────────────────────

/**
 * Attempts to load storage configuration from the database.
 * Returns null if no configuration is stored.
 */
async function loadConfigFromDatabase(): Promise<StorageConfig | null> {
  try {
    const config = await getSetting<StorageConfig>('storage')
    return config ?? null
  } catch {
    // Database not available or error - fall back to file
    return null
  }
}

/**
 * Attempts to load storage configuration from publisher.config.ts.
 * Returns null if not found or on error.
 */
async function loadConfigFromFile(): Promise<StorageConfig | null> {
  try {
    // Dynamic import of publisher.config.ts from project root
    // Use path resolution that works in both dev and production builds
    const { join } = await import('path')
    const { pathToFileURL } = await import('url')

    // Try to locate publisher.config.ts in the project root
    const cwd = process.cwd()
    const configPath = join(cwd, 'publisher.config.ts')

    try {
      // Convert to file URL for Windows compatibility
      const configUrl = pathToFileURL(configPath).href
      const configModule = await import(configUrl) as { default?: { storage?: StorageConfig } }
      const config = configModule?.default as { storage?: StorageConfig } | undefined

      if (config?.storage) {
        return config.storage
      }
    } catch {
      // Config file not found or import failed - use defaults
    }

    return null
  } catch {
    // Config file not found or invalid - use defaults
    return null
  }
}

/**
 * Loads storage configuration with fallback chain:
 * 1. Database (if available)
 * 2. publisher.config.ts file
 * 3. Default configuration
 */
async function loadStorageConfig(): Promise<StorageConfig> {
  // Try database first
  const dbConfig = await loadConfigFromDatabase()
  if (dbConfig) {
    return dbConfig
  }

  // Fall back to file
  const fileConfig = await loadConfigFromFile()
  if (fileConfig) {
    return fileConfig
  }

  // Ultimate fallback to defaults
  return createDefaultConfig()
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/**
 * Initializes the storage registry with the provided configuration.
 * If no configuration is provided, attempts to load from publisher.config.ts,
 * falling back to default local storage configuration.
 *
 * This function is idempotent - calling it multiple times will reinitialize
 * the registry with the new configuration.
 *
 * @param config - Optional storage configuration to use
 * @returns Promise that resolves when initialization is complete
 *
 * @example
 * ```typescript
 * // Initialize with custom config
 * await initStorageRegistry({
 *   providers: {
 *     local: { type: 'local', basePath: './uploads', baseUrl: '/uploads' },
 *     r2: {
 *       type: 'r2',
 *       accountId: 'abc123',
 *       bucket: 'my-bucket',
 *       accessKeyId: 'key',
 *       secretAccessKey: 'secret',
 *     },
 *   },
 *   defaultProvider: 'local',
 * })
 *
 * // Or initialize with defaults (loads from publisher.config.ts or uses built-in defaults)
 * await initStorageRegistry()
 * ```
 */
export async function initStorageRegistry(config?: StorageConfig): Promise<void> {
  // Use provided config, or try to load from database/file/defaults
  let storageConfig: StorageConfig

  if (config) {
    storageConfig = config
  } else {
    storageConfig = await loadStorageConfig()
  }

  // Reset state for reinitialization
  state.providers.clear()
  state.config = storageConfig

  // Determine default provider
  state.defaultProviderName = findDefaultProviderName(storageConfig)

  // Mark as initialized (providers are created lazily)
  state.initialized = true
}

/**
 * Gets a storage provider by name.
 * If no name is provided, returns the default provider.
 *
 * Providers are lazily initialized on first access.
 *
 * @param name - Optional provider name (defaults to default provider)
 * @returns The requested storage provider
 * @throws Error if registry is not initialized or provider doesn't exist
 *
 * @example
 * ```typescript
 * // Get default provider
 * const provider = getProvider()
 *
 * // Get specific provider
 * const r2Provider = getProvider('r2')
 * ```
 */
export function getStorageProvider(name?: string): StorageProvider {
  if (!state.initialized) {
    // Auto-initialize with defaults if not already done
    // Note: This is synchronous, so we can't load from config file
    // In production, initStorageRegistry() should be called at startup
    const defaultConfig = createDefaultConfig()
    state.config = defaultConfig
    state.defaultProviderName = 'local'
    state.initialized = true
  }

  const providerName = name ?? state.defaultProviderName

  // Check if provider exists in config
  if (!state.config?.providers[providerName]) {
    const available = Object.keys(state.config?.providers ?? {}).join(', ')
    throw new Error(
      `Storage provider "${providerName}" not found. ` +
      `Available providers: ${available || 'none'}`
    )
  }

  // Lazy initialization - create provider on first access
  if (!state.providers.has(providerName)) {
    const providerConfig = state.config!.providers[providerName]
    const provider = createProvider(providerName, providerConfig)
    state.providers.set(providerName, provider)
  }

  return state.providers.get(providerName)!
}

/**
 * Gets the default storage provider.
 *
 * @returns The default storage provider
 * @throws Error if registry is not initialized
 *
 * @example
 * ```typescript
 * const provider = getDefaultProvider()
 * const result = await provider.upload({
 *   key: 'files/document.pdf',
 *   data: buffer,
 *   mimeType: 'application/pdf',
 * })
 * ```
 */
export function getDefaultProvider(): StorageProvider {
  return getStorageProvider()
}

/**
 * Gets the list of available provider names.
 *
 * @returns Array of provider names
 *
 * @example
 * ```typescript
 * const names = getProviderNames()
 * // ['local', 'r2']
 * ```
 */
export function getProviderNames(): string[] {
  if (!state.initialized || !state.config) {
    return ['local']
  }
  return Object.keys(state.config.providers)
}

/**
 * Checks if a provider with the given name exists.
 *
 * @param name - Provider name to check
 * @returns True if provider exists, false otherwise
 *
 * @example
 * ```typescript
 * if (hasProvider('r2')) {
 *   const r2Provider = getProvider('r2')
 * }
 * ```
 */
export function hasProvider(name: string): boolean {
  if (!state.initialized || !state.config) {
    return name === 'local'
  }
  return name in state.config.providers
}

/**
 * Gets the name of the default provider.
 *
 * @returns The default provider name
 *
 * @example
 * ```typescript
 * const defaultName = getDefaultProviderName()
 * // 'local'
 * ```
 */
export function getDefaultProviderName(): string {
  return state.defaultProviderName
}

/**
 * Clears the registry state.
 * Useful for testing or reconfiguration.
 *
 * @internal
 */
export function resetRegistry(): void {
  state.providers.clear()
  state.defaultProviderName = 'local'
  state.initialized = false
  state.config = null
}

/**
 * Checks if the registry has been initialized.
 *
 * @returns True if initialized, false otherwise
 *
 * @example
 * ```typescript
 * if (!isInitialized()) {
 *   await initStorageRegistry()
 * }
 * ```
 */
export function isInitialized(): boolean {
  return state.initialized
}

/**
 * Gets the current storage configuration.
 * Returns null if the registry has not been initialized.
 *
 * @returns The current StorageConfig or null
 *
 * @example
 * ```typescript
 * const config = getStorageConfig()
 * if (config) {
 *   console.log('Default provider:', config.defaultProvider)
 * }
 * ```
 */
export function getStorageConfig(): StorageConfig | null {
  return state.config
}

/**
 * Saves storage configuration to the database.
 * Also reinitializes the registry with the new config.
 *
 * @param config - The storage configuration to save
 *
 * @example
 * ```typescript
 * await saveStorageConfig({
 *   providers: {
 *     s3: {
 *       type: 's3',
 *       region: 'us-east-1',
 *       bucket: 'my-bucket',
 *       accessKeyId: 'key',
 *       secretAccessKey: 'secret',
 *       default: true,
 *     },
 *   },
 *   defaultProvider: 's3',
 * })
 * ```
 */
export async function saveStorageConfig(config: StorageConfig): Promise<void> {
  await setSetting('storage', config as unknown as Record<string, unknown>)
  clearSettingsCache()
  await initStorageRegistry(config)
}

// NOTE: No re-exports of types or providers here.
// Nuxt auto-imports from server/utils/ recursively, so re-exporting
// symbols from types.ts or providers/ causes "Duplicated imports" warnings.
// Consumers should either:
// 1. Use Nuxt auto-imports (no import statement needed)
// 2. Import directly from the sub-module (e.g., './storage/types')
