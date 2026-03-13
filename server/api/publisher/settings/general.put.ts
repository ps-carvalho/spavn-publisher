/**
 * PUT /api/publisher/settings/general
 *
 * Updates the general settings.
 * Only accessible to admin and super-admin users.
 * Validates input and logs changes to audit trail.
 */
import { setSetting, getSetting } from '../../../utils/publisher/settings'
import { logAuthEvent } from '../../../utils/publisher/audit'
import {
  GeneralSettingsSchema,
  getDefaultGeneralSettings,
  type GeneralSettings,
} from '../../../utils/publisher/settings/types'

/**
 * Input type from Zod schema (may have undefined for optional nullable fields)
 */
type GeneralSettingsInput = {
  siteName: string
  siteDescription: string
  logoUrl?: string | null
  faviconUrl?: string | null
  timezone: string
  locale: string
  dateFormat: string
  timeFormat: string
  seo: { titleTemplate: string; defaultDescription: string }
  maintenance: { enabled: boolean; message: string }
  analytics: { googleTagId?: string | null; customScripts?: string | null }
}

/**
 * Normalizes parsed settings to ensure they match GeneralSettings interface.
 * Converts undefined to null for optional nullable fields.
 */
function normalizeSettings(input: GeneralSettingsInput): GeneralSettings {
  return {
    siteName: input.siteName,
    siteDescription: input.siteDescription,
    logoUrl: input.logoUrl ?? null,
    faviconUrl: input.faviconUrl ?? null,
    timezone: input.timezone,
    locale: input.locale,
    dateFormat: input.dateFormat,
    timeFormat: input.timeFormat,
    seo: input.seo,
    maintenance: input.maintenance,
    analytics: {
      googleTagId: input.analytics.googleTagId ?? null,
      customScripts: input.analytics.customScripts ?? null,
    },
  }
}

/**
 * Helper to identify which fields changed
 */
function getChangedFields(
  oldSettings: Partial<GeneralSettings> | undefined,
  newSettings: GeneralSettings,
): string[] {
  if (!oldSettings) return ['all']

  const changes: string[] = []
  const defaults = getDefaultGeneralSettings()

  // Compare top-level fields
  const topLevelKeys: (keyof GeneralSettings)[] = [
    'siteName',
    'siteDescription',
    'logoUrl',
    'faviconUrl',
    'timezone',
    'locale',
    'dateFormat',
    'timeFormat',
  ]

  for (const key of topLevelKeys) {
    const oldVal = oldSettings[key] ?? defaults[key]
    const newVal = newSettings[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push(key)
    }
  }

  // Compare nested objects
  if (JSON.stringify(oldSettings.seo ?? defaults.seo) !== JSON.stringify(newSettings.seo)) {
    changes.push('seo')
  }
  if (JSON.stringify(oldSettings.maintenance ?? defaults.maintenance) !== JSON.stringify(newSettings.maintenance)) {
    changes.push('maintenance')
  }
  if (JSON.stringify(oldSettings.analytics ?? defaults.analytics) !== JSON.stringify(newSettings.analytics)) {
    changes.push('analytics')
  }

  return changes.length > 0 ? changes : ['no_changes']
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

  // Validate input
  const validationResult = GeneralSettingsSchema.safeParse(body)
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

  // Normalize the parsed settings (convert undefined to null for optional fields)
  const newSettings = normalizeSettings(validationResult.data)

  // Get old settings for audit log
  const oldSettings = await getSetting<Partial<GeneralSettings>>('general_settings')

  // Save settings
  await setSetting('general_settings', newSettings as unknown as Record<string, unknown>)

  // Log to audit trail
  await logAuthEvent(
    event,
    event.context.publisherUser.id,
    'preference_updated',
    {
      category: 'general_settings',
      changes: getChangedFields(oldSettings, newSettings),
    },
  )

  return {
    success: true,
    message: 'General settings updated',
    settings: newSettings,
  }
})
