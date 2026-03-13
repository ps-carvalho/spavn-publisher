---
title: "User Roles & Permissions"
description: "Understand the role-based access control system in Publisher CMS, including permission levels and when to assign each role."
category: "User Management"
tags: ["roles", "permissions", "access-control", "security", "rbac"]
lastUpdated: "2026-02-28"
---

# 🔐 User Roles & Permissions

Publisher CMS uses a **Role-Based Access Control (RBAC)** system to manage user permissions. This ensures that team members have appropriate access levels based on their responsibilities, keeping your content and system secure.

---

## 🎯 Overview of RBAC

Role-Based Access Control assigns permissions to roles, and roles to users. This approach provides:

| Benefit | Description |
|---------|-------------|
| **Security** | Users only access what they need |
| **Simplicity** | Manage permissions by role, not per user |
| **Scalability** | Easy to onboard new team members |
| **Auditability** | Clear accountability for actions |

---

## 👑 Available Roles

Publisher CMS offers four distinct roles, each with specific capabilities:

### 🟣 Super Admin

> **Full system access** — The highest permission level

**Description**: Full access to everything in the CMS, including system configuration, user management, API tokens, and webhooks.

**Capabilities**:
- ✅ Full access to all content types (create, read, update, delete)
- ✅ Manage all users (create, edit, disable, delete)
- ✅ Assign any role to users
- ✅ Configure system settings
- ✅ Create and manage API tokens
- ✅ Set up and manage webhooks
- ✅ Access all administrative functions
- ✅ Manage content types and field definitions

**When to assign**: 
- Technical leads overseeing the CMS
- System administrators
- Founders or CTOs

> ⚠️ **Caution**: Limit Super Admin accounts. Typically, only 1-2 people should have this role.

---

### 🔵 Admin

> **Content & user management** — Team leadership level

**Description**: All content CRUD operations and the ability to manage users.

**Capabilities**:
- ✅ Full access to all content types (create, read, update, delete)
- ✅ Manage users (create, edit, disable)
- ✅ Assign Editor and Viewer roles
- ✅ View all content and media
- ❌ Cannot create API tokens
- ❌ Cannot configure webhooks
- ❌ Cannot modify system settings

**When to assign**:
- Content team leads
- Project managers
- Marketing directors

---

### 🟢 Editor

> **Content creation** — Day-to-day content work

**Description**: Create and edit own entries, read all content.

**Capabilities**:
- ✅ Create new content entries
- ✅ Edit their own content entries
- ✅ Read all content (from all users)
- ✅ Upload and manage their own media
- ❌ Cannot edit others' content
- ❌ Cannot delete content
- ❌ Cannot manage users
- ❌ Cannot access admin settings

**When to assign**:
- Content writers
- Journalists
- Marketing team members
- Freelance contributors

---

### 🟡 Viewer

> **Read-only access** — Observers and stakeholders

**Description**: Read-only access to the CMS.

**Capabilities**:
- ✅ View all published content
- ✅ View all draft content (if permitted)
- ✅ Browse media library
- ❌ Cannot create content
- ❌ Cannot edit content
- ❌ Cannot upload media
- ❌ Cannot manage users

**When to assign**:
- Stakeholders reviewing content
- Clients previewing work
- Auditors
- New team members during onboarding

---

## 📊 Permissions Matrix

Here's a comprehensive breakdown of what each role can do:

| Permission | Super Admin | Admin | Editor | Viewer |
|------------|:-----------:|:-----:|:------:|:------:|
| **Content Management** |
| Create content | ✅ | ✅ | ✅ | ❌ |
| Edit own content | ✅ | ✅ | ✅ | ❌ |
| Edit others' content | ✅ | ✅ | ❌ | ❌ |
| Delete content | ✅ | ✅ | ❌ | ❌ |
| Publish content | ✅ | ✅ | ✅ | ❌ |
| View all content | ✅ | ✅ | ✅ | ✅ |
| **User Management** |
| Create users | ✅ | ✅ | ❌ | ❌ |
| Edit users | ✅ | ✅ | ❌ | ❌ |
| Disable users | ✅ | ✅ | ❌ | ❌ |
| Delete users | ✅ | ❌ | ❌ | ❌ |
| Assign Super Admin role | ✅ | ❌ | ❌ | ❌ |
| Assign Admin role | ✅ | ❌ | ❌ | ❌ |
| Assign Editor role | ✅ | ✅ | ❌ | ❌ |
| Assign Viewer role | ✅ | ✅ | ❌ | ❌ |
| **Media Library** |
| Upload media | ✅ | ✅ | ✅ | ❌ |
| Edit own media | ✅ | ✅ | ✅ | ❌ |
| Delete media | ✅ | ✅ | ❌ | ❌ |
| View all media | ✅ | ✅ | ✅ | ✅ |
| **System & Integrations** |
| Manage API tokens | ✅ | ❌ | ❌ | ❌ |
| Manage webhooks | ✅ | ❌ | ❌ | ❌ |
| Configure settings | ✅ | ❌ | ❌ | ❌ |
| Access audit logs | ✅ | ✅ | ❌ | ❌ |

---

## 📈 Role Hierarchy

Roles follow a hierarchical structure where higher roles inherit capabilities from lower roles:

```
┌─────────────────────────────────────────────┐
│              👑 Super Admin                  │
│  (Full system access + all capabilities)    │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│               🔵 Admin                        │
│  (Content CRUD + User management)           │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│               🟢 Editor                      │
│  (Create/Edit own + Read all)               │
└─────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────┐
│               🟡 Viewer                      │
│  (Read-only access)                         │
└─────────────────────────────────────────────┘
```

---

## 💡 Best Practices for Role Assignment

### 🎯 Principle of Least Privilege

Always assign the **minimum role** needed for a user to perform their job:

| User Type | Recommended Role | Why |
|-----------|------------------|-----|
| Content writer | Editor | Can create and edit own work |
| Content reviewer | Editor or Admin | Depends on if they need to edit others' work |
| Team lead | Admin | Can manage team and all content |
| External auditor | Viewer | Read-only access is sufficient |
| Developer | Super Admin | Needs API and webhook access |

### 🔒 Security Recommendations

> 🔐 **Limit Super Admins**: Only 1-2 people should have Super Admin access.

> 👥 **Use Admin for leadership**: Most team leads only need Admin access.

> 📝 **Default to Editor**: For new content team members, start with Editor role.

> 👁️ **Viewer for stakeholders**: Clients and executives usually only need Viewer access.

> 🔄 **Review periodically**: Audit user roles quarterly to ensure they're still appropriate.

### ⚠️ Common Mistakes to Avoid

| Mistake | Risk | Solution |
|---------|------|----------|
| Giving everyone Super Admin | Security breach, accidental deletions | Assign appropriate roles |
| Never reviewing user access | Orphaned accounts, unnecessary access | Quarterly access reviews |
| Sharing credentials | No accountability, audit trail gaps | Each user has their own account |
| Not disabling departed users | Unauthorized access | Immediate deactivation upon departure |

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Managing Users](./02-managing-users.md) | Create, edit, and disable user accounts |
| [Profile Settings](./03-profile-settings.md) | Update your profile and change password |
| [API Tokens](../API-Integrations/01-api-tokens.md) | Secure API access for applications |
| [Webhooks](../API-Integrations/02-webhooks.md) | Real-time content notifications |

---

*Next: [Managing Users →](./02-managing-users.md)*
