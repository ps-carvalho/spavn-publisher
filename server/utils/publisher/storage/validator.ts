import type {
  StorageConfig,
  AnyStorageConfig,
  LocalStorageConfig,
  R2StorageConfig,
  S3StorageConfig,
  StorageProvider,
} from './types'
import { LocalFilesystemProvider } from './providers/local'
import { CloudflareR2Provider } from './providers/r2'
import { S3Provider } from './providers/s3'

// ─── Validation Types ───────────────────────────────────────────────────────────

/**
 * Validation error for a specific provider and field.
 */
export interface ValidationError {
  /** Name of the provider with the error */
  provider: string
  /** Field that has the error */
  field: string
  /** Human-readable error message */
  message: string
}

/**
 * Validation warning for non-critical issues.
 */
export interface ValidationWarning {
  /** Name of the provider with the warning */
  provider: string
  /** Human-readable warning message */
  message: string
}

/**
 * Result of storage configuration validation.
 */
export interface ValidationResult {
  /** Whether the configuration is valid (no errors) */
  valid: boolean
  /** List of validation errors */
  errors: ValidationError[]
  /** List of validation warnings */
  warnings: ValidationWarning[]
  /** Connectivity test results (if enabled) */
  connectivity?: ConnectivityResult[]
}

/**
 * Result of connectivity test for a provider.
 */
export interface ConnectivityResult {
  /** Name of the provider tested */
  provider: string
  /** Whether the connectivity test passed */
  success: boolean
  /** Error message if the test failed */
  error?: string
  /** Time taken for the test in milliseconds */
  duration?: number
}

/**
 * Options for storage validation.
 */
export interface ValidationOptions {
  /** Whether to test connectivity to cloud providers */
  testConnectivity?: boolean
  /** Timeout for connectivity tests in milliseconds */
  connectivityTimeout?: number
}

// ─── Provider Validation Functions ───────────────────────────────────────────────

/**
 * Validates a local storage configuration.
 */
function validateLocalStorage(
  name: string,
  config: LocalStorageConfig
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  if (!config.basePath || config.basePath.trim() === '') {
    errors.push({
      provider: name,
      field: 'basePath',
      message: 'basePath is required for local storage',
    })
  }

  if (!config.baseUrl || config.baseUrl.trim() === '') {
    errors.push({
      provider: name,
      field: 'baseUrl',
      message: 'baseUrl is required for local storage',
    })
  }

  // Warn if basePath doesn't look like a valid path
  if (config.basePath && !config.basePath.startsWith('/') && !config.basePath.startsWith('.')) {
    warnings.push({
      provider: name,
      message: `basePath "${config.basePath}" should typically start with "/" or "./" for clarity`,
    })
  }

  // Warn if baseUrl doesn't start with "/"
  if (config.baseUrl && !config.baseUrl.startsWith('/')) {
    warnings.push({
      provider: name,
      message: `baseUrl "${config.baseUrl}" should typically start with "/" for relative URLs`,
    })
  }

  return { errors, warnings }
}

/**
 * Validates an R2 storage configuration.
 */
function validateR2Storage(
  name: string,
  config: R2StorageConfig
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Required fields
  if (!config.accountId || config.accountId.trim() === '') {
    errors.push({
      provider: name,
      field: 'accountId',
      message: 'accountId is required for R2 storage',
    })
  }

  if (!config.bucket || config.bucket.trim() === '') {
    errors.push({
      provider: name,
      field: 'bucket',
      message: 'bucket is required for R2 storage',
    })
  }

  // Check credentials (can be in config or env vars)
  const hasAccessKey = !!(config.accessKeyId || process.env.R2_ACCESS_KEY_ID)
  const hasSecretKey = !!(config.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY)

  if (!hasAccessKey) {
    errors.push({
      provider: name,
      field: 'accessKeyId',
      message: 'R2 accessKeyId is required (set in config or PUBLISHER_R2_ACCESS_KEY_ID env var)',
    })
  }

  if (!hasSecretKey) {
    errors.push({
      provider: name,
      field: 'secretAccessKey',
      message: 'R2 secretAccessKey is required (set in config or PUBLISHER_R2_SECRET_ACCESS_KEY env var)',
    })
  }

  // Warnings
  if (!config.customDomain && config.public) {
    warnings.push({
      provider: name,
      message: 'public bucket without customDomain will use R2 public URLs',
    })
  }

  return { errors, warnings }
}

/**
 * Validates an S3 storage configuration.
 */
