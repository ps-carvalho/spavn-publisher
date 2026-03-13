/**
 * Health Check Endpoint
 * 
 * Returns database connectivity status for monitoring and load balancer health checks.
 * Public endpoint — no authentication required.
 */

import { getProvider } from '../../utils/publisher/database'

export default defineEventHandler(async (event) => {
  const timestamp = new Date().toISOString()

  try {
    const provider = await getProvider()
    const dialect = provider.dialect

    // Measure query execution time
    const startTime = performance.now()
    await provider.execute('SELECT 1')
    const responseTimeMs = Math.round(performance.now() - startTime)

    // Build response
    const response: Record<string, unknown> = {
      status: 'healthy',
      provider: dialect,
      responseTimeMs,
      timestamp,
    }

    // Include pool stats for PostgreSQL
    if (dialect === 'postgres' && provider.stats) {
      response.pool = provider.stats()
    }

    return response
  } catch (error) {
    // Determine provider type for error response
    let providerType = 'unknown'
    try {
      const { resolveDbConfig } = await import('../../utils/publisher/database')
      const { config } = resolveDbConfig()
      providerType = config.provider
    } catch {
      // If we can't determine the provider, use 'unknown'
    }

    setResponseStatus(event, 503)

    return {
      status: 'unhealthy',
      provider: providerType,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp,
    }
  }
})
