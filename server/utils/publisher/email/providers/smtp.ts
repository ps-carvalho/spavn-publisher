import type { createTransport as CreateTransport } from 'nodemailer'
import type { EmailProvider, SmtpConfig, EmailOptions } from '../types'

/**
 * SMTP email provider.
 *
 * Uses nodemailer to send emails via any SMTP server (Gmail, Mailgun,
 * Amazon SES, self-hosted, etc.).
 *
 * @example
 * ```typescript
 * const provider = new SmtpEmailProvider({
 *   type: 'smtp',
 *   host: 'smtp.gmail.com',
 *   port: 587,
 *   secure: false,
 *   user: 'user@gmail.com',
 *   pass: 'app-specific-password',
 *   from: 'Publisher CMS <noreply@example.com>',
 * })
 *
 * await provider.send({
 *   to: 'recipient@example.com',
 *   subject: 'Hello',
 *   html: '<h1>Hello!</h1>',
 *   text: 'Hello!',
 * })
 * ```
 */
export class SmtpEmailProvider implements EmailProvider {
  readonly name = 'smtp'
  readonly type = 'smtp' as const

  private readonly config: SmtpConfig

  /**
   * Creates a new SmtpEmailProvider instance.
   *
   * @param config - SMTP configuration options
   */
  constructor(config: SmtpConfig) {
    this.config = config
  }

  /**
   * Sends an email via SMTP.
   *
   * Creates a new transporter for each send to avoid stale connections.
   * Nodemailer handles connection pooling internally when reusing transporters,
   * but for a CMS with infrequent auth emails, per-send creation is simpler
   * and avoids connection timeout issues.
   *
   * @param options - Email options including to, subject, html, and optional text/from/replyTo
   * @throws Error if sending fails
   */
  async send(options: EmailOptions): Promise<void> {
    try {
      // Dynamic import to avoid bundling nodemailer when not used
      const nodemailer = await import('nodemailer')
      const createTransport = nodemailer.createTransport as typeof CreateTransport

      const transporter = createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.user,
          pass: this.config.pass,
        },
      })

      await transporter.sendMail({
        from: options.from ?? this.config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        replyTo: options.replyTo,
      })
    }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to send email via SMTP: ${message}`)
    }
  }
}

export default SmtpEmailProvider
