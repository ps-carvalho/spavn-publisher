# Passwordless Authentication Setup Guide

## Overview

Publisher CMS supports multiple passwordless authentication methods alongside traditional password-based login. Users can sign in using:

- **Magic Links** — Receive a one-time sign-in link via email
- **Passkeys (WebAuthn)** — Use biometrics, security keys, or device screen lock
- **Authenticator App (TOTP)** — Use a 6-digit code from Google Authenticator, Authy, 1Password, etc.

All methods can be used simultaneously, and users can choose their preferred method from the security settings page.

## Prerequisites

### For All Passwordless Methods

- Publisher CMS installed and running
- `PUBLISHER_SECRET` environment variable set (required for JWT signing)

### For Magic Links

- **Email provider configured** — SMTP server or SendGrid API key
- **DNS properly configured** — SPF, DKIM, and DMARC records for your sending domain
- Sender email address verified with your email provider

### For Passkeys (WebAuthn)

- **HTTPS enabled in production** — WebAuthn requires a secure context
  - `localhost` works for development without HTTPS
- Modern browser with WebAuthn support (Chrome 67+, Safari 14+, Firefox 60+, Edge 79+)
- Correct Relying Party (RP) configuration matching your domain

### For Authenticator App (TOTP)

- No special infrastructure requirements
- Users need an authenticator app installed on their device

## Configuration

### Step 1: Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

```bash
# Required: JWT signing secret
PUBLISHER_SECRET=your-secret-key-here

# Feature flags (all default to true)
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true
PUBLISHER_REQUIRE_PASSWORDLESS=false
```

### Step 2: Email Provider Setup

Email is required for magic links and new-device alerts. Choose one provider:

#### SMTP (Gmail, Mailgun, Amazon SES, etc.)

```bash
PUBLISHER_EMAIL_PROVIDER=smtp
PUBLISHER_EMAIL_FROM=Publisher CMS <noreply@yourdomain.com>
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-username
SMTP_PASS=your-password
```

Then uncomment the SMTP provider block in `publisher.config.ts`:

```typescript
// In publisher.config.ts → email → providers
smtp: {
  type: 'smtp',
  host: process.env.SMTP_HOST || 'smtp.example.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  user: process.env.SMTP_USER || '',
  pass: process.env.SMTP_PASS || '',
  secure: (process.env.SMTP_PORT || '587') === '465',
  from: process.env.PUBLISHER_EMAIL_FROM || 'Publisher CMS <noreply@example.com>',
  default: true,
},
```

#### SendGrid

```bash
PUBLISHER_EMAIL_PROVIDER=sendgrid
PUBLISHER_EMAIL_FROM=Publisher CMS <noreply@yourdomain.com>
SENDGRID_API_KEY=SG.your-api-key
```

Then uncomment the SendGrid provider block in `publisher.config.ts`.

### Step 3: WebAuthn/Passkey Setup

Configure the Relying Party (RP) settings to match your deployment domain:

```bash
# Human-readable name shown in browser passkey prompts
PUBLISHER_RP_NAME=Publisher CMS

# Must match your domain exactly (no protocol, no port)
# Use 'localhost' for development
PUBLISHER_RP_ID=yourdomain.com

# Full origin URL (protocol + domain + port if non-standard)
PUBLISHER_RP_ORIGIN=https://yourdomain.com
```

> **Important:** The RP ID must match the domain where users access the app. If your app is at `https://cms.example.com`, set `PUBLISHER_RP_ID=cms.example.com`.

### Step 4: TOTP Setup

Configure the issuer name shown in authenticator apps:

```bash
PUBLISHER_TOTP_ISSUER=Publisher CMS
```

This name appears in the user's authenticator app alongside the account entry.

### Step 5: Security Settings

Configure device tracking and alerts:

```bash
# Send email when a new device signs in
PUBLISHER_NOTIFY_NEW_DEVICES=true

# Maximum tracked devices per user
PUBLISHER_MAX_DEVICES_PER_USER=10

# Enable device fingerprinting
PUBLISHER_DEVICE_TRACKING=true
```

### Step 6: Feature Flags

Control which authentication methods are available:

