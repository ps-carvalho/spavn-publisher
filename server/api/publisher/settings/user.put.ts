/**
 * PUT /api/publisher/settings/user
 *
 * Updates the current user's settings.
 * Settings are scoped to the authenticated user using user.{userId}.* key pattern.
 * Accessible to any authenticated user (updates their own settings).
 * Validates input and logs changes to audit trail.
 */
import { setSetting } from '../../../utils/publisher/settings'
import { logAuthEvent } from '../../../utils/publisher/audit'
import {
  UserSettingsSchema,
  USER_SETTING_KEYS,
  type UserSettings,
} from '../../../utils/publisher/settings/types'

export default defineEventHandler(async (event) => {
  // Authentication check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const userId = event.context.publisherUser.id

  // Read request body
  const body = await readBody(event)

  // Validate input
  const validationResult = UserSettingsSchema.safeParse(body)
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

  const newSettings = validationResult.data as UserSettings

  // Save each setting individually using namespaced keys
  // This allows partial updates and efficient queries
  // Each value is wrapped in { value: ... } to satisfy Record<string, unknown>
  await Promise.all([
    // Profile
    setSetting(USER_SETTING_KEYS.profileFirstName(userId), { value: newSettings.profile.firstName }),
    setSetting(USER_SETTING_KEYS.profileLastName(userId), { value: newSettings.profile.lastName }),
    setSetting(USER_SETTING_KEYS.profileAvatarUrl(userId), { value: newSettings.profile.avatarUrl }),
    // Preferences
    setSetting(USER_SETTING_KEYS.preferencesTheme(userId), { value: newSettings.preferences.theme }),
    setSetting(USER_SETTING_KEYS.preferencesSidebarCollapsed(userId), { value: newSettings.preferences.sidebarCollapsed }),
    setSetting(USER_SETTING_KEYS.preferencesItemsPerPage(userId), { value: newSettings.preferences.itemsPerPage }),
    // Notifications
    setSetting(USER_SETTING_KEYS.notificationsEmailEnabled(userId), { value: newSettings.notifications.email.enabled }),
    setSetting(USER_SETTING_KEYS.notificationsEmailDigestFrequency(userId), { value: newSettings.notifications.email.digestFrequency }),
    setSetting(USER_SETTING_KEYS.notificationsInAppEnabled(userId), { value: newSettings.notifications.inApp.enabled }),
    // Editor
    setSetting(USER_SETTING_KEYS.editorDefaultMode(userId), { value: newSettings.editor.defaultMode }),
    setSetting(USER_SETTING_KEYS.editorAutosaveInterval(userId), { value: newSettings.editor.autosaveInterval }),
  ])

  // Log to audit trail
  await logAuthEvent(
    event,
    userId,
    'preference_updated',
    {
      category: 'user_settings',
    },
  )

  return {
    success: true,
    message: 'User settings updated',
    settings: newSettings,
  }
})
