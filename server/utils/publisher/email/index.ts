import type {
  EmailConfig,
  EmailProvider,
  AnyEmailConfig,
} from './types'
import { SmtpEmailProvider } from './providers/smtp'
import { SendGridEmailProvider } from './providers/sendgrid'
import { SesEmailProvider } from './providers/ses'
import { MailgunEmailProvider } from './providers/mailgun'
import { ConsoleEmailProvider } from './providers/console'

// ─── Provider Factory ───────────────────────────────────────────────────────────

/**
 * Creates an email provider instance based on configuration type.
 *
 * @param config - Email provider configuration
 * @returns EmailProvider instance
 * @throws Error if provider type is not supported
 *
 * @example
 * ```typescript
 * const provider = createEmailProvider({
 *   type: 'smtp',
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   user: 'user@gmail.com',
 *   pass: 'password',
 *   from: 'noreply@example.com',
 * })
 *
 * await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Hello',
 *   html: '<h1>Hello!</h1>',
 * })
 * ```
 */
export function createEmailProvider(config: AnyEmailConfig): EmailProvider {
  const providerType = config.type

  if (providerType === 'smtp') {
    return new SmtpEmailProvider(config)
  }

  if (providerType === 'sendgrid') {
    return new SendGridEmailProvider(config)
  }

  if (providerType === 'ses') {
    return new SesEmailProvider(config)
  }

  if (providerType === 'mailgun') {
    return new MailgunEmailProvider(config)
  }

  if (providerType === 'console') {
    return new ConsoleEmailProvider(config)
  }

  // Handle any custom/unknown provider types
  throw new Error(
    `Unknown email provider type: "${providerType}". ` +
    `Supported types: smtp, sendgrid, ses, mailgun, console`,
  )
}

// ─── Configuration Loading ──────────────────────────────────────────────────────

/**
 * Reads email configuration from publisher.config.ts.
 * Falls back to environment variables if no config file is found.
 *
 * Configuration priority:
 * 1. publisher.config.ts `email` section
 * 2. Environment variables (PUBLISHER_EMAIL_PROVIDER, SMTP_*, SENDGRID_*)
 * 3. Returns null if no configuration is available
 *
 * @returns EmailConfig or null if not configured
 *
 * @example
 * ```typescript
 * const config = await getEmailConfig()
 * if (config) {
 *   const provider = createEmailProvider(
 *     config.providers[config.defaultProvider ?? Object.keys(config.providers)[0]]
 *   )
 * }
 * ```
 */
export async function getEmailConfig(): Promise<EmailConfig | null> {
  // Try to load from publisher.config.ts
  try {
    const { join } = await import('path')
    const { pathToFileURL } = await import('url')

    const cwd = process.cwd()
    const configPath = join(cwd, 'publisher.config.ts')

    try {
      const configUrl = pathToFileURL(configPath).href
      const configModule = await import(configUrl) as { default?: { email?: EmailConfig } }
      const config = configModule?.default as { email?: EmailConfig } | undefined

      if (config?.email) {
        return config.email
      }
    }
    catch {
      // Config file not found or import failed
    }
  }
  catch {
    // Path/URL modules not available
  }

  // Fall back to environment variables
  return getEmailConfigFromEnv()
}

/**
 * Builds email configuration from environment variables.
 *
 * @returns EmailConfig or null if required env vars are not set
 */
function getEmailConfigFromEnv(): EmailConfig | null {
  const provider = process.env.PUBLISHER_EMAIL_PROVIDER
  const from = process.env.PUBLISHER_EMAIL_FROM

  if (!provider || !from) {
    return null
  }

  if (provider === 'smtp') {
    const host = process.env.SMTP_HOST
    const port = process.env.SMTP_PORT
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !port || !user || !pass) {
      return null
    }

    return {
      defaultProvider: 'smtp',
      providers: {
        smtp: {
          type: 'smtp',
          host,
          port: parseInt(port, 10),
          user,
          pass,
          secure: parseInt(port, 10) === 465,
          from,
          default: true,
        },
      },
    }
  }

  if (provider === 'sendgrid') {
    const apiKey = process.env.SENDGRID_API_KEY

    if (!apiKey) {
      return null
    }

    return {
      defaultProvider: 'sendgrid',
      providers: {
        sendgrid: {
          type: 'sendgrid',
          apiKey,
          from,
          default: true,
        },
      },
    }
  }

  return null
}

// ─── Convenience Helper ─────────────────────────────────────────────────────────

/**
 * Gets the default email provider from configuration.
 * Loads config and creates the provider in one step.
 *
 * @returns EmailProvider instance
 * @throws Error if email is not configured
 *
 * @example
 * ```typescript
 * const emailProvider = await getDefaultEmailProvider()
 * await emailProvider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<h1>Welcome!</h1>',
 * })
 * ```
 */
export async function getDefaultEmailProvider(): Promise<EmailProvider> {
  const config = await getEmailConfig()

  if (!config) {
    throw new Error(
      'Email is not configured. Add an email section to publisher.config.ts ' +
      'or set PUBLISHER_EMAIL_PROVIDER and related environment variables.',
    )
  }

  const providerName = config.defaultProvider ?? Object.keys(config.providers)[0]

  if (!providerName || !config.providers[providerName]) {
    throw new Error(
      `Email provider "${providerName}" not found in configuration. ` +
      `Available providers: ${Object.keys(config.providers).join(', ') || 'none'}`,
    )
  }

  return createEmailProvider(config.providers[providerName])
}

// ─── New Device Alert ───────────────────────────────────────────────────────────

/**
 * Send a new device sign-in alert email.
 *
 * Generates and sends a notification email when a new or unrecognized
 * device signs in to a user's account. Silently fails if email is
 * not configured (device tracking still works without email).
 *
 * @param email - Recipient email address
 * @param deviceInfo - Device details for the email
 *
 * @example
 * ```typescript
 * await sendNewDeviceAlert('user@example.com', {
 *   deviceName: 'Chrome on macOS',
 *   ipAddress: '192.168.x.x',
 *   timestamp: new Date().toISOString(),
 *   securitySettingsUrl: 'https://example.com/admin/settings/security',
 *   appName: 'Publisher CMS',
 * })
 * ```
 */
export async function sendNewDeviceAlert(
  email: string,
  deviceInfo: {
    deviceName: string
    ipAddress: string
    timestamp: string
    securitySettingsUrl: string
    appName: string
  },
): Promise<void> {
  try {
    const { generateNewDeviceEmail } = await import('./templates/new-device')

    const { html, text } = generateNewDeviceEmail(deviceInfo)

    const provider = await getDefaultEmailProvider()
    await provider.send({
      to: email,
      subject: `New device sign-in — ${deviceInfo.appName}`,
      html,
      text,
    })
  }
  catch (err) {
    // Email alerts should never break the login flow
    console.error('[Publisher] Failed to send new device alert email:', err)
  }
}

// NOTE: No re-exports of types or providers here.
// Nuxt auto-imports from server/utils/ recursively, so re-exporting
// symbols from types.ts or providers/ causes "Duplicated imports" warnings.
// Consumers should either:
// 1. Use Nuxt auto-imports (no import statement needed)
// 2. Import directly from the sub-module (e.g., './email/types')
