/**
 * PUT /api/publisher/settings/email
 *
 * Updates the email configuration.
 * Only accessible to admin and super-admin users.
 * Validates input using discriminated union schema.
 */
import { setSetting, getSetting } from '../../../utils/publisher/settings'
import { logAuthEvent } from '../../../utils/publisher/audit'
import {
  EmailSettingsSchema,
  type EmailSettings,
  type SmtpEmailSettings,
  type SendGridEmailSettings,
  type SesEmailSettings,
  type MailgunEmailSettings,
} from '../../../utils/publisher/settings/types'

/**
 * Checks if a credential value appears to be masked.
 * Masked values contain '***' in the middle.
 */
function isMaskedCredential(value: string | undefined): boolean {
  return typeof value === 'string' && value.includes('***')
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

  // Read request body
  const body = await readBody(event)

  // Validate input using discriminated union
  const validationResult = EmailSettingsSchema.safeParse(body)
  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors,
        },
      },
    })
  }

  const newSettings = validationResult.data

  // Get old settings for audit log comparison
  const oldSettings = await getSetting<EmailSettings>('email_settings')

  // If password/apiKey fields are masked (contain ***), keep the old value
  // This allows updating other fields without re-entering credentials
  const settingsToSave = { ...newSettings } as EmailSettings

  if (oldSettings) {
    // Handle credential preservation for each provider type
    if (settingsToSave.provider === 'smtp' && oldSettings.provider === 'smtp') {
      const smtpSettings = settingsToSave as SmtpEmailSettings
      const oldSmtpSettings = oldSettings as SmtpEmailSettings
      if (isMaskedCredential(smtpSettings.password)) {
        (settingsToSave as SmtpEmailSettings).password = oldSmtpSettings.password
      }
    }

    if (settingsToSave.provider === 'sendgrid' && oldSettings.provider === 'sendgrid') {
      const sendgridSettings = settingsToSave as SendGridEmailSettings
      const oldSendgridSettings = oldSettings as SendGridEmailSettings
      if (isMaskedCredential(sendgridSettings.apiKey)) {
        (settingsToSave as SendGridEmailSettings).apiKey = oldSendgridSettings.apiKey
      }
    }

    if (settingsToSave.provider === 'ses' && oldSettings.provider === 'ses') {
      const sesSettings = settingsToSave as SesEmailSettings
      const oldSesSettings = oldSettings as SesEmailSettings
      if (isMaskedCredential(sesSettings.secretAccessKey)) {
        (settingsToSave as SesEmailSettings).secretAccessKey = oldSesSettings.secretAccessKey
      }
    }

    if (settingsToSave.provider === 'mailgun' && oldSettings.provider === 'mailgun') {
      const mailgunSettings = settingsToSave as MailgunEmailSettings
      const oldMailgunSettings = oldSettings as MailgunEmailSettings
      if (isMaskedCredential(mailgunSettings.apiKey)) {
        (settingsToSave as MailgunEmailSettings).apiKey = oldMailgunSettings.apiKey
      }
    }
  }

  // Save settings
  await setSetting('email_settings', settingsToSave as unknown as Record<string, unknown>)

  // Log to audit trail (don't log sensitive values)
  await logAuthEvent(
    event,
    event.context.publisherUser.id,
    'preference_updated',
    {
      category: 'email_settings',
      provider: newSettings.provider,
      fromAddress: newSettings.fromAddress,
    },
  )

  return {
    success: true,
    message: 'Email settings updated',
    provider: newSettings.provider,
  }
})
