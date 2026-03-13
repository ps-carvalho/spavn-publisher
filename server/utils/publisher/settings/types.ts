/**
 * CMS Settings Types
 *
 * This module defines TypeScript interfaces, Zod validation schemas, and setting
 * key constants for the CMS settings system covering three domains:
 *
 * 1. General Settings — Site-wide configuration (site identity, SEO, maintenance mode, regional settings)
 * 2. User Settings — Personal preferences (profile, UI preferences, notification settings)
 * 3. Email Service Configuration — SMTP, SendGrid, AWS SES, and Mailgun providers
 *
 * @example
 * ```typescript
 * import { GENERAL_SETTING_KEYS, GeneralSettingsSchema, getDefaultGeneralSettings } from './types'
 *
 * // Get a setting key
 * const siteNameKey = GENERAL_SETTING_KEYS.SITE_NAME
 *
 * // Validate settings
 * const result = GeneralSettingsSchema.safeParse(data)
 *
 * // Get defaults
 * const defaults = getDefaultGeneralSettings()
 * ```
 */

import { z } from 'zod'

// ─── Setting Key Constants ─────────────────────────────────────────────────────

/**
 * Namespaced setting keys for general (site-wide) settings.
 * These settings apply to the entire CMS installation.
 */
export const GENERAL_SETTING_KEYS = {
  // Site Identity
  SITE_NAME: 'general.siteName',
  SITE_DESCRIPTION: 'general.siteDescription',
  LOGO_URL: 'general.logoUrl',
  FAVICON_URL: 'general.faviconUrl',

  // Regional Settings
  TIMEZONE: 'general.timezone',
  LOCALE: 'general.locale',
  DATE_FORMAT: 'general.dateFormat',
  TIME_FORMAT: 'general.timeFormat',

  // SEO Settings
  SEO_TITLE_TEMPLATE: 'general.seo.titleTemplate',
  SEO_DEFAULT_DESCRIPTION: 'general.seo.defaultDescription',

  // Maintenance Mode
  MAINTENANCE_ENABLED: 'general.maintenance.enabled',
  MAINTENANCE_MESSAGE: 'general.maintenance.message',

  // Analytics
  ANALYTICS_GOOGLE_TAG_ID: 'general.analytics.googleTagId',
  ANALYTICS_CUSTOM_SCRIPTS: 'general.analytics.customScripts',
} as const

/**
 * Namespaced setting keys for user-specific settings.
 * These settings are scoped per-user using the `user.{userId}.` prefix.
 */
export const USER_SETTING_KEYS = {
  // Profile Settings
  profileFirstName: (userId: number) => `user.${userId}.profile.firstName`,
  profileLastName: (userId: number) => `user.${userId}.profile.lastName`,
  profileAvatarUrl: (userId: number) => `user.${userId}.profile.avatarUrl`,

  // UI Preferences
  preferencesTheme: (userId: number) => `user.${userId}.preferences.theme`,
  preferencesSidebarCollapsed: (userId: number) => `user.${userId}.preferences.sidebarCollapsed`,
  preferencesItemsPerPage: (userId: number) => `user.${userId}.preferences.itemsPerPage`,

  // Notification Settings
  notificationsEmailEnabled: (userId: number) => `user.${userId}.notifications.email.enabled`,
  notificationsEmailDigestFrequency: (userId: number) => `user.${userId}.notifications.email.digestFrequency`,
  notificationsInAppEnabled: (userId: number) => `user.${userId}.notifications.inApp.enabled`,

  // Editor Settings
  editorDefaultMode: (userId: number) => `user.${userId}.editor.defaultMode`,
  editorAutosaveInterval: (userId: number) => `user.${userId}.editor.autosaveInterval`,
} as const

/**
 * Namespaced setting keys for email service configuration.
 * These settings configure the email provider and credentials.
 */
export const EMAIL_SETTING_KEYS = {
  // Provider Selection
  PROVIDER: 'email.provider',
  FROM_NAME: 'email.fromName',
  FROM_ADDRESS: 'email.fromAddress',

  // SMTP Configuration
  SMTP_HOST: 'email.smtp.host',
  SMTP_PORT: 'email.smtp.port',
  SMTP_SECURE: 'email.smtp.secure',
  SMTP_USER: 'email.smtp.username',
  SMTP_PASSWORD: 'email.smtp.password',

  // SendGrid Configuration
  SENDGRID_API_KEY: 'email.sendgrid.apiKey',

  // AWS SES Configuration
  SES_ACCESS_KEY_ID: 'email.ses.accessKeyId',
  SES_SECRET_ACCESS_KEY: 'email.ses.secretAccessKey',
  SES_REGION: 'email.ses.region',

  // Mailgun Configuration
  MAILGUN_API_KEY: 'email.mailgun.apiKey',
  MAILGUN_DOMAIN: 'email.mailgun.domain',
  MAILGUN_REGION: 'email.mailgun.region',
} as const

