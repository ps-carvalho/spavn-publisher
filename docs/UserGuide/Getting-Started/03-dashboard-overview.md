---
title: "Dashboard Overview"
description: "Get familiar with the Publisher CMS dashboard, including sidebar navigation, topbar elements, and content overview widgets."
category: "Getting Started"
tags: ["dashboard", "navigation", "interface", "ui"]
lastUpdated: "2026-02-28"
---

# 🏠 Dashboard Overview

The dashboard is your home base in Publisher CMS. This guide explains the layout, navigation elements, and how to find what you need quickly.

---

## 🖥️ Dashboard Layout

The Publisher admin interface consists of three main areas:

```
┌──────────────────────────────────────────────────────────────────┐
│  ██████████████████████████  TOPBAR  ████████████████████████████│
├──────────────┬───────────────────────────────────────────────────┤
│              │                                                   │
│              │                                                   │
│   SIDEBAR    │              MAIN CONTENT                         │
│              │                                                   │
│              │                                                   │
│              │                                                   │
│              │                                                   │
└──────────────┴───────────────────────────────────────────────────┘
```

| Area | Purpose |
|------|---------|
| **Topbar** | Search, notifications, user menu |
| **Sidebar** | Primary navigation between sections |
| **Main Content** | The active page content and widgets |

---

## 📱 Sidebar Navigation

The sidebar provides access to all major sections of Publisher. It's organized into logical groups for easy navigation.

### Sidebar Structure

```
┌─────────────────┐
│  🏠 Dashboard   │  ← Home / Overview
├─────────────────┤
│  CONTENT        │
│  📝 Articles    │  ← Content Types
│  📄 Pages       │
│  📰 News        │
├─────────────────┤
│  🖼️ Media      │  ← Media Library
├─────────────────┤
│  👥 Users       │  ← User Management
├─────────────────┤
│  SETTINGS       │
│  ⚙️ General     │  ← Configuration
│  🔑 API Tokens  │
│  🔔 Webhooks    │
└─────────────────┘
```

### Navigation Sections

#### 🏠 Dashboard

| Element | Description |
|---------|-------------|
| Dashboard link | Returns to the home overview |
| Shortcut | Press `G` then `D` (if keyboard shortcuts enabled) |

#### 📝 Content Types

Your content types appear in this section. Each content type you create gets its own menu item:

| Action | How To |
|--------|--------|
| View all entries | Click the content type name |
| Create new entry | Click the `+` button next to the content type |
| Search entries | Use the topbar search within a content type |

> 💡 **Tip**: Content types are defined by your administrator. Common examples include Articles, Blog Posts, Pages, Products, and Events.

#### 🖼️ Media Library

Access all your uploaded files and images:

| Feature | Description |
|---------|-------------|
| Upload | Drag-and-drop or click to upload |
| Browse | View all media in grid or list view |
| Search | Find files by name or metadata |
| Organize | Create folders to organize assets |

#### 👥 Users (Admin Only)

Manage team members and their access:

| Feature | Description |
|---------|-------------|
| User list | View all users in the system |
| Add user | Invite new team members |
| Edit roles | Change user permissions |
| Deactivate | Disable user access |

#### ⚙️ Settings (Admin Only)

System configuration options:

| Setting | Description |
|---------|-------------|
| General | Site name, timezone, language settings |
| Content Types | Define and configure content structures |
| API Tokens | Generate tokens for external access |
| Webhooks | Set up event notifications |

---

## 🔝 Topbar Elements

The topbar runs across the top of the screen and provides quick access to common functions.

