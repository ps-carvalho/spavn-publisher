import { getDb, getSchema } from './database'
import { insertRow } from './database/queries'
import { eq, and, desc } from 'drizzle-orm'
import { createHmac } from 'crypto'
import { URL } from 'url'

// ─── Types ───────────────────────────────────────────────────────

export interface WebhookPayload {
  event: string
  contentType: string
  entry: Record<string, unknown> | null
  timestamp: string
}

interface WebhookRow {
  id: number
  name: string
  url: string
  events: string[]
  secret: string | null
  isActive: boolean
  createdAt: string
}

// ─── Available events ────────────────────────────────────────────

export const WEBHOOK_EVENTS = [
  'entry.create',
  'entry.update',
  'entry.delete',
  'entry.publish',
  'entry.unpublish',
  'media.upload',
  'media.delete',
  'page.block.created',
  'page.block.updated',
  'page.block.deleted',
  'page.block.reordered',
] as const

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

// ─── SSRF Protection ─────────────────────────────────────────────

/**
 * Validate a webhook URL to prevent SSRF attacks.
 * Blocks private IP ranges, localhost, and metadata endpoints.
 */
export function isAllowedWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.toLowerCase()

    // Block localhost and local domains
    if (hostname === 'localhost' || hostname.endsWith('.local') || hostname === '[::1]') return false

    // Block private IP ranges
    if (/^127\./.test(hostname)) return false
    if (/^10\./.test(hostname)) return false
    if (/^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) return false
    if (/^192\.168\./.test(hostname)) return false
    if (hostname === '0.0.0.0' || hostname === '[::]') return false

    // Block cloud metadata endpoints
    if (hostname === '169.254.169.254') return false
    if (hostname === 'metadata.google.internal') return false

    // Require HTTPS in production
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') return false

    return true
  }
  catch {
    return false
  }
}

// ─── HMAC Signature ──────────────────────────────────────────────

/**
 * Generate HMAC-SHA256 signature for a webhook payload.
 * The signature is sent in the `X-Publisher-Signature` header.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

// ─── Dispatch ────────────────────────────────────────────────────

/**
 * Dispatch a webhook event to all active webhooks subscribed to it.
 * Runs asynchronously — does not block the API response.
 * Includes retry logic: 30s for first retry, 5min for second retry on 5xx.
 */
export function dispatchWebhookEvent(
  event: WebhookEvent,
  contentType: string,
  entry: Record<string, unknown> | null,
): void {
  // Fire and forget — don't await
  _dispatchAll(event, contentType, entry).catch((err) => {
    console.error(`[Publisher Webhooks] Dispatch error for ${event}:`, err)
  })
}

async function _dispatchAll(
  event: WebhookEvent,
  contentType: string,
  entry: Record<string, unknown> | null,
): Promise<void> {
  const db = await getDb()
  const { publisherWebhooks } = await getSchema()

  // Find all active webhooks subscribed to this event
  const webhooks = await db
    .select()
    .from(publisherWebhooks)
    .where(eq(publisherWebhooks.isActive, true)) as WebhookRow[]

  const matchingWebhooks = webhooks.filter((wh) => {
    const events = Array.isArray(wh.events) ? wh.events : []
    return events.includes(event) || events.includes('*')
  })

  if (matchingWebhooks.length === 0) return

  const payload: WebhookPayload = {
    event,
    contentType,
    entry,
    timestamp: new Date().toISOString(),
  }

  // Dispatch to each webhook concurrently
  await Promise.allSettled(
    matchingWebhooks.map((wh) => _deliverWithRetry(wh, payload)),
  )
}

async function _deliverWithRetry(
  webhook: WebhookRow,
  payload: WebhookPayload,
): Promise<void> {
  const retryDelays = [0, 30_000, 300_000] // immediate, 30s, 5min

  for (let attempt = 0; attempt < retryDelays.length; attempt++) {
    if (attempt > 0) {
      await _sleep(retryDelays[attempt] ?? 0)
    }

    const result = await _deliver(webhook, payload)

    // Log the delivery
    await _logDelivery(webhook.id, payload.event, result.statusCode, result.responseBody)

    // Success (2xx) — done
    if (result.statusCode >= 200 && result.statusCode < 300) {
      return
    }

    // Client error (4xx) — don't retry
    if (result.statusCode >= 400 && result.statusCode < 500) {
      console.warn(
        `[Publisher Webhooks] ${webhook.name} returned ${result.statusCode} for ${payload.event} — not retrying`,
      )
      return
    }

    // Server error (5xx) or network error — retry
    if (attempt < retryDelays.length - 1) {
      const nextDelay = retryDelays[attempt + 1] ?? 0
      console.warn(
        `[Publisher Webhooks] ${webhook.name} returned ${result.statusCode} for ${payload.event} — retrying in ${nextDelay / 1000}s`,
      )
    }
    else {
      console.error(
        `[Publisher Webhooks] ${webhook.name} failed after ${retryDelays.length} attempts for ${payload.event}`,
      )
    }
  }
}

async function _deliver(
  webhook: WebhookRow,
  payload: WebhookPayload,
): Promise<{ statusCode: number; responseBody: string }> {
  // SSRF protection: validate URL before fetching
  if (!isAllowedWebhookUrl(webhook.url)) {
    return { statusCode: 0, responseBody: 'Blocked: URL targets a private or disallowed address' }
  }

  const body = JSON.stringify(payload)

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Publisher-Webhook/1.0',
    'X-Publisher-Event': payload.event,
  }

  // Add HMAC signature if secret is configured
  if (webhook.secret) {
    headers['X-Publisher-Signature'] = signPayload(body, webhook.secret)
  }

  try {
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout per request
    })

    let responseBody = ''
    try {
      responseBody = await response.text()
      // Truncate to 1000 chars for storage
      if (responseBody.length > 1000) {
        responseBody = responseBody.substring(0, 1000) + '...'
      }
    }
    catch {
      responseBody = '[Could not read response body]'
    }

    return { statusCode: response.status, responseBody }
  }
  catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { statusCode: 0, responseBody: `Network error: ${message}` }
  }
}

async function _logDelivery(
  webhookId: number,
  event: string,
  statusCode: number,
  responseBody: string,
): Promise<void> {
  try {
    await insertRow('publisher_webhook_logs', {
      webhook_id: webhookId,
      event,
      status_code: statusCode,
      response_body: responseBody,
      delivered_at: new Date().toISOString(),
    })
  }
  catch (err) {
    console.error('[Publisher Webhooks] Failed to log delivery:', err)
  }
}

function _sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Test payload ────────────────────────────────────────────────

/**
 * Send a test payload to a specific webhook.
 * Returns the delivery result immediately (no retry).
 */
export async function sendTestWebhook(
  webhook: WebhookRow,
): Promise<{ statusCode: number; responseBody: string }> {
  const payload: WebhookPayload = {
    event: 'test',
    contentType: 'test',
    entry: { id: 0, message: 'This is a test webhook from Publisher CMS' },
    timestamp: new Date().toISOString(),
  }

  const result = await _deliver(webhook, payload)
  await _logDelivery(webhook.id, 'test', result.statusCode, result.responseBody)
  return result
}
