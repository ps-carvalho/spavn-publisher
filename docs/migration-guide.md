# Migration Guide: Passwordless Authentication

## Overview

This guide helps you migrate an existing password-only Publisher CMS deployment to support passwordless authentication. The migration is designed to be non-breaking — existing password-based logins continue to work throughout the process.

## Pre-Migration Checklist

- [ ] **Backup your database** before running migrations
- [ ] **Upgrade to the latest Publisher CMS version** with passwordless support
- [ ] **Configure an email provider** (required for magic links and device alerts)
- [ ] **Enable HTTPS** in production (required for WebAuthn/passkeys)
- [ ] **Test in a staging environment** before deploying to production
- [ ] **Review feature flags** and decide which methods to enable

## Migration Steps

### Step 1: Database Migration

Publisher CMS uses auto-migration, so new tables are created automatically on startup. The following tables are added:

| Table | Purpose |
|-------|---------|
| `publisher_webauthn_credentials` | Stores passkey public keys and metadata |
| `publisher_totp_secrets` | Stores TOTP secrets and hashed backup codes |
| `publisher_magic_link_tokens` | Stores magic link token hashes with expiry |
| `publisher_user_devices` | Tracks device fingerprints for security alerts |

Additionally, the `publisher_users` table gains two new columns:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `authMethod` | `text` | `'password'` | User's preferred authentication method |
| `emailVerified` | `text` | `null` | Timestamp of email verification |

**Action:** Simply start the updated Publisher CMS. Migrations run automatically.

```bash
# Start the server — migrations run on first request
npm run dev    # development
npm run build && npm run start  # production
```

### Step 2: Configure Environment

Add the new environment variables to your `.env` file. Start with all passwordless methods enabled but not required:

```bash
# Feature flags — enable all methods, keep password as default
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true
PUBLISHER_REQUIRE_PASSWORDLESS=false

# WebAuthn — update for your production domain
PUBLISHER_RP_NAME=Your CMS Name
PUBLISHER_RP_ID=cms.yourdomain.com
PUBLISHER_RP_ORIGIN=https://cms.yourdomain.com

# TOTP
PUBLISHER_TOTP_ISSUER=Your CMS Name

# Security
PUBLISHER_NOTIFY_NEW_DEVICES=true
PUBLISHER_DEVICE_TRACKING=true
```

### Step 3: Configure Email Provider

Uncomment and configure an email provider in `publisher.config.ts`. See [Passwordless Auth Setup Guide](./passwordless-auth-setup.md) for detailed instructions.

### Step 4: Gradual Rollout

Use feature flags to gradually enable passwordless methods:

#### Phase 1: TOTP Only (Low Risk)

Start with TOTP since it doesn't require email infrastructure:

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=false
PUBLISHER_ENABLE_WEBAUTHN=false
PUBLISHER_ENABLE_TOTP=true
```

Communicate to users that they can now set up an authenticator app in Settings → Security.

#### Phase 2: Add Magic Links

Once email is configured and tested:

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=false
PUBLISHER_ENABLE_TOTP=true
```

#### Phase 3: Add Passkeys

Once HTTPS is confirmed and RP settings are correct:

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true
```

#### Phase 4: Optional — Require Passwordless

Only after most users have set up at least one passwordless method:

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true
PUBLISHER_REQUIRE_PASSWORDLESS=true
```

> **Warning:** Setting `PUBLISHER_REQUIRE_PASSWORDLESS=true` hides the password login tab. Ensure all users have at least one passwordless method configured before enabling this.

### Step 5: User Communication

#### Announcement Email Template

```
Subject: New Sign-In Options Available — [Your CMS Name]

Hi [Name],

We've added new ways to sign in to [Your CMS Name] that are faster and more secure than passwords:

🔑 Passkeys — Sign in with your fingerprint, face, or device PIN
📧 Email Links — Get a one-click sign-in link sent to your email
📱 Authenticator App — Use Google Authenticator, Authy, or 1Password

To set up these methods:
1. Sign in to [Your CMS URL]
2. Go to Settings → Security
3. Follow the setup instructions for your preferred method

Your existing password continues to work. These new methods are optional but recommended for better security.

Questions? Contact [support email].

Best,
[Your Team]
```

#### Passwordless Requirement Notice Template

```
Subject: Action Required — Set Up Passwordless Sign-In by [Date]

Hi [Name],

Starting [date], [Your CMS Name] will require passwordless authentication. Password-only sign-in will be disabled.

Please set up at least one of these methods before [date]:
- Passkeys (recommended)
- Authenticator App
- Email Links

Set up instructions: [Your CMS URL]/admin/settings/security

If you need help, contact [support email].

Best,
[Your Team]
```

### Step 6: Monitoring

After enabling passwordless methods, monitor:

1. **Authentication audit logs** — Check Settings → Security → Recent Activity
2. **Server logs** — Watch for errors in magic link email delivery or WebAuthn verification
3. **User feedback** — Collect reports of sign-in issues
4. **Rate limit hits** — Monitor for brute-force attempts on new endpoints

Key log patterns to watch:

```
[Publisher] Failed to send magic link email:    → Email provider issue
[Publisher] WebAuthn registration verification failed:  → RP configuration issue
[Publisher] WebAuthn authentication verification failed: → Credential mismatch
```

## Rollback

If you need to rollback passwordless authentication:

### Quick Rollback (Feature Flags)

Disable all passwordless methods without any code changes:

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=false
PUBLISHER_ENABLE_WEBAUTHN=false
PUBLISHER_ENABLE_TOTP=false
PUBLISHER_REQUIRE_PASSWORDLESS=false
```

Restart the server. Users will only see the password login option.

### Full Rollback (Database)

If you need to completely remove passwordless data:

```sql
-- Remove all passwordless authentication data
-- WARNING: This is irreversible!

-- Remove passkey credentials
DROP TABLE IF EXISTS publisher_webauthn_credentials;

-- Remove TOTP secrets and backup codes
DROP TABLE IF EXISTS publisher_totp_secrets;

-- Remove magic link tokens
DROP TABLE IF EXISTS publisher_magic_link_tokens;

-- Remove device tracking data
DROP TABLE IF EXISTS publisher_user_devices;

-- Reset all users to password authentication
UPDATE publisher_users SET authMethod = 'password';
```

> **Warning:** Full rollback deletes all user passkeys, TOTP configurations, and device trust data. Users will need to re-register if passwordless is re-enabled later.

## FAQ

### Q: Will existing passwords stop working?

No. Password login remains available unless you explicitly set `PUBLISHER_REQUIRE_PASSWORDLESS=true`. Even then, passwords are still stored — only the login UI option is hidden.

### Q: What happens if a user loses their authenticator app?

They can use one of their 10 backup codes to sign in. If they've used all backup codes, an admin can reset their auth method to `password` via the user management API.

### Q: Do I need HTTPS for development?

No. WebAuthn works on `localhost` without HTTPS. For any other domain, HTTPS is required.

### Q: Can users have multiple auth methods?

Yes. Users can have a password, passkeys, and TOTP all configured simultaneously. They choose their preferred method in Settings → Security, and all configured methods are available on the login page.

### Q: What if email delivery fails for magic links?

The magic link request endpoint always returns a success message (to prevent email enumeration). Check server logs for email delivery errors. Users can fall back to password or other configured methods.

### Q: How do I reset a locked-out user?

Use the admin API to update the user's `authMethod` back to `password`:

```bash
# Via the Publisher admin UI: Users → Edit User → Reset auth method
# Or via API if you have admin access
```
