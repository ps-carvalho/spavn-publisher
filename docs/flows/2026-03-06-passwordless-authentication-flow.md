---
title: "Passwordless Authentication Flow"
type: flow
date: 2026-03-06T22:21:22.196Z
tags: ["auth", "login", "passwordless", "user-interaction"]
related_files: ["app/pages/admin/login.vue", "server/api/publisher/auth/identify.post.ts", "server/api/publisher/auth/magic-link/request.post.ts", "server/api/publisher/auth/webauthn/authenticate/options.post.ts", "server/api/publisher/auth/totp/login.post.ts"]
---

# Flow: Passwordless Authentication

## Overview

The two-step passwordless authentication flow guides users through login without passwords. The system automatically detects the user's configured authentication method and presents the appropriate interface.

## Flow Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Login Page
    participant API as Backend API
    participant DB as Database
    participant Email as Email Service

    rect rgb(240, 255, 240)
        Note over U,API: Step 1: Email Entry
        U->>UI: Enter email address
        U->>UI: Click "Continue"
        UI->>API: POST /auth/identify {email}
        API->>DB: Find user by email
        DB-->>API: User record (or null)
        API->>API: Check enabled auth methods
        API-->>UI: {method, availableMethods}
    end

    alt Magic Link Flow
        rect rgb(255, 240, 240)
            Note over U,Email: Step 2a: Magic Link
            UI->>U: Show "Send Magic Link" button
            U->>UI: Click button
            UI->>API: POST /auth/magic-link/request
            API->>DB: Generate & store token
            API->>Email: Send magic link email
            API-->>UI: Success
            UI->>U: "Check your email"
            U->>UI: Click link from email
            UI->>API: GET /auth/magic-link/verify
            API->>DB: Validate token
            API-->>UI: JWT session cookie
            UI->>U: Redirect to /admin
        end

    else Passkey Flow
        rect rgb(240, 240, 255)
            Note over U,API: Step 2b: Passkey
            UI->>API: POST /auth/webauthn/authenticate/options
            API-->>UI: Challenge options
            UI->>U: Browser shows passkey prompt
            U-->>UI: Biometric/PIN authentication
            UI->>API: POST /auth/webauthn/authenticate/verify
            API->>DB: Verify credential
            API-->>UI: JWT session cookie
            UI->>U: Redirect to /admin
        end

    else TOTP Flow
        rect rgb(255, 255, 240)
            Note over U,DB: Step 2c: TOTP
            UI->>U: Show 6-digit code input
            U->>UI: Enter code from authenticator
            UI->>API: POST /auth/totp/login {email, code}
            API->>DB: Verify TOTP code
            API-->>UI: JWT session cookie
            UI->>U: Redirect to /admin
        end
    end
```

## Steps

### Step 1: Email Entry

1. **Display email input** — Single field with "Continue" button
2. **Validate email format** — Client-side regex validation
3. **Call identify endpoint** — `POST /api/publisher/auth/identify`
4. **Handle response** — Transition to Step 2 with detected method

### Step 2: Method-Specific Authentication

#### Magic Link Method
1. **Show explanation** — "We'll send you a secure sign-in link"
2. **User clicks "Send Magic Link"**
3. **API sends email** — Token valid for 15 minutes
4. **Display success message** — "Check your email for a sign-in link"
5. **User clicks link** — Opens `/auth/magic-link/verify?token=...`
6. **Session created** — JWT cookie set, redirect to admin

#### Passkey Method
1. **Auto-trigger prompt** — 100ms delay after UI renders
2. **Browser shows native UI** — Fingerprint, Face ID, or security key
3. **User authenticates** — Biometric or PIN
4. **Backend verifies** — WebAuthn challenge/response
5. **Session created** — JWT cookie set, redirect to admin

#### TOTP Method
1. **Show code input** — 6-digit numeric field
2. **User enters code** — From authenticator app (Google Auth, Authy, etc.)
3. **Submit for verification** — `POST /api/publisher/auth/totp/login`
4. **Session created** — JWT cookie set, redirect to admin

### Alternative Methods

If user has multiple auth methods configured, alternative options appear:
- "Other sign-in methods:" section shows available alternatives
- User can switch between methods without re-entering email

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid email format | Client-side validation, show error message |
| Unknown email | Return generic magic-link response (no error) |
| Rate limit exceeded | 429 error, show "Too many attempts" |
| Magic link expired | Clear error message, offer to resend |
| Passkey not supported | Show browser compatibility warning |
| Invalid TOTP code | "Invalid code" error, allow retry |
| Account inactive | Generic response (same as unknown email) |

## Security Measures

- **Email enumeration prevention**: Unknown emails return same response as known users
- **Timing attack mitigation**: Minimum 100ms response time for identify endpoint
- **Rate limiting**: 5 identify requests per email per hour
- **Token expiration**: Magic links expire in 15 minutes
- **Single-use tokens**: Magic link tokens are consumed on use

## Edge Cases

- **Browser back button**: Maintains state, returns to email entry
- **Multiple devices**: Passkeys sync across devices (iCloud, Google)
- **Backup codes**: TOTP users can use backup codes if authenticator is lost
- **Method switching**: Users with multiple methods can switch at any time
- **Session persistence**: JWT valid for 7 days, refreshable

## Related Files

- `app/pages/admin/login.vue`
- `server/api/publisher/auth/identify.post.ts`
- `server/api/publisher/auth/magic-link/request.post.ts`
- `server/api/publisher/auth/webauthn/authenticate/options.post.ts`
- `server/api/publisher/auth/totp/login.post.ts`