### Topbar Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  📖 Publisher    [🔍 Search...]          🔔  👤 John Doe ▾       │
└──────────────────────────────────────────────────────────────────┘
```

### Topbar Components

| Component | Icon | Description |
|-----------|------|-------------|
| **Logo** | 📖 | Click to return to dashboard |
| **Search** | 🔍 | Global search across content and media |
| **Notifications** | 🔔 | System alerts and activity updates |
| **User Menu** | 👤 | Profile, settings, and logout |

### Global Search

The search bar lets you find content quickly:

| Search Scope | Examples |
|--------------|----------|
| Content entries | Article titles, page names |
| Media files | Image names, file names |
| Users | Email addresses, names (admin only) |

**Search Tips:**
- Start typing to see instant results
- Press `Enter` for full search results
- Use quotes for exact phrases: `"my article title"`

### User Menu

Click your name or avatar to access:

| Option | Description |
|--------|-------------|
| **My Profile** | Edit your name, email, and avatar |
| **Preferences** | Language, timezone, notification settings |
| **Sign Out** | Log out of the system |

---

## 📊 Content Overview Widgets

The dashboard homepage displays widgets giving you a quick overview of your content and activity.

### Typical Dashboard Widgets

#### 📈 Content Statistics

| Metric | Description |
|--------|-------------|
| Total Entries | Count of all content across types |
| Published | Number of live content entries |
| Drafts | Content waiting to be published |
| Recent Updates | Entries modified in the last 7 days |

#### 📝 Recent Content

Shows the latest content entries across all types:

| Column | Description |
|--------|-------------|
| Title | Entry name/title |
| Type | Content type (Article, Page, etc.) |
| Status | Published, Draft, or Archived |
| Updated | When it was last modified |
| Author | Who made the last change |

#### 🖼️ Recent Media

Quick access to recently uploaded files:

| Info Shown | Description |
|------------|-------------|
| Thumbnail | Preview of the image |
| Filename | Original file name |
| Uploaded | Upload date and time |

#### 📅 Activity Feed

A chronological list of recent actions:

| Activity Type | Description |
|---------------|-------------|
| Content Created | New entries added |
| Content Updated | Existing entries modified |
| Content Published | Drafts moved to published |
| Media Uploaded | New files added |
| User Changes | User management actions (admin view) |

---

## ⚡ Quick Actions

The dashboard provides shortcuts to common tasks:

### Available Quick Actions

| Action | Button | Shortcut |
|--------|--------|----------|
| New Article | `+ New Article` | `N` then `A` |
| Upload Media | `+ Upload` | `U` |
| View All Content | `Browse Content` | `G` then `C` |

### Creating New Content

1. **From Dashboard**: Click the `+` button next to any content type in the sidebar
2. **From Content List**: Navigate to a content type and click "Create New"
3. **Keyboard Shortcut**: Press `N` to open the new content dialog

---

## 🎯 Finding Your Way Around

### Navigation Patterns

| Goal | Path |
|------|------|
| Create a new article | Sidebar → Articles → `+` button |
| Edit existing content | Sidebar → Content Type → Click entry title |
| Upload an image | Sidebar → Media → Upload button |
| View all users | Sidebar → Users |
| Change settings | Sidebar → Settings → [Setting Category] |
| Search for content | Topbar → Search → Type query |

### Breadcrumbs

Most pages include breadcrumb navigation at the top:

```
Dashboard > Articles > My Article Title
```

Click any breadcrumb segment to navigate back to that level.

---

## ⌨️ Keyboard Shortcuts

Power users can navigate quickly with keyboard shortcuts:

| Shortcut | Action |
|----------|--------|
| `G` then `D` | Go to Dashboard |
| `G` then `M` | Go to Media |
| `G` then `U` | Go to Users |
| `N` | New content (opens type selector) |
| `/` | Focus search bar |
| `?` | Show keyboard shortcuts help |
| `Esc` | Close dialogs/modals |

> 💡 **Tip**: Press `?` anywhere in the admin to see all available keyboard shortcuts.

---

## 🎨 Interface Themes

Publisher supports different themes for user preference:

| Theme | Description |
|-------|-------------|
| **Light** | Default bright theme |
| **Dark** | Dark background, easier on eyes in low light |
| **System** | Automatically matches your OS setting |

Change your theme in: **User Menu → Preferences → Appearance**

---

## 💡 Tips for Efficient Navigation

> 🖱️ **Use the sidebar**: Keep it expanded for quick access to all sections. Collapse it if you need more screen space for content.

> ⌨️ **Learn shortcuts**: Keyboard shortcuts can dramatically speed up your workflow.

> 🔍 **Search first**: Before browsing through lists, try the global search — it's often faster.

> 📌 **Bookmark frequently used content**: Your browser's bookmarks work great for deep-linking to specific content entries you edit often.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Introduction](./01-introduction.md) | Overview of Publisher CMS |
| [Accessing the CMS](./02-accessing-cms.md) | Login and authentication |
| [Content Management](../Content-Management/) | Creating and editing content |
| [Media Library](../Media-Library/) | Managing images and files |

---

*Previous: [Accessing the CMS ←](./02-accessing-cms.md) | Next: [Content Management →](../Content-Management/)*
