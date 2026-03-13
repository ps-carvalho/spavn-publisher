---
title: "Authentication Architecture"
type: decision
date: 2026-03-01T16:55:05.519Z
status: accepted
tags: []
related_files: []
---

# Authentication Architecture

This document outlines the authentication system used in Publisher CMS.

## Overview

Publisher CMS uses a dual authentication system:
- **Session-based JWT** for admin users (browser sessions)
- **API Tokens** for programmatic access (external integrations)

## Current Implementation

### Session Authentication (JWT)

- Uses `jose` library for JWT signing/verification
- Tokens stored in HTTP-only cookies
- Expiration: 7 days (configurable via `publisher.config.ts`)
- Includes user ID, role, and JWT ID (jti) for revocation tracking

### Password Hashing

- Algorithm: PBKDF2-SHA512 (not bcrypt as config might suggest)
- Iterations: 10,000
- Salt: Included in hash output
- Key length: 64 bytes

### API Token Authentication

- Random 64-character hex tokens
- SHA256 hash stored in database
- 8-character prefix for lookup (last access tracking)
- Optional expiration dates
- Scope-based permissions

### Database Schema

**Users table:**
- id, email, password, role, created_at, updated_at

**Revoked Tokens table:**
- id, jti, expires_at (for cleanup)
- Used for server-side logout

**API Tokens table:**
- id, user_id, name, token_hash, token_prefix, scopes, expires_at, last_used_at, created_at

## Security Considerations

- `PUBLISHER_SECRET` environment variable required in production
- Development uses deterministic secret (sessions survive restarts)
- CSRF protection via SameSite cookies
- Rate limiting recommended on auth endpoints

## Multi-Database Support

The system supports both SQLite and PostgreSQL through a dialect-aware schema loader (`loadSchema()` and `getSchema()` helpers).
