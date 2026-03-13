import type { EmailProvider, SendGridConfig, EmailOptions } from '../types'

/**
 * SendGrid email provider.
 *
 * Uses the SendGrid v3 API to send emails. Requires a verified sender
 * address in your SendGrid account.
 *
 * @example
 * ```typescript
 * const provider = new SendGridEmailProvider({
 *   type: 'sendgrid',
 *   apiKey: 'SG.xxxx',
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
export class SendGridEmailProvider implements EmailProvider {
  readonly name = 'sendgrid'
  readonly type = 'sendgrid' as const

  private readonly config: SendGridConfig

  /**
   * Creates a new SendGridEmailProvider instance.
   *
   * @param config - SendGrid configuration options
   */
  constructor(config: SendGridConfig) {
    this.config = config
  }

  /**
   * Sends an email via the SendGrid API.
   *
   * @param options - Email options including to, subject, html, and optional text/from/replyTo
   * @throws Error if sending fails
   */
  async send(options: EmailOptions): Promise<void> {
    try {
      // Dynamic import to avoid bundling @sendgrid/mail when not used
      const sgMail = await import('@sendgrid/mail')
      const client = sgMail.default || sgMail

      client.setApiKey(this.config.apiKey)

      const message: {
        to: string
        from: string
        subject: string
        html: string
        text?: string
        replyTo?: string
      } = {
        to: options.to,
        from: options.from ?? this.config.from,
        subject: options.subject,
        html: options.html,
      }

      if (options.text) {
        message.text = options.text
      }

      if (options.replyTo) {
        message.replyTo = options.replyTo
      }

      await client.send(message)
    }
    catch (error) {
      // SendGrid errors often have a response body with details
      const sgError = error as { response?: { body?: { errors?: Array<{ message: string }> } } }
      if (sgError.response?.body?.errors) {
        const details = sgError.response.body.errors
          .map(e => e.message)
          .join(', ')
        throw new Error(`Failed to send email via SendGrid: ${details}`)
      }

      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to send email via SendGrid: ${message}`)
    }
  }
}

export default SendGridEmailProvider