// ─── General Settings Types ────────────────────────────────────────────────────

/**
 * Site-wide general settings for the CMS.
 * Includes site identity, regional settings, SEO, maintenance mode, and analytics.
 */
export interface GeneralSettings {
  /** Site name displayed in the header and page titles */
  siteName: string

  /** Short description of the site used in meta tags */
  siteDescription: string

  /** URL to the site logo image (optional) */
  logoUrl: string | null

  /** URL to the site favicon (optional) */
  faviconUrl: string | null

  /** IANA timezone identifier (e.g., 'America/New_York', 'Europe/London') */
  timezone: string

  /** BCP 47 language tag (e.g., 'en-US', 'fr-CA') */
  locale: string

  /** Date format string (e.g., 'MMM D, YYYY') */
  dateFormat: string

  /** Time format string (e.g., 'h:mm A') */
  timeFormat: string

  /** SEO configuration */
  seo: {
    /** Template for page titles (%s is replaced with page title) */
    titleTemplate: string
    /** Default meta description for pages without a custom description */
    defaultDescription: string
  }

  /** Maintenance mode configuration */
  maintenance: {
    /** Whether maintenance mode is enabled */
    enabled: boolean
    /** Message to display during maintenance */
    message: string
  }

  /** Analytics integration configuration */
  analytics: {
    /** Google Tag Manager/Analytics ID (e.g., 'G-XXXXXXXXXX') */
    googleTagId: string | null
    /** Custom analytics scripts (for advanced integrations) */
    customScripts: string | null
  }
}

// ─── User Settings Types ───────────────────────────────────────────────────────

/**
 * User profile settings.
 * Contains personal information for display purposes.
 */
export interface UserProfileSettings {
  /** User's first name */
  firstName: string

  /** User's last name */
  lastName: string

  /** URL to user's avatar image (optional) */
  avatarUrl: string | null
}

/**
 * User UI preferences.
 * Controls the appearance and behavior of the CMS interface.
 */
export interface UserPreferencesSettings {
  /** Color theme preference */
  theme: 'light' | 'dark' | 'system'

  /** Whether the sidebar is collapsed by default */
  sidebarCollapsed: boolean

  /** Number of items to display per page in lists */
  itemsPerPage: number
}

/**
 * User notification preferences.
 * Controls how and when the user receives notifications.
 */
export interface UserNotificationSettings {
  /** Email notification settings */
  email: {
    /** Whether email notifications are enabled */
    enabled: boolean
    /** Frequency of email digest (if enabled) */
    digestFrequency: 'immediate' | 'daily' | 'weekly'
  }

  /** In-app notification settings */
  inApp: {
    /** Whether in-app notifications are enabled */
    enabled: boolean
  }
}

/**
 * User editor preferences.
 * Controls the behavior of the content editor.
 */
export interface UserEditorSettings {
  /** Default editor mode */
  defaultMode: 'visual' | 'code'

  /** Autosave interval in seconds */
  autosaveInterval: number
}

/**
 * Complete user settings object.
 * Combines profile, preferences, notifications, and editor settings.
 */
export interface UserSettings {
  profile: UserProfileSettings
  preferences: UserPreferencesSettings
  notifications: UserNotificationSettings
  editor: UserEditorSettings
}

// ─── Email Settings Types ──────────────────────────────────────────────────────

/**
 * Supported email provider types.
 */
export type EmailProviderType = 'smtp' | 'sendgrid' | 'ses' | 'mailgun'

/**
 * Base interface for email provider settings.
 * All email provider configurations must include these fields.
 */
export interface EmailSettingsBase {
  /** Email provider type */
  provider: EmailProviderType

  /** Display name for the sender (e.g., 'Publisher CMS') */
  fromName: string

  /** Email address for the sender (e.g., 'noreply@example.com') */
  fromAddress: string
}

/**
 * SMTP email provider settings.
 * Compatible with any standard SMTP server.
 */
export interface SmtpEmailSettings extends EmailSettingsBase {
  provider: 'smtp'

  /** SMTP server hostname */
  host: string

