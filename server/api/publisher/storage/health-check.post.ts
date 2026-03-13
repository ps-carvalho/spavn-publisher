import {
  getStorageProvider,
  getDefaultProviderName,
  hasProvider,
} from '../../../utils/publisher/storage/registry'

/**
 * POST /api/publisher/storage/health-check
 *
 * Tests connectivity to a storage provider.
 * Only accessible to admin and super-admin users.
 *
 * Request body:
 * - provider: Optional provider name to test (defaults to default provider)
 *
 * Response (success):
 * - success: true
 * - provider: Provider name that was tested
 * - duration: Time taken for the test in milliseconds
 * - timestamp: ISO timestamp of the test
 *
 * Response (failure):
 * - success: false
 * - provider: Provider name that was tested
 * - error: Error message describing the failure
 * - duration: Time taken before failure in milliseconds
 * - timestamp: ISO timestamp of the test
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

  // Get provider name from body or use default
  const body = await readBody(event)
  const providerName = body?.provider || getDefaultProviderName()

  // Check provider exists
  if (!hasProvider(providerName)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: `Provider "${providerName}" not found`, code: 'PROVIDER_NOT_FOUND' } },
    })
  }

  // Test connectivity
  const startTime = performance.now()
  const timestamp = new Date().toISOString()

  try {
    const provider = getStorageProvider(providerName)

    // Use a test key that won't exist - we just want to verify credentials work
    // The exists() call will return false but proves the connection works
    const testKey = `__health_check_${Date.now()}__`

    // Set a timeout for the health check
    const timeoutMs = 5000
    const existsPromise = provider.exists(testKey)
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Health check timed out')), timeoutMs)
    })

    await Promise.race([existsPromise, timeoutPromise])

    const duration = Math.round(performance.now() - startTime)

    return {
      success: true,
      provider: providerName,
      duration,
      timestamp,
    }
  } catch (error) {
    const duration = Math.round(performance.now() - startTime)
    const message = error instanceof Error ? error.message : 'Unknown error'

    return {
      success: false,
      provider: providerName,
      error: message,
      duration,
      timestamp,
    }
  }
})
