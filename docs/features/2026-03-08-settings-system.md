# Settings System

> **Status**: Implemented  
> **Date**: 2026-03-08  
> **Tags**: settings, configuration, api, email, user-preferences

## Overview

The Settings System provides a comprehensive configuration management solution for the Publisher CMS. It supports three distinct domains of settings:

1. **General Settings** — Site-wide configuration (site identity, SEO, maintenance mode, analytics)
2. **User Settings** — Personal preferences (profile, UI preferences, notifications, editor)
3. **Email Settings** — Email provider configuration (SMTP, SendGrid, AWS SES, Mailgun)

## Architecture

### Settings Storage

Settings are stored in the `publisher_settings` database table with a key-value structure:

```sql
CREATE TABLE publisher_settings (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Key Namespacing

Settings use namespaced keys to organize different setting types:

| Domain | Key Pattern | Example |
|--------|-------------|---------|
| General | `general.*` | `general_settings` |
| User | `user.{userId}.*` | `user.123.profile.firstName` |
| Email | `email.*` | `email_settings` |

### Caching

The settings service uses in-memory caching for performance:

```typescript
// Settings are cached after first read
const settings = await getSetting('general_settings')

// Clear cache after direct database updates
clearSettingsCache()
```

## API Endpoints

### General Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/publisher/settings/general` | Get general settings | Admin |
| PUT | `/api/publisher/settings/general` | Update general settings | Admin |

### User Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/publisher/settings/user` | Get current user's settings | User |
| PUT | `/api/publisher/settings/user` | Update current user's settings | User |

### Email Settings

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/publisher/settings/email` | Get email configuration | Admin |
| PUT | `/api/publisher/settings/email` | Update email configuration | Admin |
| POST | `/api/publisher/settings/email/test` | Send test email | Admin |

## Data Structures

### General Settings

```typescript
interface GeneralSettings {
  // Site Identity
  siteName: string
  siteDescription: string
  logoUrl: string | null
  faviconUrl: string | null

  // Regional Settings
  timezone: string        // IANA timezone (e.g., 'America/New_York')
  locale: string          // BCP 47 locale (e.g., 'en-US')
  dateFormat: string      // Date format (e.g., 'MMM D, YYYY')
  timeFormat: string      // Time format (e.g., 'h:mm A')

  // SEO
  seo: {
    titleTemplate: string
    defaultDescription: string
  }

  // Maintenance Mode
  maintenance: {
    enabled: boolean
    message: string
  }

  // Analytics
  analytics: {
    googleTagId: string | null
    customScripts: string | null
  }
}
```

### User Settings

```typescript
interface UserSettings {
  profile: {
    firstName: string
    lastName: string
    avatarUrl: string | null
  }

  preferences: {
    theme: 'light' | 'dark' | 'system'
    sidebarCollapsed: boolean
    itemsPerPage: number  // 10-100
  }

  notifications: {
    email: {
      enabled: boolean
      digestFrequency: 'immediate' | 'daily' | 'weekly'
    }
    inApp: {
      enabled: boolean
    }
  }

  editor: {
    defaultMode: 'visual' | 'code'
    autosaveInterval: number  // 5-300 seconds
  }
}
```

### Email Settings

```typescript
// Discriminated union based on provider type
type EmailSettings = 
  | SmtpEmailSettings 
  | SendGridEmailSettings 
  | SesEmailSettings 
  | MailgunEmailSettings

interface SmtpEmailSettings {
  provider: 'smtp'
  fromName: string
  fromAddress: string
  host: string
  port: number
  secure: boolean
  username: string
  password: string  // Masked in GET responses
}

interface SendGridEmailSettings {
  provider: 'sendgrid'
  fromName: string
  fromAddress: string
  apiKey: string  // Masked in GET responses, must start with 'SG.'
}

interface SesEmailSettings {
  provider: 'ses'
  fromName: string
  fromAddress: string
  accessKeyId: string
  secretAccessKey: string  // Masked in GET responses
  region: string
}

