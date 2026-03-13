import type { EmailProvider, SesConfig, EmailOptions } from '../types'

/**
 * AWS SES email provider.
 *
 * Uses the AWS SDK v3 to send emails via Amazon Simple Email Service.
 * Requires verified sender email or domain in AWS SES.
 *
 * @example
 * ```typescript
 * const provider = new SesEmailProvider({
 *   type: 'ses',
 *   accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
 *   secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
 *   region: 'us-east-1',
 *   from: 'noreply@example.com',
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
export class SesEmailProvider implements EmailProvider {
  readonly name = 'ses'
  readonly type = 'ses' as const

  private readonly config: SesConfig

  /**
   * Creates a new SesEmailProvider instance.
   *
   * @param config - SES configuration options
   */
  constructor(config: SesConfig) {
    this.config = config
  }

  /**
   * Sends an email via AWS SES.
   *
   * @param options - Email options including to, subject, html, and optional text/from/replyTo
   * @throws Error if sending fails
   */
  async send(options: EmailOptions): Promise<void> {
    try {
      // Dynamic import to avoid bundling AWS SDK when not used
      const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses')

      const client = new SESClient({
        region: this.config.region,
        credentials: {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        },
      })

      const command = new SendEmailCommand({
        Source: options.from ?? this.config.from,
        Destination: {
          ToAddresses: [options.to],
        },
        Message: {
          Subject: {
            Data: options.subject,
            Charset: 'UTF-8',
          },
          Body: {
            Html: {
              Data: options.html,
              Charset: 'UTF-8',
            },
            ...(options.text ? {
              Text: {
                Data: options.text,
                Charset: 'UTF-8',
              },
            } : {}),
          },
        },
        ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
      })

      await client.send(command)
    }
    catch (error) {
      // AWS SDK errors have specific structure
      const awsError = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } }
      const details = awsError.name
        ? `${awsError.name}: ${awsError.message || 'Unknown error'}`
        : (error instanceof Error ? error.message : String(error))

      throw new Error(`Failed to send email via AWS SES: ${details}`)
    }
  }
}

export default SesEmailProvider
