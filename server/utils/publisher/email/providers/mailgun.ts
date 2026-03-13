import type { EmailProvider, MailgunConfig, EmailOptions } from '../types'

/**
 * Mailgun email provider.
 *
 * Uses the Mailgun API to send emails. Requires a verified domain
 * in your Mailgun account.
 *
 * @example
 * ```typescript
 * const provider = new MailgunEmailProvider({
 *   type: 'mailgun',
 *   apiKey: 'key-xxxx',
 *   domain: 'mg.example.com',
 *   region: 'us',
 *   from: 'Publisher CMS <noreply@mg.example.com>',
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
export class MailgunEmailProvider implements EmailProvider {
  readonly name = 'mailgun'
  readonly type = 'mailgun' as const

  private readonly config: MailgunConfig

  /**
   * Creates a new MailgunEmailProvider instance.
   *
   * @param config - Mailgun configuration options
   */
  constructor(config: MailgunConfig) {
    this.config = config
  }

  /**
   * Sends an email via the Mailgun API.
   *
   * @param options - Email options including to, subject, html, and optional text/from/replyTo
   * @throws Error if sending fails
   */
  async send(options: EmailOptions): Promise<void> {
    try {
      // Determine API base URL based on region
      const baseUrl = this.config.region === 'eu'
        ? 'https://api.eu.mailgun.net/v3'
        : 'https://api.mailgun.net/v3'

      // Create form data for Mailgun API
      const formData = new URLSearchParams()
      formData.append('from', options.from ?? this.config.from)
      formData.append('to', options.to)
      formData.append('subject', options.subject)
      formData.append('html', options.html)

      if (options.text) {
        formData.append('text', options.text)
      }

      // Send via Mailgun API
      const response = await fetch(`${baseUrl}/${this.config.domain}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`api:${this.config.apiKey}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Mailgun API error (${response.status}): ${errorText}`)
      }
    }
    catch (error) {
      // Re-throw if already our error
      if (error instanceof Error && error.message.startsWith('Mailgun API error')) {
        throw error
      }

      const message = error instanceof Error ? error.message : String(error)
      throw new Error(`Failed to send email via Mailgun: ${message}`)
    }
  }
}

export default MailgunEmailProvider
