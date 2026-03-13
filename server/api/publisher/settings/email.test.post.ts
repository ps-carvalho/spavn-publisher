/**
 * POST /api/publisher/settings/email/test
 *
 * Sends a test email using the configured email provider.
 * Only accessible to admin and super-admin users.
 *
 * Request body:
 * - to: Email address to send test to (optional, defaults to current user's email)
 */
import { getSetting } from '../../../utils/publisher/settings'
import {
  type EmailSettings,
  type SmtpEmailSettings,
  type SendGridEmailSettings,
  type SesEmailSettings,
  type MailgunEmailSettings,
} from '../../../utils/publisher/settings/types'
import type { AnyEmailConfig } from '../../../utils/publisher/email/types'
import { createEmailProvider } from '../../../utils/publisher/email'

/**
 * Convert EmailSettings to the provider config format expected by createEmailProvider.
 */
function convertSettingsToProviderConfig(settings: EmailSettings): AnyEmailConfig {
  switch (settings.provider) {
    case 'smtp': {
      const smtp = settings as SmtpEmailSettings
      return {
        type: 'smtp',
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        user: smtp.username,
        pass: smtp.password,
        from: smtp.fromAddress,
      } as AnyEmailConfig
    }
    case 'sendgrid': {
      const sendgrid = settings as SendGridEmailSettings
      return {
        type: 'sendgrid',
        apiKey: sendgrid.apiKey,
        from: sendgrid.fromAddress,
      } as AnyEmailConfig
    }
    case 'ses': {
      const ses = settings as SesEmailSettings
      return {
        type: 'ses',
        accessKeyId: ses.accessKeyId,
        secretAccessKey: ses.secretAccessKey,
        region: ses.region,
        from: ses.fromAddress,
      } as AnyEmailConfig
    }
    case 'mailgun': {
      const mailgun = settings as MailgunEmailSettings
      return {
        type: 'mailgun',
        apiKey: mailgun.apiKey,
        domain: mailgun.domain,
        region: mailgun.region,
        from: mailgun.fromAddress,
      } as AnyEmailConfig
    }
    default:
      throw new Error(`Unknown email provider: ${(settings as { provider: string }).provider}`)
  }
}

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

  // Get email settings
  const settings = await getSetting<EmailSettings>('email_settings')

  if (!settings) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Email settings not configured', code: 'NOT_CONFIGURED' } },
    })
  }

  // Read request body for optional recipient
  const body = await readBody(event).catch(() => ({}))
  const testRecipient = body.to || event.context.publisherUser.email

  if (!testRecipient) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'No recipient email address available', code: 'NO_RECIPIENT' } },
    })
  }

  try {
    // Convert settings to email provider config
    const providerConfig = convertSettingsToProviderConfig(settings)

    // Create provider and send test email
    const provider = createEmailProvider(providerConfig)

    const startTime = Date.now()

    await provider.send({
      to: testRecipient,
      subject: 'Test Email from Publisher CMS',
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">✓ Email Configuration Test</h1>
          <p>This is a test email from Publisher CMS.</p>
          <p>If you received this email, your email settings are configured correctly.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Provider: <strong>${settings.provider}</strong><br>
            Sent at: ${new Date().toISOString()}
          </p>
        </div>
      `,
      text: `Email Configuration Test\n\nThis is a test email from Publisher CMS.\nIf you received this email, your email settings are configured correctly.\n\nProvider: ${settings.provider}\nSent at: ${new Date().toISOString()}`,
    })

    const duration = Date.now() - startTime

    return {
      success: true,
      message: 'Test email sent successfully',
      recipient: testRecipient,
      provider: settings.provider,
      duration,
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      success: false,
      message: `Failed to send test email: ${errorMessage}`,
      provider: settings.provider,
      error: errorMessage,
    }
  }
})
