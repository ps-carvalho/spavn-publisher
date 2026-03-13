---
title: "Menu System"
type: feature
date: 2026-03-08T23:03:36.194Z
status: implemented
tags: ["menus", "navigation", "cms", "admin-ui", "api"]
related_files: ["server/utils/publisher/database/schema/postgres.ts", "server/api/v1/menus/[slug].get.ts", "lib/publisher-admin/pages/admin/menus/index.vue", "lib/publisher/types.ts"]
---

# Feature: Menu System

## Overview

The Menu System provides hierarchical navigation management for Publisher CMS. It allows administrators to create multiple customizable menus with nested menu items, supporting internal page links, external URLs, and non-clickable labels. The system includes a visual admin interface for managing menu structure and public APIs for frontend consumption.

Menus use dedicated database tables with an adjacency list pattern for hierarchy, supporting arbitrary depth nesting with efficient tree traversal. Each menu item can link to a CMS page (resolved by ID), an external URL, or serve as a label for grouping child items.

## Architecture

```mermaid
graph TB
    subgraph "Admin Interface"
        A[Menu List Page<br/>/admin/menus] --> B[Menu Builder<br/>/admin/menus/[id]]
        B --> C[MenuItemRenderer]
        B --> D[MenuItemForm]
    end
    
    subgraph "API Layer"
        E[Admin API<br/>/api/publisher/menus] --> F[Menu CRUD]
        E --> G[Item CRUD]
        E --> H[Reorder/Move]
        I[Public API<br/>/api/v1/menus] --> J[Menu Tree]
    end
    
    subgraph "Database"
        K[(publisher_menus)] --> L[id, name, slug<br/>description, location]
        M[(publisher_menu_items)] --> N[id, menu_id, parent_id<br/>sort_order, label, type<br/>url, visible, metadata]
    end
    
    B --> E
    F --> K
    G --> M
    J --> M
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Menu List Page | `lib/publisher-admin/pages/admin/menus/index.vue` | Lists all menus with create/delete actions |
| Menu Builder | `lib/publisher-admin/pages/admin/menus/[id].vue` | Visual menu editor with item management |
| MenuItemForm | `lib/publisher-admin/components/publisher/MenuItemForm.vue` | Form for creating/editing menu items |
| MenuItemRenderer | `lib/publisher-admin/components/publisher/MenuItemRenderer.vue` | Recursive component displaying item tree |
| Menu Types | `lib/publisher/types.ts` | TypeScript definitions for menu system |
| Public API | `server/api/v1/menus/[slug].get.ts` | Returns hierarchical menu tree for frontend |
| Admin APIs | `server/api/publisher/menus/**` | CRUD operations for menus and items |

## Menu Item Types

| Type | Description | Required Fields |
|------|-------------|-----------------|
| **page** | Links to internal CMS page | `pageId` (resolved to URL at runtime) |
| **external** | Links to external URL | `url` (full URL with protocol) |
| **label** | Non-clickable grouping header | None (label only) |

## Database Schema

### publisher_menus
- `id` - Primary key
- `name` - Display name
- `slug` - Unique identifier for API access
- `description` - Optional description
- `location` - Hint for where menu is used (header, footer, sidebar)
- `created_at`, `updated_at` - Timestamps

### publisher_menu_items
- `id` - Primary key
- `menu_id` - Foreign key to menu
- `parent_id` - Self-referential FK for hierarchy (nullable = root)
- `sort_order` - Position among siblings
- `label` - Display text
- `type` - Item type: 'page', 'external', or 'label'
- `url` - URL for external links
- `target` - Link target ('_blank', '_self')
- `icon` - Icon class
- `css_class` - Additional CSS classes
- `visible` - Visibility flag (hidden items excluded from public API)
- `metadata` - JSON field for page ID and custom data
- `created_at`, `updated_at` - Timestamps

## Usage

### Public API - Get Menu Tree

```bash
# Get all menus (basic info)
GET /api/v1/menus

# Get specific menu with full tree
GET /api/v1/menus/main-navigation
```

**Response:**
```json
{
  "data": {
    "id": 1,
    "name": "Main Navigation",
    "slug": "main-navigation",
    "items": [
      {
        "id": 1,
        "label": "Home",
        "type": "page",
        "url": "/",
        "visible": true,
        "children": []
      },
      {
        "id": 2,
        "label": "Products",
        "type": "label",
        "children": [
          {
            "id": 3,
            "label": "Features",
            "type": "page",
            "url": "/features",
            "children": []
          }
        ]
      }
    ]
  }
}
```

### Admin API - Menu CRUD

```bash
# Create menu
POST /api/publisher/menus
{
  "name": "Main Navigation",
  "displayName": "Main Navigation",
  "slug": "main-navigation",
  "location": "header"
}

# Add menu item
POST /api/publisher/menus/1/items
{
  "label": "About Us",
  "type": "page",
  "pageId": 5,
  "visible": true
}

# Batch reorder items
PATCH /api/publisher/menus/1/items/reorder
{
  "items": [
    { "id": 1, "sortOrder": 0 },
    { "id": 2, "sortOrder": 1 }
  ]
}

# Move item to new parent
PATCH /api/publisher/menus/1/items/3/move
{
  "newParentId": 2,
  "newPosition": 0
}
```

## Configuration

No environment configuration required. Menus are stored in the database and managed through the admin UI.

## Limitations

- **No drag-and-drop UI yet** - Items must be reordered via API or position fields
- **No circular reference prevention** - Backend does not validate against circular parent chains
- **No caching** - Menu trees are built on each request (consider adding caching for high-traffic sites)
- **No localization** - Menus do not support multi-language labels

## Related Documentation

- [Menu Hierarchy Pattern](../decisions/2026-03-08-menu-hierarchy-pattern.md) - Technical decision on adjacency list pattern
- [Menu API Flow](../flows/2026-03-08-menu-api-flow.md) - Request flow for menu tree retrieval

## Related Files

- `server/utils/publisher/database/schema/postgres.ts`
- `server/api/v1/menus/[slug].get.ts`
- `lib/publisher-admin/pages/admin/menus/index.vue`
- `lib/publisher/types.ts`
