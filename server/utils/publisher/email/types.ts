/**
 * Email Provider Types
 *
 * This module defines the interfaces and types for the email abstraction layer.
 * The email layer supports multiple backends (SMTP, SendGrid) through a unified
 * interface, following the same provider pattern as storage.
 *
 * @example
 * ```typescript
 * const provider: EmailProvider = createEmailProvider(config)
 * await provider.send({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<h1>Hello!</h1>',
 *   text: 'Hello!',
 * })
 * ```
 */

// ─── Email Options ────────────────────────────────────────────────────────────

/**
 * Options for sending an email.
 */
export interface EmailOptions {
  /** Recipient email address */
  to: string

  /** Email subject line */
  subject: string

  /** HTML body content */
  html: string

  /** Plain text body content (fallback for clients that don't support HTML) */
  text?: string

  /** Sender email address (overrides provider default) */
  from?: string

  /** Reply-to email address */
  replyTo?: string
}

// ─── Email Provider Interface ─────────────────────────────────────────────────

/**
 * Type identifier for email providers.
 * Can be extended for additional providers.
 */
export type EmailProviderType = 'smtp' | 'sendgrid' | 'ses' | 'mailgun' | 'console' | string

/**
 * Main interface for email providers.
 * Implementations must support sending emails via the `send` method.
 */
export interface EmailProvider {
  /** Human-readable name of the provider */
  readonly name: string

  /** Type identifier for the provider */
  readonly type: EmailProviderType

  /**
   * Send an email.
   *
   * @param options - Email options including to, subject, html, and optional text/from/replyTo
   * @throws Error if sending fails
   */
  send(options: EmailOptions): Promise<void>
}

// ─── Configuration Types ──────────────────────────────────────────────────────

/**
 * Base configuration for email providers.
 */
export interface EmailProviderConfig {
  /** Provider type identifier */
  type: EmailProviderType

  /** Whether this provider is the default for sending emails */
  default?: boolean
}

/**
 * Configuration for SMTP email provider.
 * Uses nodemailer to send emails via any SMTP server.
 */
export interface SmtpConfig extends EmailProviderConfig {
  type: 'smtp'

  /** SMTP server hostname (e.g., 'smtp.gmail.com', 'smtp.mailgun.org') */
  host: string

  /** SMTP server port (typically 587 for TLS, 465 for SSL, 25 for unencrypted) */
  port: number

  /** SMTP authentication username */
  user: string

  /** SMTP authentication password or app-specific password */
  pass: string

  /** Whether to use TLS/SSL (true for port 465, false for STARTTLS on 587) */
  secure: boolean

  /** Default sender email address (e.g., 'Publisher CMS <noreply@example.com>') */
  from: string
}

/**
 * Configuration for SendGrid email provider.
 * Uses the SendGrid API to send emails.
 */
export interface SendGridConfig extends EmailProviderConfig {
  type: 'sendgrid'

  /** SendGrid API key (starts with 'SG.') */
  apiKey: string

  /** Default sender email address (must be verified in SendGrid) */
  from: string
}

/**
 * Configuration for AWS SES email provider.
 * Uses the AWS SDK to send emails via Amazon Simple Email Service.
 */
export interface SesConfig extends EmailProviderConfig {
  type: 'ses'

  /** AWS Access Key ID */
  accessKeyId: string

  /** AWS Secret Access Key */
  secretAccessKey: string

  /** AWS region (e.g., 'us-east-1') */
  region: string

  /** Default sender email address (must be verified in SES) */
  from: string
}

/**
 * Configuration for Mailgun email provider.
 * Uses the Mailgun API to send emails.
 */
export interface MailgunConfig extends EmailProviderConfig {
  type: 'mailgun'

  /** Mailgun API key */
  apiKey: string

  /** Mailgun domain (must be verified) */
  domain: string

  /** Mailgun region ('us' or 'eu') */
  region?: 'us' | 'eu'

  /** Default sender email address */
  from: string
}

/**
 * Union type for all supported email provider configurations.
 */
export type AnyEmailConfig = SmtpConfig | SendGridConfig | SesConfig | MailgunConfig

/**
 * Main email configuration.
 * Supports multiple named providers with one default.
 */
export interface EmailConfig {
  /** Map of provider names to their configurations */
  providers: Record<string, AnyEmailConfig>

  /** Name of the default provider (must exist in providers map) */
  defaultProvider?: string
}
