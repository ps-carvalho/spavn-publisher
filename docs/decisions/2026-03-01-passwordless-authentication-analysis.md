---
title: "Passwordless Authentication Analysis"
type: decision
date: 2026-03-01T16:57:38.418Z
status: accepted
tags: []
related_files: ["server/utils/publisher/auth.ts", "server/middleware/publisher-auth.ts", "server/utils/publisher/database/schema/sqlite.ts", "server/utils/publisher/database/schema/postgres.ts", "app/composables/usePublisherAuth.ts", "app/pages/admin/login.vue"]
---

# Passwordless Authentication Analysis

## Executive Summary

After analyzing the current authentication system in Publisher CMS, I've identified that the codebase has a **solid foundation** for implementing passwordless authentication. The existing JWT-based session management, multi-database support, and modular architecture will make this transition feasible.

## Current Authentication State

### What's Working Well

1. **Strong Password Security**
   - PBKDF2-SHA512 with 100,000 iterations
   - Timing-safe comparison to prevent timing attacks
   - 64-byte key length, 32-byte salt

2. **Session Management**
   - JWT tokens with 7-day expiry
   - Server-side revocation support (`publisherRevokedTokens` table)
   - HTTP-only, SameSite=Strict cookies

3. **API Token System**
   - Separate API tokens for programmatic access
   - Token scoping and expiration
   - Prefix-based lookup with SHA256 hashing

4. **Multi-Database Support**
   - SQLite for development/small deployments
   - PostgreSQL for production
   - Dialect-agnostic schema via `getSchema()` helper

5. **Role-Based Access Control**
   - Super Admin, Admin, Editor, Viewer roles
   - User activation via `isActive` flag

### Current Limitations for Passwordless

| Aspect | Current State | Passwordless Requirement |
|--------|---------------|-------------------------|
| Email | None configured | Required for magic links |
| WebAuthn | Not implemented | For passkey support |
| TOTP | Not implemented | For authenticator apps |
| Auth Methods | Password only | Multiple concurrent methods |
| Device Management | None | WebAuthn credentials table needed |

## Passwordless Options Comparison

### 1. Magic Links (Recommended Primary)

**Pros:**
- Zero setup for users
- Works on all devices/browsers
- No additional apps or hardware needed
- Easy to implement
- Familiar UX (similar to Slack, Notion)

**Cons:**
- Requires email infrastructure
- Slight delay (waiting for email)
- Email interception risk (mitigated by short expiry)

**Implementation Effort:** Medium

### 2. WebAuthn/Passkeys

**Pros:**
- Highest security (phishing-resistant)
- Great UX (biometric/device PIN)
- Industry standard (FIDO2)
- Future-proof

**Cons:**
- Browser support still maturing
- Users need compatible devices
- More complex implementation
- Requires credential management UI

**Implementation Effort:** High

### 3. TOTP (Authenticator Apps)

**Pros:**
- Works offline
- No email dependency
- Wide app support (Google Auth, Authy, etc.)
- Good for 2FA scenarios

**Cons:**
- Requires app installation
- QR code setup friction
- Time synchronization issues
- Backup codes needed for recovery

**Implementation Effort:** Medium

## Recommended Implementation Strategy

### Phase 1: Magic Links (Week 1)
Start with magic links as they provide the best balance of security and user experience. This establishes the email infrastructure needed for other features.

### Phase 2: WebAuthn (Weeks 2-3)
Add passkey support for users who want enhanced security. This can be optional for users who prefer it.

### Phase 3: TOTP (Week 4)
Add TOTP support as an additional option. This is particularly useful for users who want MFA or don't trust email.

### Phase 4: User Management (Week 4)
Build the security settings UI allowing users to manage their auth methods and recovery options.

## Security Considerations

### Threat Model

1. **Magic Link Interception**
   - Mitigation: 15-minute expiry, single-use tokens, HTTPS only
   - Detection: Monitor for multiple rapid requests from same IP

2. **Email Enumeration**
   - Mitigation: Return same success message regardless of email existence
   - Rate limiting per IP prevents abuse

3. **Credential Stuffing**
   - Mitigation: Rate limiting on all auth endpoints
   - Account lockout after failed attempts

4. **Device Loss (WebAuthn)**
   - Mitigation: Require backup codes during TOTP/passkey setup
   - Recovery flow via email verification

### Compliance

- **GDPR**: Email verification required before sending magic links
- **SOC 2**: Audit logging for auth method changes
- **Passwordless**: Eliminates password-related compliance overhead

## Migration Path for Existing Users

1. **Gradual Rollout**
   - Existing users keep password auth (no forced migration)
   - New users can choose passwordless during signup
   - Optional "Go passwordless" prompt in settings

2. **Admin Enforcement**
   - Policy setting to require passwordless for new users
   - Grace period for existing users to transition

3. **API Compatibility**
   - Existing API tokens continue to work
   - Password-based login endpoint remains functional
   - New endpoints are additive only

## Dependencies to Add

```json
{
  "@simplewebauthn/server": "^9.x",
  "@simplewebauthn/browser": "^9.x",
  "otpauth": "^9.x",
  "nodemailer": "^6.x" // or sendgrid, etc.
}
```

## Database Migration Impact

**New Tables:** 3
- `publisherWebAuthnCredentials` (~100 bytes per credential)
- `publisherTOTPSecrets` (~50 bytes per user)
- `publisherMagicLinkTokens` (auto-expiring, minimal storage)

**Modified Tables:** 1
- `publisherUsers`: 2 new columns (`authMethod`, `emailVerified`)

**Estimated Storage:** Negligible (< 1MB for 1000 users)

## Conclusion

Publisher CMS is well-positioned to implement passwordless authentication. The existing JWT infrastructure, clean separation of concerns, and multi-database support provide a solid foundation.

**Recommendation:** Proceed with Phase 1 (Magic Links) first to establish email infrastructure and validate the approach, then add WebAuthn and TOTP as enhancements.

See the full implementation plan in `.cortex/plans/2026-03-01-feature-passwordless-authentication-implementation.md`

## Related Files

- `server/utils/publisher/auth.ts`
- `server/middleware/publisher-auth.ts`
- `server/utils/publisher/database/schema/sqlite.ts`
- `server/utils/publisher/database/schema/postgres.ts`
- `app/composables/usePublisherAuth.ts`
- `app/pages/admin/login.vue`
