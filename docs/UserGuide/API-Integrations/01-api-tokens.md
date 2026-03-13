---
title: "Managing API Tokens"
description: "Learn how to create, manage, and revoke API tokens for secure access to Publisher's Content API."
category: "API & Integrations"
tags: ["api", "tokens", "authentication", "security"]
lastUpdated: "2026-02-28"
---

# 🔑 Managing API Tokens

API tokens provide secure, passwordless access to Publisher's Content API. This guide covers everything you need to know about creating, managing, and securing your API tokens.

---

## 🤔 What Are API Tokens?

API tokens are unique, encrypted strings that authenticate requests to Publisher's API. Think of them as special passwords designed specifically for applications and integrations — not for human users.

### Why Use API Tokens?

| Benefit | Description |
|---------|-------------|
| **Secure** | Tokens can be revoked without changing your password |
| **Scoped** | Each token can be used for specific purposes |
| **Traceable** | Track which application made which API calls |
| **Expirable** | Set expiration dates for temporary access |

### Token vs. Password Authentication

```
❌ Password Auth: Username + Password sent with each request (less secure)
✅ Token Auth:    Bearer token in Authorization header (more secure)
```

---

## 👥 Who Can Create Tokens?

| Role | Create Tokens | View Tokens | Revoke Tokens |
|------|---------------|-------------|---------------|
| **Super Admin** | ✅ Yes | ✅ All tokens | ✅ All tokens |
| **Admin** | ✅ Yes | ✅ All tokens | ✅ All tokens |
| **Editor** | ❌ No | ❌ No | ❌ No |
| **Viewer** | ❌ No | ❌ No | ❌ No |

> ⚠️ **Important**: Only Super Admins and Admins can manage API tokens. If you need API access, contact your administrator.

---

## ➕ Creating a New Token

### Step-by-Step Instructions

1. **Navigate to Settings**
   
   Log in to the Publisher admin panel and click **Settings** in the main navigation.

2. **Access Token Management**
   
   Go to **Settings → API Tokens** or navigate directly to `/admin/settings/tokens`.

3. **Create New Token**
   
   Click the **"Create Token"** button in the top-right corner.

4. **Enter Token Details**
   
   | Field | Description | Example |
   |-------|-------------|---------|
   | **Name** | Descriptive name for the token | "Production Website" |
   | **Description** | Optional notes about usage | "Main website frontend" |

5. **Generate and Copy**
   
   Click **"Generate Token"**. You'll see the token value displayed **once only**.

   ```bash
   # Example token format
   publisher_api_xK9mN2pL4qR7sT1uV3wY5zA8bC0dE6fG
   ```

