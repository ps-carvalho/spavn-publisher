/**
 * GET /api/publisher/settings/user
 *
 * Returns the current user's settings with defaults applied for missing values.
 * Settings are scoped to the authenticated user using user.{userId}.* key pattern.
 * Accessible to any authenticated user (reads their own settings).
 */
import { getSetting } from '../../../utils/publisher/settings'
import {
  getDefaultUserSettings,
  USER_SETTING_KEYS,
  type UserSettings,
  type UserPreferencesSettings,
  type UserNotificationSettings,
  type UserEditorSettings,
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
  const defaults = getDefaultUserSettings()

  // Fetch all user settings using namespaced keys
  // Each setting is stored as { value: <actual_value> } to satisfy Record<string, unknown>
  const [
    profileFirstName,
    profileLastName,
    profileAvatarUrl,
    preferencesTheme,
    preferencesSidebarCollapsed,
    preferencesItemsPerPage,
    notificationsEmailEnabled,
    notificationsEmailDigestFrequency,
    notificationsInAppEnabled,
    editorDefaultMode,
    editorAutosaveInterval,
  ] = await Promise.all([
    getSetting<{ value: string }>(USER_SETTING_KEYS.profileFirstName(userId)),
    getSetting<{ value: string }>(USER_SETTING_KEYS.profileLastName(userId)),
    getSetting<{ value: string | null }>(USER_SETTING_KEYS.profileAvatarUrl(userId)),
    getSetting<{ value: UserPreferencesSettings['theme'] }>(USER_SETTING_KEYS.preferencesTheme(userId)),
    getSetting<{ value: boolean }>(USER_SETTING_KEYS.preferencesSidebarCollapsed(userId)),
    getSetting<{ value: number }>(USER_SETTING_KEYS.preferencesItemsPerPage(userId)),
    getSetting<{ value: boolean }>(USER_SETTING_KEYS.notificationsEmailEnabled(userId)),
    getSetting<{ value: UserNotificationSettings['email']['digestFrequency'] }>(USER_SETTING_KEYS.notificationsEmailDigestFrequency(userId)),
    getSetting<{ value: boolean }>(USER_SETTING_KEYS.notificationsInAppEnabled(userId)),
    getSetting<{ value: UserEditorSettings['defaultMode'] }>(USER_SETTING_KEYS.editorDefaultMode(userId)),
    getSetting<{ value: number }>(USER_SETTING_KEYS.editorAutosaveInterval(userId)),
  ])

  // Build settings object with defaults (extract .value from stored objects)
  const settings: UserSettings = {
    profile: {
      firstName: profileFirstName?.value ?? defaults.profile.firstName,
      lastName: profileLastName?.value ?? defaults.profile.lastName,
      avatarUrl: profileAvatarUrl?.value ?? defaults.profile.avatarUrl,
    },
    preferences: {
      theme: preferencesTheme?.value ?? defaults.preferences.theme,
      sidebarCollapsed: preferencesSidebarCollapsed?.value ?? defaults.preferences.sidebarCollapsed,
      itemsPerPage: preferencesItemsPerPage?.value ?? defaults.preferences.itemsPerPage,
    },
    notifications: {
      email: {
        enabled: notificationsEmailEnabled?.value ?? defaults.notifications.email.enabled,
        digestFrequency: notificationsEmailDigestFrequency?.value ?? defaults.notifications.email.digestFrequency,
      },
      inApp: {
        enabled: notificationsInAppEnabled?.value ?? defaults.notifications.inApp.enabled,
      },
    },
    editor: {
      defaultMode: editorDefaultMode?.value ?? defaults.editor.defaultMode,
      autosaveInterval: editorAutosaveInterval?.value ?? defaults.editor.autosaveInterval,
    },
  }

  return { settings }
})