  /** SMTP server port */
  port: number

  /** Whether to use TLS/SSL */
  secure: boolean

  /** SMTP authentication username */
  username: string

  /** SMTP authentication password (encrypted at rest) */
  password: string
}

/**
 * SendGrid email provider settings.
 * Uses SendGrid's API for email delivery.
 */
export interface SendGridEmailSettings extends EmailSettingsBase {
  provider: 'sendgrid'

  /** SendGrid API key (starts with 'SG.', encrypted at rest) */
  apiKey: string
}

/**
 * AWS SES email provider settings.
 * Uses Amazon Simple Email Service for delivery.
 */
export interface SesEmailSettings extends EmailSettingsBase {
  provider: 'ses'

  /** AWS access key ID */
  accessKeyId: string

  /** AWS secret access key (encrypted at rest) */
  secretAccessKey: string

  /** AWS region (e.g., 'us-east-1') */
  region: string
}

/**
 * Mailgun email provider settings.
 * Uses Mailgun's API for email delivery.
 */
export interface MailgunEmailSettings extends EmailSettingsBase {
  provider: 'mailgun'

  /** Mailgun API key (encrypted at rest) */
  apiKey: string

  /** Mailgun domain */
  domain: string

  /** Mailgun region (US or EU) */
  region: 'us' | 'eu'
}

/**
 * Union type for all email provider settings.
 * Uses discriminated union on the 'provider' field.
 */
export type EmailSettings = SmtpEmailSettings | SendGridEmailSettings | SesEmailSettings | MailgunEmailSettings

// ─── Zod Validation Schemas ────────────────────────────────────────────────────

/**
 * Regex pattern for validating IANA timezone identifiers.
 * Matches formats like 'UTC', 'America/New_York', 'Europe/London'.
 */
const ianaTimezoneRegex = /^[A-Za-z_]+(?:\/[A-Za-z_]+)*$/

/**
 * Regex pattern for validating BCP 47 locale tags.
 * Matches formats like 'en', 'en-US', 'zh-Hans', 'en-US-latn'.
 */
const bcp47LocaleRegex = /^[a-z]{2,3}(?:-[A-Z][a-z]{3})?(?:-[A-Z]{2})?$/

/**
 * Regex pattern for validating Google Tag IDs.
 * Matches formats like 'G-XXXXXXXXXX', 'GT-XXXXXXX', 'AW-XXXXXXX'.
 */
const googleTagIdRegex = /^(G|GT|AW)-[A-Z0-9]+$/

/**
 * Zod schema for validating general settings.
 */
export const GeneralSettingsSchema = z.object({
  siteName: z.string().min(1, 'Site name is required').max(100),
  siteDescription: z.string().max(500).optional().default(''),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
  timezone: z.string().regex(ianaTimezoneRegex, 'Invalid timezone').default('UTC'),
  locale: z.string().regex(bcp47LocaleRegex, 'Invalid locale').default('en-US'),
  dateFormat: z.string().default('MMM D, YYYY'),
  timeFormat: z.string().default('h:mm A'),
  seo: z.object({
    titleTemplate: z.string().max(100).default('%s — Site Name'),
    defaultDescription: z.string().max(300).default(''),
  }).default({ titleTemplate: '%s — Site Name', defaultDescription: '' }),
  maintenance: z.object({
    enabled: z.boolean().default(false),
    message: z.string().max(500).default('Site is under maintenance'),
  }).default({ enabled: false, message: 'Site is under maintenance' }),
  analytics: z.object({
    googleTagId: z.string().regex(googleTagIdRegex, 'Invalid Google Tag ID').nullable().optional(),
    customScripts: z.string().max(5000).nullable().optional(),
  }).default({ googleTagId: null, customScripts: null }),
})

/**
 * Zod schema for validating user profile settings.
 */
export const UserProfileSettingsSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  avatarUrl: z.string().url().nullable().optional(),
})

/**
 * Zod schema for validating user UI preferences.
 */
export const UserPreferencesSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).default('system'),
  sidebarCollapsed: z.boolean().default(false),
  itemsPerPage: z.number().int().min(10).max(100).default(25),
})

/**
 * Zod schema for validating user notification settings.
 */
export const UserNotificationSettingsSchema = z.object({
  email: z.object({
    enabled: z.boolean().default(true),
    digestFrequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),
  }),
  inApp: z.object({
    enabled: z.boolean().default(true),
  }),
})

/**
 * Zod schema for validating user editor settings.
 */
