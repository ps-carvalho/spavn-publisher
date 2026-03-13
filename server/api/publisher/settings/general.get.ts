/**
 * GET /api/publisher/settings/general
 *
 * Returns the current general settings with defaults applied for missing values.
 * Only accessible to admin and super-admin users.
 */
import { getSetting } from '../../../utils/publisher/settings'
import {
  GeneralSettingsSchema,
  getDefaultGeneralSettings,
  type GeneralSettings,
} from '../../../utils/publisher/settings/types'

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
  const storedSettings = await getSetting<Partial<GeneralSettings>>('general_settings')

  // Merge with defaults
  const defaults = getDefaultGeneralSettings()
  const settings: GeneralSettings = {
    ...defaults,
    ...storedSettings,
    // Deep merge nested objects
    seo: { ...defaults.seo, ...storedSettings?.seo },
    maintenance: { ...defaults.maintenance, ...storedSettings?.maintenance },
    analytics: { ...defaults.analytics, ...storedSettings?.analytics },
  }

  return { settings }
})
