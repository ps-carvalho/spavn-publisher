---
title: "Accessing Publisher CMS"
description: "Learn how to access the Publisher admin interface, log in, reset your password, and navigate the system."
category: "Getting Started"
tags: ["login", "authentication", "navigation", "access"]
lastUpdated: "2026-02-28"
---

# 🔐 Accessing Publisher CMS

This guide walks you through accessing the Publisher CMS admin interface, logging in, managing your session, and navigating the system.

---

## 🌐 Accessing the Admin Interface

Publisher's admin interface is available at a dedicated URL path on your domain.

### URL Format

```
https://your-domain.com/admin
```

| Environment | Example URL |
|-------------|-------------|
| Production | `https://cms.yourcompany.com/admin` |
| Staging | `https://staging.yourcompany.com/admin` |
| Local Development | `http://localhost:3000/admin` |

> 💡 **Tip**: Bookmark the admin URL for quick access. Your administrator will provide the correct URL for your environment.

---

## 📝 Logging In

### Step-by-Step Login Process

1. **Navigate to the Admin URL**
   - Open your web browser
   - Go to `https://your-domain.com/admin`

2. **Enter Your Credentials**
   
   | Field | Description |
   |-------|-------------|
   | **Email** | Your registered email address |
   | **Password** | Your account password |

3. **Click "Sign In"**
   - If credentials are correct, you'll be redirected to the dashboard
   - If there's an error, check your email and password and try again

### Login Screen Overview

```
┌─────────────────────────────────────────┐
│           📖 Publisher                  │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Email                          │   │
│   │  [your@email.com            ]   │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Password                       │   │
│   │  [•••••••••••               ]   │   │
│   └─────────────────────────────────┘   │
│                                         │
│   [  Forgot password? ]                 │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │          Sign In                │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🔑 Password Reset

If you've forgotten your password, you can reset it via email.

### Reset Process

1. **Click "Forgot Password"**
   - On the login screen, click the "Forgot password?" link

2. **Enter Your Email**
   - Provide the email address associated with your account

3. **Check Your Email**
   - Look for a password reset email from Publisher
   - Check your spam/junk folder if you don't see it

4. **Click the Reset Link**
   - The email contains a secure link that expires after a limited time
   - Click the link to open the password reset page

5. **Create a New Password**
   
   | Requirement | Description |
   |-------------|-------------|
   | Minimum length | At least 8 characters |
   | Complexity | Mix of letters, numbers, and symbols recommended |
   | Uniqueness | Don't reuse passwords from other services |

6. **Confirm and Log In**
   - After setting your new password, return to the login page
   - Sign in with your new credentials

### Password Reset Email Example

```
Subject: Reset Your Publisher Password

Hi [Your Name],

We received a request to reset your password for your Publisher account.

Click the button below to create a new password:

[Reset Password]

This link will expire in 1 hour. If you didn't request this reset,
you can safely ignore this email.

The Publisher Team
```

> ⚠️ **Security Note**: Never share password reset links. If you receive a reset email you didn't request, your account may still be secure — someone may have entered your email by mistake. However, if you're concerned, change your password as a precaution.

---

## 🧭 Navigation Basics

Once logged in, you'll see the main admin interface with two key navigation areas:

### Sidebar Navigation

The sidebar on the left provides access to all major sections:

| Icon | Section | Description |
|------|---------|-------------|
| 🏠 | **Dashboard** | Overview of content and activity |
| 📝 | **Content Types** | Your defined content structures (e.g., Articles, Pages) |
| 🖼️ | **Media** | Image and file library |
| 👥 | **Users** | User management (admin only) |
| ⚙️ | **Settings** | System configuration (admin only) |

### Topbar Elements

The topbar at the top of the screen contains:

| Element | Location | Function |
|---------|----------|----------|
| **Search** | Left side | Search across content and media |
| **Notifications** | Center-right | System notifications and alerts |
| **User Menu** | Right side | Profile, settings, and logout |

### User Menu Options

Click your avatar/name to access:

| Option | Description |
|--------|-------------|
| **Profile** | View and edit your profile information |
| **Settings** | Your personal preferences |
| **Sign Out** | Log out of the system |

---

## 🔒 Session Management

### Session Duration

| Setting | Default Behavior |
|---------|------------------|
| Session timeout | 24 hours of inactivity |
| Remember me | Keeps you logged in longer |
| Auto-logout | After extended inactivity |

### Best Practices for Sessions

> 💡 **On Shared Computers**: Always log out when you're finished. Don't use "Remember me" on public or shared devices.

> 🔐 **Security Tip**: If you suspect unauthorized access to your account, change your password immediately and contact your administrator.

### Signing Out

1. Click your user avatar/name in the topbar
2. Select **"Sign Out"** from the dropdown menu
3. You'll be redirected to the login page

---

## ❓ Troubleshooting Login Issues

### Common Problems & Solutions

| Problem | Solution |
|---------|----------|
| **"Invalid credentials" error** | Double-check your email spelling and password. Ensure caps lock is off. |
| **Account locked** | Contact your administrator to unlock your account |
| **No reset email received** | Check spam folder. Verify you're using the correct email address. |
| **Reset link expired** | Request a new password reset. Links expire after 1 hour. |
| **Page not loading** | Clear browser cache. Try a different browser. Check your internet connection. |

### Browser Requirements

Publisher works best with modern browsers:

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

> ⚠️ **Note**: Internet Explorer is not supported.

---

## 💡 Tips & Best Practices

> 🔐 **Use a password manager**: Store your credentials securely with a tool like 1Password, Bitwarden, or LastPass.

> 📱 **Bookmark the login page**: Save time by bookmarking `/admin` for quick access.

> 🔄 **Enable 2FA if available**: Add an extra layer of security to your account when two-factor authentication is enabled.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Introduction](./01-introduction.md) | Overview of Publisher CMS |
| [Dashboard Overview](./03-dashboard-overview.md) | Understanding the admin interface |
| [User Management](../User-Management/) | Managing users and roles |

---

*Previous: [Introduction ←](./01-introduction.md) | Next: [Dashboard Overview →](./03-dashboard-overview.md)*
