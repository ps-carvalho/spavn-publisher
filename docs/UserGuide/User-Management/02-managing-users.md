---
title: "Managing Users"
description: "Learn how to create, edit, disable, and manage user accounts in Publisher CMS."
category: "User Management"
tags: ["users", "administration", "user-management", "accounts", "team"]
lastUpdated: "2026-02-28"
---

# 👥 Managing Users

Effective user management is essential for maintaining a secure and organized CMS. This guide covers everything you need to know about managing user accounts in Publisher CMS.

---

## 🔑 Who Can Manage Users?

User management capabilities depend on your role:

| Role | Can Create Users | Can Edit Users | Can Disable Users | Can Delete Users |
|------|:----------------:|:--------------:|:-----------------:|:----------------:|
| **Super Admin** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ❌ |
| **Editor** | ❌ | ❌ | ❌ | ❌ |
| **Viewer** | ❌ | ❌ | ❌ | ❌ |

> 📝 **Note**: Admins can only assign Editor and Viewer roles. Only Super Admins can assign Admin or Super Admin roles.

---

## 📋 Viewing All Users

To see all users in your CMS:

1. Log in to Publisher CMS
2. Navigate to **Settings** in the main navigation
3. Click on **Users** in the settings menu
4. You'll see a list of all users with their:
   - Name and email
   - Assigned role
   - Account status (Active/Disabled)
   - Last login date

### User List Information

| Column | Description |
|--------|-------------|
| **Name** | User's display name |
| **Email** | User's login email address |
| **Role** | Current role assignment |
| **Status** | Active or Disabled |
| **Last Login** | Most recent login timestamp |
| **Created** | Account creation date |

---

## ➕ Creating a New User

### Step-by-Step Process

1. Navigate to **Settings** → **Users**
2. Click the **Add User** button (usually in the top right)
3. Fill in the required information (see below)
4. Click **Create User** to save

### Required Fields

| Field | Description | Requirements |
|-------|-------------|--------------|
| **Email** | User's login email | Valid email address, must be unique |
| **Password** | Initial password | Minimum 8 characters, recommended: mixed case + numbers + symbols |
| **Name** | Display name | User's full name for identification |
| **Role** | Access level | Super Admin, Admin, Editor, or Viewer |

### Optional Fields

| Field | Description |
|-------|-------------|
| **Bio** | Short biography or description |
| **Avatar** | Profile picture from media library |

### Creating a User Example

```
Email:     sarah.johnson@company.com
Password:  [Secure initial password]
Name:      Sarah Johnson
Role:      Editor
```

> 💡 **Tip**: Use a strong initial password and ask the user to change it on first login.

---

## ✏️ Editing User Details

To modify an existing user's information:

1. Navigate to **Settings** → **Users**
2. Click on the user's name or the **Edit** button
3. Update the desired fields
4. Click **Save Changes**

### Editable Information

| Can Edit | Cannot Edit |
|----------|-------------|
| Name | Email (typically) |
| Role | User ID |
| Bio | Created date |
| Avatar | Last login |

> ⚠️ **Note**: Changing a user's role immediately affects their permissions. They may gain or lose access to certain features.

---

## 🔄 Changing User Roles

### When to Change a Role

| Scenario | Action |
|----------|--------|
| Promotion to team lead | Editor → Admin |
| Contractor finished project | Any role → Viewer |
| Temporary access needed | Viewer → Editor |
| Security concern | Any role → Disabled |

### How to Change a Role

1. Navigate to **Settings** → **Users**
2. Click **Edit** on the desired user
3. Select the new role from the dropdown
4. Click **Save Changes**

### Role Change Permissions

| Your Role | Can Assign |
|-----------|------------|
| Super Admin | Super Admin, Admin, Editor, Viewer |
| Admin | Editor, Viewer |

> 🚨 **Important**: Admins cannot assign Admin or Super Admin roles. Contact a Super Admin for these changes.

---

## 🚫 Disabling Users

Disabling a user prevents them from logging in while preserving their account and content history. This is recommended over deletion in most cases.

### When to Disable vs Delete

| Action | Use Case | Data Preservation |
|--------|----------|-------------------|
| **Disable** | Temporary leave, security concern, departed employee | ✅ All data preserved |
| **Delete** | Data cleanup, GDPR request, test accounts | ❌ User data removed |

### How to Disable a User

