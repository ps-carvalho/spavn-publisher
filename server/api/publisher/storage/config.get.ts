import type { AnyStorageConfig } from '../../../utils/publisher/storage/types'
import {
  getStorageConfig,
  getProviderNames,
  getDefaultProviderName,
} from '../../../utils/publisher/storage/registry'

/**
 * Masks a credential value for safe display.
 * Shows first 4 chars + "***" + last 3 chars.
 * Returns 'not set' if value is empty/undefined, or '***' for short values.
 *
 * @param value - The credential value to mask
 * @returns Masked credential string
 */
function maskCredential(value: string | undefined): string {
  if (!value) return 'not set'
  if (value.length <= 7) return '***'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

/**
 * Masks sensitive fields in a storage provider configuration.
 * Handles accessKeyId and secretAccessKey for R2 and S3 providers.
 *
 * @param config - The storage provider configuration
 * @returns Configuration with sensitive fields masked
 */
function maskSensitiveFields(config: AnyStorageConfig): AnyStorageConfig {
  const masked = { ...config }

  // Mask accessKeyId for R2 and S3 configs
  if ('accessKeyId' in masked && masked.accessKeyId) {
    masked.accessKeyId = maskCredential(masked.accessKeyId)
  }

  // Mask secretAccessKey for R2 and S3 configs
  if ('secretAccessKey' in masked && masked.secretAccessKey) {
    masked.secretAccessKey = maskCredential(masked.secretAccessKey)
  }

  return masked
}

/**
 * GET /api/publisher/storage/config
 *
 * Returns the current storage configuration with sensitive fields masked.
 * Only accessible to admin and super-admin users.
 *
 * Response:
 * - providers: Map of provider names to their configurations (masked)
 * - providerNames: List of available provider names
 * - defaultProvider: Name of the default provider
 * - defaults: Global upload defaults
 */
export default defineEventHandler(async (event) => {
  // Authentication check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Authorization check - only admins and super-admins
  const role = event.context.publisherUser.role
  if (role !== 'super-admin' && role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
    })
  }

  // Get storage configuration from registry
  const config = getStorageConfig()

  if (!config) {
    // Return empty configuration if not initialized
    return {
      providers: {},
      providerNames: [],
      defaultProvider: null,
      defaults: null,
    }
  }

  // Mask sensitive fields in all provider configurations
  const maskedProviders: Record<string, AnyStorageConfig> = {}
  for (const [name, providerConfig] of Object.entries(config.providers)) {
    maskedProviders[name] = maskSensitiveFields(providerConfig)
  }

  // Build response
  return {
    providers: maskedProviders,
    providerNames: getProviderNames(),
    defaultProvider: getDefaultProviderName(),
    defaults: config.defaults ?? null,
  }
})