function validateS3Storage(
  name: string,
  config: S3StorageConfig
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  const errors: ValidationError[] = []
  const warnings: ValidationWarning[] = []

  // Required fields
  if (!config.bucket || config.bucket.trim() === '') {
    errors.push({
      provider: name,
      field: 'bucket',
      message: 'bucket is required for S3 storage',
    })
  }

  if (!config.region || config.region.trim() === '') {
    errors.push({
      provider: name,
      field: 'region',
      message: 'region is required for S3 storage',
    })
  }

  // Check credentials (can be in config or env vars)
  const hasAccessKey = !!(config.accessKeyId || process.env.AWS_ACCESS_KEY_ID)
  const hasSecretKey = !!(config.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY)

  if (!hasAccessKey) {
    errors.push({
      provider: name,
      field: 'accessKeyId',
      message: 'S3 accessKeyId is required (set in config or AWS_ACCESS_KEY_ID env var)',
    })
  }

  if (!hasSecretKey) {
    errors.push({
      provider: name,
      field: 'secretAccessKey',
      message: 'S3 secretAccessKey is required (set in config or AWS_SECRET_ACCESS_KEY env var)',
    })
  }

  // Warnings for MinIO or other S3-compatible services
  if (config.endpoint && !config.forcePathStyle) {
    warnings.push({
      provider: name,
      message: 'custom endpoint detected - consider setting forcePathStyle for MinIO compatibility',
    })
  }

  return { errors, warnings }
}

/**
 * Validates a single provider configuration based on its type.
 */
function validateProvider(
  name: string,
  config: AnyStorageConfig
): { errors: ValidationError[]; warnings: ValidationWarning[] } {
  switch (config.type) {
    case 'local':
      return validateLocalStorage(name, config)
    case 'r2':
      return validateR2Storage(name, config)
    case 's3':
      return validateS3Storage(name, config)
    default:
      return {
        errors: [{
          provider: name,
          field: 'type',
          message: `Unknown storage provider type: "${(config as { type: string }).type}"`,
        }],
        warnings: [],
      }
  }
}

// ─── Connectivity Test ──────────────────────────────────────────────────────────

/**
 * Tests connectivity to a storage provider.
 * Uses a lightweight exists() call to verify credentials work.
 */
async function testConnectivity(
  name: string,
  config: AnyStorageConfig,
  timeout: number
): Promise<ConnectivityResult> {
  const startTime = Date.now()

  try {
    let provider: StorageProvider

    // Create provider instance for testing
    if (config.type === 'local') {
      provider = new LocalFilesystemProvider(config)
    } else if (config.type === 'r2') {
      provider = new CloudflareR2Provider(config)
    } else if (config.type === 's3') {
      provider = new S3Provider(config)
    } else {
      return {
        provider: name,
        success: false,
        error: `Unknown storage provider type: ${(config as { type: string }).type}`,
        duration: Date.now() - startTime,
      }
    }

    // Use a timeout for the connectivity test
    const testKey = `__health_check_${Date.now()}__`

    const existsPromise = provider.exists(testKey)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Connectivity test timed out')), timeout)
    })

    await Promise.race([existsPromise, timeoutPromise])

    return {
      provider: name,
      success: true,
      duration: Date.now() - startTime,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      provider: name,
      success: false,
      error: message,
      duration: Date.now() - startTime,
    }
  }
}

// ─── Main Validation Function ───────────────────────────────────────────────────

/**
 * Validates a storage configuration.
 *
 * @param config - Storage configuration to validate
 * @param options - Validation options
 * @returns Validation result with errors, warnings, and optional connectivity results
 *
 * @example
 * ```typescript
 * const result = validateStorageConfig(config, { testConnectivity: true })
 *
 * if (!result.valid) {
 *   console.error('Storage configuration is invalid:')
 *   result.errors.forEach(e => console.error(`  ${e.provider}.${e.field}: ${e.message}`))
 * }
 * ```
 */