1. Navigate to **Settings** → **Users**
2. Find the user you want to disable
3. Click **Edit** on the user
4. Change the status to **Disabled**
5. Click **Save Changes**

### What Happens When Disabled

| Effect | Description |
|--------|-------------|
| Login access | ❌ Cannot log in |
| API tokens | ❌ Tokens are invalidated |
| Sessions | ❌ All active sessions terminated |
| Content | ✅ Previously created content remains |
| Attribution | ✅ Content still shows original author |

---

## ♻️ Re-enabling Users

To restore access for a previously disabled user:

1. Navigate to **Settings** → **Users**
2. Find the disabled user (may need to filter by status)
3. Click **Edit**
4. Change status to **Active**
5. Click **Save Changes**

> 📧 **Note**: Consider notifying the user that their access has been restored.

---

## 🔑 Resetting User Passwords

### Option 1: User Self-Reset

Direct users to use the "Forgot Password" link on the login page.

### Option 2: Admin Reset

1. Navigate to **Settings** → **Users**
2. Click **Edit** on the user
3. Click **Reset Password** or enter a new temporary password
4. Communicate the new password securely to the user

### Password Security Notes

| Requirement | Details |
|-------------|---------|
| Minimum length | 8 characters |
| Recommended | 12+ characters with mixed case, numbers, symbols |
| Storage | Passwords are hashed with bcrypt (12 salt rounds) |
| Session security | Sessions expire after 7 days |

> 🔐 **Best Practice**: Never send passwords via email. Use a secure channel or have the user reset their own password.

---

## 🗑️ Deleting Users Permanently

> ⚠️ **Warning**: Deletion is permanent and cannot be undone. Consider disabling instead.

### Who Can Delete Users

| Role | Can Delete |
|------|:----------:|
| Super Admin | ✅ |
| Admin | ❌ |
| Editor | ❌ |
| Viewer | ❌ |

### How to Delete a User

1. Navigate to **Settings** → **Users**
2. Find the user to delete
3. Click **Delete** (may require confirmation)
4. Confirm the deletion when prompted

### Before Deleting, Consider

- [ ] Has the user created important content?
- [ ] Are there audit trail requirements?
- [ ] Should the account be disabled instead?
- [ ] Is this a GDPR/right-to-erasure request?

### What Happens on Deletion

| Data | Action |
|------|--------|
| User account | Permanently removed |
| Login credentials | Deleted |
| API tokens | Revoked |
| Created content | May be reassigned or attributed to "Deleted User" |
| Activity history | May be preserved for audit purposes |

---

## 📊 User Management Best Practices

### 🔒 Security Best Practices

| Practice | Why It Matters |
|----------|----------------|
| **Immediate deactivation** | Disable accounts same-day when employees leave |
| **Strong passwords** | Enforce minimum password requirements |
| **Regular audits** | Review user list quarterly |
| **Least privilege** | Assign minimum necessary role |
| **No shared accounts** | Each user needs their own account |

### 📋 Onboarding Checklist

When adding a new team member:

- [ ] Create account with appropriate role
- [ ] Set strong initial password
- [ ] Send credentials via secure channel
- [ ] Brief user on password change process
- [ ] Explain their role permissions
- [ ] Point to relevant documentation

### 📋 Offboarding Checklist

When a team member leaves:

- [ ] **Immediately** disable their account
- [ ] Reassign any critical content ownership
- [ ] Review API tokens they may have created
- [ ] Document the deactivation for records
- [ ] (Optional) Delete after retention period expires

### 👥 Team Structure Recommendations

| Team Size | Recommended Roles |
|-----------|-------------------|
| 1-5 users | 1 Super Admin, 2-4 Editors |
| 6-15 users | 1 Super Admin, 1-2 Admins, 5-12 Editors |
| 16+ users | 1-2 Super Admins, 2-4 Admins, 10+ Editors, Viewers as needed |

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [User Roles & Permissions](./01-user-roles.md) | Understand role capabilities |
| [Profile Settings](./03-profile-settings.md) | Update your own profile |
| [API Tokens](../API-Integrations/01-api-tokens.md) | Manage API access |
| [Dashboard Overview](../Getting-Started/03-dashboard-overview.md) | Navigate the admin interface |

---

*Previous: [User Roles & Permissions](./01-user-roles.md) • Next: [Profile Settings →](./03-profile-settings.md)*