interface MailgunEmailSettings {
  provider: 'mailgun'
  fromName: string
  fromAddress: string
  apiKey: string  // Masked in GET responses
  domain: string
  region: 'us' | 'eu'
}
```

## Security

### Sensitive Field Masking

Email settings containing credentials are masked in GET responses:

```typescript
// Original password: "my-secret-password"
// Masked response: "my-s***ord"
```

The masking format shows first 4 characters + `***` + last 3 characters.

### Credential Preservation

When updating email settings, masked credentials are preserved if not changed:

```typescript
// If user submits masked password, the original is kept
PUT /api/publisher/settings/email
{
  "provider": "smtp",
  "password": "my-s***ord"  // Masked - original preserved
}
```

### Authorization

| Endpoint | Required Role |
|----------|---------------|
| General Settings | `admin` or `super-admin` |
| User Settings | Any authenticated user (own settings only) |
| Email Settings | `admin` or `super-admin` |

## Validation

All settings use Zod schemas for validation:

```typescript
// Example: Site name validation
siteName: z.string().min(1, 'Site name is required').max(100)

// Example: Google Tag ID validation
googleTagId: z.string().regex(/^(G|GT|AW)-[A-Z0-9]+$/, 'Invalid Google Tag ID')
```

### Validation Error Response

```json
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "siteName": ["Site name is required"],
      "analytics.googleTagId": ["Invalid Google Tag ID"]
    }
  }
}
```

## Audit Trail

All setting changes are logged to the audit trail:

```typescript
await logAuthEvent(event, userId, 'preference_updated', {
  category: 'general_settings',
  changes: ['siteName', 'timezone'],
})
```

## UI Components

### GeneralSettings.vue

Located at: `lib/publisher-admin/components/publisher/settings/GeneralSettings.vue`

Features:
- Site identity configuration
- Regional settings (timezone, locale, date/time formats)
- SEO defaults
- Maintenance mode toggle with message
- Analytics integration

### UserSettings.vue

Located at: `lib/publisher-admin/components/publisher/settings/UserSettings.vue`

Features:
- Profile editing (name, avatar)
- Theme selection (light/dark/system)
- Sidebar preference
- Notification preferences
- Editor preferences (mode, autosave interval)

### EmailSettings.vue

Located at: `lib/publisher-admin/components/publisher/settings/EmailSettings.vue`

Features:
- Provider selection (SMTP, SendGrid, SES, Mailgun)
- Dynamic form based on provider
- Test email functionality
- Configuration status indicator

## Testing

Test files are located alongside the source files:

- `server/api/publisher/settings/general.spec.ts`
- `server/api/publisher/settings/user.spec.ts`
- `server/api/publisher/settings/email.spec.ts`
- `lib/publisher-admin/components/publisher/settings/GeneralSettings.spec.ts`
- `lib/publisher-admin/components/publisher/settings/UserSettings.spec.ts`
- `lib/publisher-admin/components/publisher/settings/EmailSettings.spec.ts`

Run tests:

```bash
npx vitest run
```

## Usage Examples

### Fetching Settings

```typescript
// General settings
const { settings } = await $fetch('/api/publisher/settings/general')

// User settings
const { settings } = await $fetch('/api/publisher/settings/user')

// Email settings (with masked credentials)
const { settings, configured } = await $fetch('/api/publisher/settings/email')
```

### Updating Settings

```typescript
// Update general settings
await $fetch('/api/publisher/settings/general', {
  method: 'PUT',
  body: {
    siteName: 'My Site',
    timezone: 'America/New_York',
    // ... other fields
  },
})

// Update user settings
await $fetch('/api/publisher/settings/user', {
  method: 'PUT',
  body: {
    profile: { firstName: 'John', lastName: 'Doe', avatarUrl: null },
    preferences: { theme: 'dark', sidebarCollapsed: false, itemsPerPage: 25 },
    notifications: { email: { enabled: true, digestFrequency: 'daily' }, inApp: { enabled: true } },
    editor: { defaultMode: 'visual', autosaveInterval: 30 },
  },
})
```

### Testing Email Configuration

```typescript
const result = await $fetch('/api/publisher/settings/email/test', {
  method: 'POST',
  body: { to: 'admin@example.com' }, // Optional, defaults to current user
})

if (result.success) {
  console.log(`Test email sent to ${result.recipient}`)
} else {
  console.error(`Failed: ${result.error}`)
}
```

## Related Documentation

- [Storage Configuration Guide](./2026-03-01-storage-configuration-guide.md)
- [Publisher CMS Overview](./2026-02-28-publisher-cms.md)
