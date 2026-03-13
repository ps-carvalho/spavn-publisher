import { PublisherApiError } from './errors'
import type { PublisherConfig, FindOptions } from './types'

/**
 * Build HTTP headers for a request
 */
export function buildHeaders(config: PublisherConfig): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`
  }
  return headers
}

/**
 * Build a query string from find options
 */
export function buildQueryString(options?: FindOptions): string {
  if (!options) return ''

  const params = new URLSearchParams()

  if (options.page !== undefined) {
    params.set('page', String(options.page))
  }
  if (options.pageSize !== undefined) {
    params.set('pageSize', String(options.pageSize))
  }
  if (options.sort) {
    params.set('sort', options.sort)
  }
  if (options.filters) {
    for (const [key, value] of Object.entries(options.filters)) {
      if (value !== undefined && value !== null) {
        params.set(`filters[${key}]`, String(value))
      }
    }
  }

  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

/**
 * Make an HTTP request to the Publisher API
 */
export async function request<T>(
  config: PublisherConfig,
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const fetchFn = config.fetch || globalThis.fetch
  const url = `${config.baseUrl.replace(/\/$/, '')}${path}`

  const init: RequestInit = {
    method,
    headers: buildHeaders(config),
  }

  if (body !== undefined) {
    init.body = JSON.stringify(body)
  }

  const response = await fetchFn(url, init)

  if (!response.ok) {
    let errorData: Record<string, unknown> = {}
    try {
      errorData = await response.json()
    } catch {
      // Response may not be JSON, use status text
    }

    const error = (errorData?.error as Record<string, unknown>) || errorData
    throw new PublisherApiError(
      response.status,
      (error?.code as string) || 'UNKNOWN_ERROR',
      (error?.message as string) || response.statusText,
      error,
    )
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

/**
 * Build auth headers without Content-Type (for multipart/form-data uploads)
 */
export function buildAuthHeaders(config: PublisherConfig): Record<string, string> {
  const headers: Record<string, string> = {}
  if (config.token) {
    headers['Authorization'] = `Bearer ${config.token}`
  }
  return headers
}