export const UserEditorSettingsSchema = z.object({
  defaultMode: z.enum(['visual', 'code']).default('visual'),
  autosaveInterval: z.number().int().min(5).max(300).default(30),
})

/**
 * Zod schema for validating complete user settings.
 */
export const UserSettingsSchema = z.object({
  profile: UserProfileSettingsSchema,
  preferences: UserPreferencesSettingsSchema,
  notifications: UserNotificationSettingsSchema,
  editor: UserEditorSettingsSchema,
})

/**
 * Zod schema for validating SMTP email settings.
 */
export const SmtpEmailSettingsSchema = z.object({
  provider: z.literal('smtp'),
  fromName: z.string().min(1, 'From name is required').max(100),
  fromAddress: z.string().email('Invalid email address'),
  host: z.string().min(1, 'SMTP host is required'),
  port: z.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  username: z.string().min(1, 'SMTP username is required'),
  password: z.string().min(1, 'SMTP password is required'),
})

/**
 * Zod schema for validating SendGrid email settings.
 */
export const SendGridEmailSettingsSchema = z.object({
  provider: z.literal('sendgrid'),
  fromName: z.string().min(1, 'From name is required').max(100),
  fromAddress: z.string().email('Invalid email address'),
  apiKey: z.string().min(1, 'API key is required').startsWith('SG.', 'SendGrid API key must start with SG.'),
})

/**
 * Zod schema for validating AWS SES email settings.
 */
export const SesEmailSettingsSchema = z.object({
  provider: z.literal('ses'),
  fromName: z.string().min(1, 'From name is required').max(100),
  fromAddress: z.string().email('Invalid email address'),
  accessKeyId: z.string().min(1, 'Access key ID is required'),
  secretAccessKey: z.string().min(1, 'Secret access key is required'),
  region: z.string().min(1, 'AWS region is required'),
})

/**
 * Zod schema for validating Mailgun email settings.
 */
export const MailgunEmailSettingsSchema = z.object({
  provider: z.literal('mailgun'),
  fromName: z.string().min(1, 'From name is required').max(100),
  fromAddress: z.string().email('Invalid email address'),
  apiKey: z.string().min(1, 'API key is required'),
  domain: z.string().min(1, 'Domain is required'),
  region: z.enum(['us', 'eu']).default('us'),
})

/**
 * Zod schema for validating email settings using discriminated union.
 * Validates based on the 'provider' field.
 */
export const EmailSettingsSchema = z.discriminatedUnion('provider', [
  SmtpEmailSettingsSchema,
  SendGridEmailSettingsSchema,
  SesEmailSettingsSchema,
  MailgunEmailSettingsSchema,
])

// ─── Default Values Helpers ────────────────────────────────────────────────────

/**
 * Returns the default general settings object.
 * Used when no settings exist in the database.
 */
export function getDefaultGeneralSettings(): GeneralSettings {
  return {
    siteName: 'Publisher CMS',
    siteDescription: '',
    logoUrl: null,
    faviconUrl: null,
    timezone: 'UTC',
    locale: 'en-US',
    dateFormat: 'MMM D, YYYY',
    timeFormat: 'h:mm A',
    seo: {
      titleTemplate: '%s — Publisher CMS',
      defaultDescription: '',
    },
    maintenance: {
      enabled: false,
      message: 'Site is under maintenance. Please check back soon.',
    },
    analytics: {
      googleTagId: null,
      customScripts: null,
    },
  }
}

/**
 * Returns the default user settings object.
 * Used when a user has no saved preferences.
 */
export function getDefaultUserSettings(): UserSettings {
  return {
    profile: {
      firstName: '',
      lastName: '',
      avatarUrl: null,
    },
    preferences: {
      theme: 'system',
      sidebarCollapsed: false,
      itemsPerPage: 25,
    },
    notifications: {
      email: {
        enabled: true,
        digestFrequency: 'immediate',
      },
      inApp: {
        enabled: true,
      },
    },
    editor: {
      defaultMode: 'visual',
      autosaveInterval: 30,
    },
  }
}

// ─── Sensitive Fields ──────────────────────────────────────────────────────────

/**
 * List of sensitive fields in email settings that should be masked in API responses.
 * These fields contain credentials that should not be exposed to the client.
 */
export const EMAIL_SENSITIVE_FIELDS = [
  'password',
  'apiKey',
  'secretAccessKey',
] as const

/**
 * Type for sensitive field names.
 */
export type EmailSensitiveField = (typeof EMAIL_SENSITIVE_FIELDS)[number]
