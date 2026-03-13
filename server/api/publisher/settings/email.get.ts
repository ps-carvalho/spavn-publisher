/**
 * GET /api/publisher/settings/email
 *
 * Returns the current email configuration with sensitive fields masked.
 * Only accessible to admin and super-admin users.
 */
import { getSetting } from '../../../utils/publisher/settings'
import {
  EmailSettingsSchema,
  EMAIL_SENSITIVE_FIELDS,
  type EmailSettings,
  type SmtpEmailSettings,
  type SendGridEmailSettings,
  type SesEmailSettings,
  type MailgunEmailSettings,
} from '../../../utils/publisher/settings/types'

/**
 * Masks a credential value for safe display.
 * Shows first 4 chars + "***" + last 3 chars.
 */
function maskCredential(value: string | undefined): string {
  if (!value) return ''
  if (value.length <= 7) return '***'
  return `${value.slice(0, 4)}***${value.slice(-3)}`
}

/**
 * Masks sensitive fields in email settings based on provider type.
 */
function maskSensitiveFields(settings: EmailSettings): EmailSettings {
  switch (settings.provider) {
    case 'smtp': {
      const smtpSettings = { ...settings }
      smtpSettings.password = maskCredential(settings.password)
      return smtpSettings
    }
    case 'sendgrid': {
      const sendgridSettings = { ...settings }
      sendgridSettings.apiKey = maskCredential(settings.apiKey)
      return sendgridSettings
    }
    case 'ses': {
      const sesSettings = { ...settings }
      sesSettings.secretAccessKey = maskCredential(settings.secretAccessKey)
      return sesSettings
    }
    case 'mailgun': {
      const mailgunSettings = { ...settings }
      mailgunSettings.apiKey = maskCredential(settings.apiKey)
      return mailgunSettings
    }
    default:
      return settings
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

  // Get current settings from database
  const storedSettings = await getSetting<EmailSettings>('email_settings')

  if (!storedSettings) {
    // Return empty response if no settings configured
    return {
      settings: null,
      configured: false,
    }
  }

  // Mask sensitive fields
  const maskedSettings = maskSensitiveFields(storedSettings)

  return {
    settings: maskedSettings,
    configured: true,
  }
})
