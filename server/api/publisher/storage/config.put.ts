import {
  initStorageRegistry,
  getStorageConfig,
} from '../../../utils/publisher/storage/registry'
import { setSetting } from '../../../utils/publisher/settings'
import {
  validateStorageConfig,
  validateStorageConfigAsync,
  formatValidationResults,
} from '../../../utils/publisher/storage/validator'
import type { StorageConfig } from '../../../utils/publisher/storage/types'

/**
 * PUT /api/publisher/storage/config
 *
 * Updates the storage configuration.
 * Only accessible to admin and super-admin users.
 *
 * Request body:
 * - providers: Map of provider names to their configurations
 * - defaultProvider: Name of the default provider (optional)
 * - defaults: Global upload defaults (optional)
 * - testConnectivity: Whether to test connectivity before saving (default: true)
 *
 * Response (success):
 * - success: true
 * - message: "Storage configuration updated"
 * - validation: { valid: true, warnings: [] }
 * - connectivity: Array of connectivity test results (if testConnectivity was true)
 *
 * Response (validation failure):
 * - success: false
 * - message: "Storage configuration validation failed"
 * - validation: { valid: false, errors: [...], warnings: [...] }
 *
 * Response (connectivity failure):
 * - success: false
 * - message: "Storage connectivity test failed"
 * - validation: { valid: true, warnings: [...] }
 * - connectivity: Array with failed provider details
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

  // Read request body
  const body = await readBody(event)
  const { testConnectivity = true, ...configUpdates } = body

  // Validate basic structure
  if (!configUpdates.providers || typeof configUpdates.providers !== 'object') {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'providers object is required', code: 'INVALID_CONFIG' } },
    })
  }

  // Build the new config
  const newConfig: StorageConfig = {
    providers: configUpdates.providers,
    defaultProvider: configUpdates.defaultProvider,
    defaults: configUpdates.defaults,
  }

  // Validate the configuration
  const validationResult = testConnectivity
    ? await validateStorageConfigAsync(newConfig, { testConnectivity: true, connectivityTimeout: 5000 })
    : validateStorageConfig(newConfig)

  if (!validationResult.valid) {
    return {
      success: false,
      message: 'Storage configuration validation failed',
      validation: {
        valid: false,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      },
    }
  }

  // Check connectivity results if tested
  if (testConnectivity && validationResult.connectivity) {
    const failedConnectivity = validationResult.connectivity.filter(c => !c.success)
    if (failedConnectivity.length > 0) {
      return {
        success: false,
        message: 'Storage connectivity test failed',
        validation: {
          valid: true,
          warnings: validationResult.warnings,
        },
        connectivity: validationResult.connectivity,
      }
    }
  }

  // Re-initialize the registry with the new config
  await initStorageRegistry(newConfig)

  // Persist to database
  await setSetting('storage_config', newConfig as unknown as Record<string, unknown>)

  // Build response
  const response: {
    success: boolean
    message: string
    validation: {
      valid: boolean
      warnings: typeof validationResult.warnings
    }
    connectivity?: typeof validationResult.connectivity
  } = {
    success: true,
    message: 'Storage configuration updated',
    validation: {
      valid: true,
      warnings: validationResult.warnings,
    },
  }

  // Include connectivity results if tested
  if (validationResult.connectivity && validationResult.connectivity.length > 0) {
    response.connectivity = validationResult.connectivity
  }

  return response
})