export function validateStorageConfig(
  config: StorageConfig,
  options: ValidationOptions = {}
): ValidationResult {
  const allErrors: ValidationError[] = []
  const allWarnings: ValidationWarning[] = []

  // Check if any providers are defined
  if (!config.providers || Object.keys(config.providers).length === 0) {
    allErrors.push({
      provider: '_global',
      field: 'providers',
      message: 'No storage providers configured',
    })
    return {
      valid: false,
      errors: allErrors,
      warnings: allWarnings,
    }
  }

  // Validate each provider
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    const { errors, warnings } = validateProvider(name, providerConfig)
    allErrors.push(...errors)
    allWarnings.push(...warnings)
  }

  // Validate default provider exists
  const defaultProviderName = config.defaultProvider
  if (defaultProviderName) {
    if (!config.providers[defaultProviderName]) {
      allErrors.push({
        provider: '_global',
        field: 'defaultProvider',
        message: `Default provider "${defaultProviderName}" not found in providers map`,
      })
    }
  } else {
    // Check if any provider has default: true
    const hasExplicitDefault = Object.values(config.providers).some(p => p.default === true)
    if (!hasExplicitDefault) {
      allWarnings.push({
        provider: '_global',
        message: 'No default provider specified - first provider will be used as default',
      })
    }
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  }
}

/**
 * Validates storage configuration and optionally tests connectivity.
 *
 * @param config - Storage configuration to validate
 * @param options - Validation options including connectivity test
 * @returns Promise resolving to validation result with optional connectivity results
 */
export async function validateStorageConfigAsync(
  config: StorageConfig,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  // First do synchronous validation
  const result = validateStorageConfig(config, options)

  // If validation failed, don't bother testing connectivity
  if (!result.valid) {
    return result
  }

  // Test connectivity if requested
  if (options.testConnectivity) {
    const timeout = options.connectivityTimeout ?? 5000
    const connectivityResults: ConnectivityResult[] = []

    for (const [name, providerConfig] of Object.entries(config.providers)) {
      // Only test cloud providers (local always works)
      if (providerConfig.type !== 'local') {
        const connectivityResult = await testConnectivity(name, providerConfig, timeout)
        connectivityResults.push(connectivityResult)
      }
    }

    result.connectivity = connectivityResults
  }

  return result
}

// ─── Logging Utilities ──────────────────────────────────────────────────────────

/**
 * Formats validation results for console output.
 * Returns an array of log lines with appropriate prefixes.
 */
export function formatValidationResults(
  config: StorageConfig,
  result: ValidationResult
): string[] {
  const lines: string[] = []

  lines.push('[Publisher] Storage validation:')

  // Log each provider status
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    const providerErrors = result.errors.filter(e => e.provider === name)
    const providerWarnings = result.warnings.filter(w => w.provider === name)

    if (providerErrors.length > 0) {
      lines.push(`  ✗ Provider '${name}' has errors:`)
      providerErrors.forEach(e => {
        lines.push(`    - ${e.field}: ${e.message}`)
      })
    } else if (providerWarnings.length > 0) {
      lines.push(`  ⚠ Provider '${name}' configured with warnings:`)
      providerWarnings.forEach(w => {
        lines.push(`    - ${w.message}`)
      })
    } else {
      // Log basic info about the provider
      const info = getProviderInfo(providerConfig)
      lines.push(`  ✓ Provider '${name}' configured${info}`)
    }
  }

  // Log connectivity results if present
  if (result.connectivity && result.connectivity.length > 0) {
    lines.push('  Connectivity tests:')
    result.connectivity.forEach(c => {
      if (c.success) {
        lines.push(`    ✓ ${c.provider} (${c.duration}ms)`)
      } else {
        lines.push(`    ✗ ${c.provider}: ${c.error}`)
      }
    })
  }

  // Log global errors
  const globalErrors = result.errors.filter(e => e.provider === '_global')
  globalErrors.forEach(e => {
    lines.push(`  ✗ ${e.message}`)
  })

  // Log global warnings
  const globalWarnings = result.warnings.filter(w => w.provider === '_global')
  globalWarnings.forEach(w => {
    lines.push(`  ⚠ ${w.message}`)
  })

  // Log default provider
  const defaultName = config.defaultProvider || Object.keys(config.providers)[0]
  const defaultValid = !result.errors.some(e =>
    e.provider === '_global' && e.field === 'defaultProvider'
  )
  if (defaultValid && defaultName) {
    lines.push(`  ✓ Default provider: ${defaultName}`)
  }

  return lines
}

/**
 * Gets a brief info string for a provider configuration.
 */
function getProviderInfo(config: AnyStorageConfig): string {
  switch (config.type) {
    case 'local':
      return ` (basePath: ${config.basePath})`
    case 'r2':
      return ` (bucket: ${config.bucket})`
    case 's3':
      return ` (bucket: ${config.bucket}, region: ${config.region})`
    default:
      return ''
  }
}

// NOTE: No re-exports here. Nuxt auto-imports from server/utils/ recursively.