6. **Store Securely**
   
   Copy the token immediately and store it in a secure location (see [Security Best Practices](#-security-best-practices)).

   > ⚠️ **Critical**: You cannot view the token again after leaving this page. If you lose it, you'll need to generate a new one.

---

## 📝 Token Naming Best Practices

Good token names help you track and manage tokens effectively:

### ✅ Good Names

```
✓ "Production Website"
✓ "Mobile App - iOS"
✓ "CI/CD Pipeline"
✓ "Backup Service"
✓ "Dev Environment"
```

### ❌ Bad Names

```
✗ "token1"
✗ "test"
✗ "asdf"
✗ "my token"
```

### Naming Conventions

| Pattern | Example | Use Case |
|---------|---------|----------|
| **Environment - Service** | "Production - Website" | Multiple environments |
| **Service Name** | "Mobile App" | Single purpose tokens |
| **Team - Project** | "Marketing - Blog" | Team-based access |
| **Date-based** | "Q1 2026 Campaign" | Time-limited projects |

---

## 📋 Managing Existing Tokens

### Viewing Your Tokens

Navigate to **Settings → API Tokens** to see all tokens:

| Column | Information Shown |
|--------|-------------------|
| **Name** | Token identifier |
| **Description** | Optional notes |
| **Created** | Creation date |
| **Last Used** | Most recent API call |
| **Status** | Active/Revoked |

### Token Details

Click on any token to view:

- Token name and description
- Creation date and creator
- Last used timestamp
- Usage statistics (if available)

### Renaming Tokens

1. Click on the token you want to rename
2. Click the **"Edit"** button
3. Update the name or description
4. Click **"Save Changes"**

> 💡 **Tip**: You can rename tokens at any time without affecting their functionality.

---

## 🗑️ Revoking & Deleting Tokens

### When to Revoke a Token

- 🔐 **Security breach suspected** — Immediately revoke and investigate
- 🔄 **Rotating credentials** — Part of regular security maintenance
- 🚪 **Team member leaving** — Revoke tokens they had access to
- 🗑️ **Service decommissioned** — Clean up unused tokens

### How to Revoke a Token

1. Navigate to **Settings → API Tokens**
2. Find the token you want to revoke
3. Click the **"Revoke"** button (or trash icon)
4. Confirm the action in the dialog

```bash
# Alternatively, via API
curl -X DELETE "https://your-cms.com/api/publisher/tokens/123" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### What Happens When You Revoke?

| Effect | Description |
|--------|-------------|
| **Immediate** | Token stops working instantly |
| **No Recovery** | Cannot be undone — must create new token |
| **Logged** | Revocation is recorded in audit logs |
| **No Data Loss** | Content remains intact |

---

## 🔐 Security Best Practices

### Storing Tokens Securely

```bash
# ✅ GOOD: Use environment variables
export PUBLISHER_API_TOKEN="publisher_api_xK9mN2pL4qR7..."

# ❌ BAD: Hardcode in source code
const token = "publisher_api_xK9mN2pL4qR7..."; // Never do this!
```

### Environment Variable Setup

```bash
# .env file (add to .gitignore!)
PUBLISHER_API_TOKEN=publisher_api_xK9mN2pL4qR7sT1uV3wY5zA8bC0dE6fG
PUBLISHER_API_URL=https://your-cms.com/api/v1
```

```javascript
// Access in your application
const token = process.env.PUBLISHER_API_TOKEN;
```

### Security Checklist

| Practice | Why It Matters |
|----------|----------------|
| ✅ Never commit tokens to git | Tokens in version control are exposed |
| ✅ Use environment variables | Keeps tokens out of source code |
| ✅ Rotate tokens regularly | Limits damage from potential leaks |
| ✅ Use separate tokens per service | Easy to revoke individual access |
| ✅ Monitor token usage | Detect suspicious activity early |
| ❌ Never share tokens via email/chat | Communication channels can be compromised |

---

## 🔄 Token Rotation

### Recommended Rotation Schedule

| Environment | Rotation Frequency |
|-------------|-------------------|
| **Production** | Every 90 days |
| **Staging** | Every 180 days |
| **Development** | Every 365 days |
| **CI/CD** | Every 90 days |

### Rotation Process

1. **Create new token** — Generate before revoking the old one
2. **Update applications** — Replace token in all services
3. **Verify functionality** — Test that everything works
4. **Revoke old token** — Remove the previous token
5. **Document change** — Update your records

### Zero-Downtime Rotation

```bash
# Step 1: Create new token (keep old one active)
NEW_TOKEN=$(curl -s -X POST "https://your-cms.com/api/publisher/tokens" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Website (New)"}' | jq -r '.token')

# Step 2: Update your application with NEW_TOKEN
# Step 3: Verify application works
# Step 4: Revoke old token
curl -X DELETE "https://your-cms.com/api/publisher/tokens/OLD_TOKEN_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## 🚨 Troubleshooting

### Common Issues

| Problem | Solution |
|---------|----------|
| **"Invalid token" error** | Token was revoked or never existed |
| **"Token expired" error** | Generate a new token |
| **"Unauthorized" error** | Check token format and header |
| **Can't create token** | Verify you have Admin or Super Admin role |

### Testing Your Token

```bash
# Quick test to verify token is working
curl -X GET "https://your-cms.com/api/v1/articles" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected success response:
# {"data": [...], "meta": {"pagination": {...}}}

# Expected failure response:
# {"error": {"status": 401, "message": "Unauthorized"}}
```

---

## 💡 Tips & Best Practices

> 🔔 **Enable notifications**: Consider setting up alerts for token creation in your audit logs.

> 📊 **Track usage**: Regularly review which tokens are actively used and clean up unused ones.

> 🔒 **Least privilege**: Create separate tokens for read-only vs. write operations when possible.

> 📝 **Document tokens**: Keep an internal record of what each token is used for.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Webhooks](./02-webhooks.md) | Set up real-time notifications |
| [External API Usage](./03-external-api-usage.md) | Using the Content API |
| [User Roles](../User-Management/01-user-roles.md) | Understanding permissions |

---

*Next: [Configuring Webhooks →](./02-webhooks.md)*