```bash
# Disable specific methods by setting to 'false'
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true

# Hide password login (only enable after users have passwordless methods set up)
PUBLISHER_REQUIRE_PASSWORDLESS=false
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `PUBLISHER_SECRET` | JWT signing secret | — | **Yes** |
| `PUBLISHER_ENABLE_MAGIC_LINKS` | Enable magic link authentication | `true` | No |
| `PUBLISHER_ENABLE_WEBAUTHN` | Enable passkey/WebAuthn authentication | `true` | No |
| `PUBLISHER_ENABLE_TOTP` | Enable TOTP authenticator authentication | `true` | No |
| `PUBLISHER_REQUIRE_PASSWORDLESS` | Hide password login option | `false` | No |
| `PUBLISHER_RP_NAME` | WebAuthn Relying Party display name | `Publisher CMS` | No |
| `PUBLISHER_RP_ID` | WebAuthn Relying Party ID (domain) | `localhost` | Production |
| `PUBLISHER_RP_ORIGIN` | WebAuthn origin URL | `http://localhost:3000` | Production |
| `PUBLISHER_TOTP_ISSUER` | TOTP issuer name in authenticator apps | `Publisher CMS` | No |
| `PUBLISHER_EMAIL_PROVIDER` | Email provider (`smtp` or `sendgrid`) | `smtp` | For magic links |
| `PUBLISHER_EMAIL_FROM` | Default sender email address | — | For magic links |
| `SMTP_HOST` | SMTP server hostname | — | For SMTP |
| `SMTP_PORT` | SMTP server port | `587` | For SMTP |
| `SMTP_USER` | SMTP username | — | For SMTP |
| `SMTP_PASS` | SMTP password | — | For SMTP |
| `SENDGRID_API_KEY` | SendGrid API key | — | For SendGrid |
| `PUBLISHER_NOTIFY_NEW_DEVICES` | Email on new device login | `true` | No |
| `PUBLISHER_MAX_DEVICES_PER_USER` | Max tracked devices per user | `10` | No |
| `PUBLISHER_DEVICE_TRACKING` | Enable device fingerprinting | `true` | No |

## Testing

### Testing Magic Links

1. Ensure email provider is configured and uncommented in `publisher.config.ts`
2. Go to the login page and select the "Email Link" tab
3. Enter a valid user email address
4. Check the email inbox for the sign-in link
5. Click the link — you should be signed in automatically
6. The link expires after 15 minutes and can only be used once

**Troubleshooting:**
- Check server logs for email sending errors
- Verify SMTP credentials are correct
- Check spam/junk folder
- Ensure the sender domain has proper DNS records (SPF, DKIM)

### Testing Passkeys (WebAuthn)

1. Ensure `PUBLISHER_RP_ID` and `PUBLISHER_RP_ORIGIN` match your environment
2. Sign in with password first, then go to Settings → Security
3. Click "Add Passkey" and follow the browser prompt
4. Sign out, then sign in using the "Passkey" tab
5. Enter your email and click "Sign in with Passkey"

**Troubleshooting:**
- WebAuthn requires HTTPS in production (localhost works for development)
- Ensure the RP ID matches the domain exactly
- Check browser console for WebAuthn errors
- Try a different browser if the current one doesn't support WebAuthn

### Testing TOTP (Authenticator App)

1. Sign in with password first, then go to Settings → Security
2. Click "Set Up Authenticator" in the Authenticator App section
3. Scan the QR code with your authenticator app
4. Save the backup codes in a safe place
5. Enter the 6-digit code from your app to verify
6. Sign out, then sign in using the "Authenticator" tab
7. Test backup code login by clicking "Use a backup code"

**Troubleshooting:**
- Ensure your device clock is synchronized (TOTP is time-based)
- Each backup code can only be used once
- If locked out, an admin can reset your auth method

### Testing Feature Flags

1. Set `PUBLISHER_ENABLE_MAGIC_LINKS=false` in `.env`
2. Restart the server
3. Verify the "Email Link" tab is hidden on the login page
4. Verify the Magic Link status card is hidden in security settings
5. Verify API endpoints return 404 when the feature is disabled

Repeat for `PUBLISHER_ENABLE_WEBAUTHN` and `PUBLISHER_ENABLE_TOTP`.

## Security Considerations

- **Magic link tokens** expire after 15 minutes and are single-use
- **WebAuthn credentials** use public-key cryptography — private keys never leave the user's device
- **TOTP secrets** are stored encrypted in the database
- **Backup codes** are hashed with SHA-256 before storage
- **Rate limiting** is applied to all authentication endpoints
- **Device tracking** alerts users when a new device signs in
- **Audit logging** records all authentication events

## Common Configurations

### Development (Default)

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true
PUBLISHER_RP_ID=localhost
PUBLISHER_RP_ORIGIN=http://localhost:3000
```

### Production (All Methods)

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true
PUBLISHER_RP_ID=cms.yourdomain.com
PUBLISHER_RP_ORIGIN=https://cms.yourdomain.com
PUBLISHER_NOTIFY_NEW_DEVICES=true
```

### Production (Passwordless Only)

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=true
PUBLISHER_ENABLE_WEBAUTHN=true
PUBLISHER_ENABLE_TOTP=true
PUBLISHER_REQUIRE_PASSWORDLESS=true
PUBLISHER_RP_ID=cms.yourdomain.com
PUBLISHER_RP_ORIGIN=https://cms.yourdomain.com
```

### Production (Password + TOTP Only)

```bash
PUBLISHER_ENABLE_MAGIC_LINKS=false
PUBLISHER_ENABLE_WEBAUTHN=false
PUBLISHER_ENABLE_TOTP=true
```
