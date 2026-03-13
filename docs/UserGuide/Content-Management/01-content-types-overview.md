---
title: "Content Types Overview"
description: "Understand content types in Publisher CMS, including available types, field types, and configuration options."
category: "Content Management"
tags: ["content types", "fields", "structure", "overview"]
lastUpdated: "2026-02-28"
---

# 📋 Content Types Overview

Content types are the foundation of your CMS — they define the structure and organization of your content. This guide explains what content types are, what's available in your system, and how to work with them effectively.

---

## 🤔 What Are Content Types?

A **content type** is a blueprint that defines the structure of a particular kind of content. Think of it as a template or form that specifies what information should be collected for each entry.

### Why Content Types Matter

| Benefit | Description |
|---------|-------------|
| **Consistency** | Ensures all entries of the same type have the same structure |
| **Validation** | Enforces required fields and data formats |
| **API Generation** | Automatically creates REST API endpoints for each type |
| **Organization** | Keeps related content grouped together |

---

## 📦 Content Types in Your System

Publisher comes with pre-configured content types ready for use:

### 📰 Article

The **Article** content type is designed for blog posts, news articles, and other written content.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | String | ✅ Yes | The headline (max 255 characters) |
| `slug` | UID | Auto | URL-friendly identifier, auto-generated from title |
| `body` | Richtext | No | Full article content with formatting |
| `excerpt` | Text | No | Short summary displayed in listings |

**Content Type Options:**

| Option | Status | What It Does |
|--------|--------|--------------|
| `draftAndPublish` | ✅ Enabled | Allows draft/published workflow |
| `timestamps` | ✅ Enabled | Auto-tracks `createdAt` and `updatedAt` |
| `softDelete` | ✅ Enabled | Deleted items can be recovered |

---

### 👤 Author

The **Author** content type represents content creators and contributors.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | String | ✅ Yes | Author's full name |
| `email` | Email | No | Contact email (must be unique) |
| `bio` | Text | No | Short biography |

**Content Type Options:**

| Option | Status | What It Does |
|--------|--------|--------------|
| `timestamps` | ✅ Enabled | Auto-tracks `createdAt` and `updatedAt` |

---

## 🎨 Understanding Field Types

Publisher supports 14 field types to capture different kinds of data:

### Text & Content Fields

| Type | UI Element | Best For | Example |
|------|------------|----------|---------|
| **string** | Text input | Short text (titles, names) | Article title |
| **text** | Textarea | Long plain text (descriptions) | Author bio |
| **richtext** | Rich text editor | Formatted content (HTML) | Article body |
| **email** | Email input | Email addresses | Author email |

### Numeric & Boolean Fields

| Type | UI Element | Best For | Example |
|------|------------|----------|---------|
| **number** | Number input | Integer values | Read count, order |
| **boolean** | Checkbox/Toggle | True/false options | Featured, active |

### Date & Time Fields

| Type | UI Element | Best For | Example |
|------|------------|----------|---------|
| **date** | Date picker | Date only | Birthday, event date |
| **datetime** | Date-time picker | Date and time | Publish date |

### Special Fields

| Type | UI Element | Best For | Example |
|------|------------|----------|---------|
| **uid** | Auto-generated | URL slugs | `/articles/my-article-title` |
| **media** | Media picker | File references | Article featured image |
| **relation** | Relation picker | Content links | Article → Author |
| **enum** | Dropdown/Select | Predefined options | Status, category |
| **json** | Code editor | Structured data | Metadata, settings |
| **password** | Password input | Secure text | User passwords |

---

## ⚙️ Content Type Options

Options control how content types behave in the system:

### draftAndPublish

Enables a publishing workflow for content entries.

| Behavior | Description |
|----------|-------------|
| **Draft State** | Content is saved but not visible in public API |
| **Published State** | Content is live and accessible via API |
| **Toggle** | Switch between draft and published at any time |

> 💡 **Best For:** Content that needs review before going live, such as articles and blog posts.

---

### timestamps

Automatically tracks when entries are created and modified.

| Field | Auto-populated | Description |
|-------|----------------|-------------|
| `createdAt` | On creation | Timestamp when entry was first saved |
| `updatedAt` | On every save | Timestamp of the most recent modification |

> 💡 **Best For:** All content types — helps track content history and audit changes.

---

### softDelete

Allows deleted content to be recovered instead of permanently removed.

| Behavior | Description |
|----------|-------------|
| **Delete Action** | Marks entry as deleted (sets `deletedAt`) |
| **Recovery** | Admins can restore deleted entries |
| **Permanent Delete** | Requires explicit purge action |

> 💡 **Best For:** Important content where accidental deletion should be recoverable.

---

## 🖥️ Content Types in the Admin UI

When you log into the Publisher admin interface, content types appear in several places:

### Dashboard

The main dashboard displays content types as cards showing:
- Content type name and icon
- Total entry count
- Recent activity indicators

### Sidebar Navigation

Content types are listed under the **Content** section:
- Each content type has its own menu item
- Click to view all entries of that type
- Number of entries shown in parentheses

### List View

For each content type, you'll see:
- Table of all entries
- Search and filter options
- Sort by any column
- Bulk actions (delete, publish, etc.)

### Edit Form

When creating or editing content:
- Fields appear in the order defined
- Required fields are marked with asterisks (*)
- Validation messages appear for invalid input
- Auto-save indicator for drafts

---

## 💡 Tips for Working with Content Types

> 🎯 **Understand your content**: Before creating entries, familiarize yourself with what fields are available and which are required.

> 🔗 **Use relations wisely**: Link related content (like articles to authors) to create a connected content graph.

> 📝 **Fill in excerpts**: Even if optional, excerpts improve how your content appears in listings and search results.

> 🏷️ **Slugs matter**: The UID field creates URL-friendly identifiers — keep titles descriptive for good slugs.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Creating Content](./02-creating-content.md) | Step-by-step guide to creating new content |
| [Editing Content](./03-editing-content.md) | Modifying existing content entries |
| [Publishing Workflow](./04-publishing-workflow.md) | Draft, publish, and scheduled states |
| [Working with Relations](./05-working-with-relations.md) | Linking content together |

---

*Previous: [Dashboard Overview](../Getting-Started/03-dashboard-overview.md) | Next: [Creating Content →](./02-creating-content.md)*
