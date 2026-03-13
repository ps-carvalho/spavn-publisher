---
title: "Menu Edit Page"
type: feature
date: 2026-03-09T23:47:23.876Z
status: implemented
tags: []
related_files: ["lib/publisher-admin/pages/admin/menus/[id].vue", "lib/publisher-admin/components/publisher/MenuItemRenderer.vue", "lib/publisher-admin/components/publisher/MenuItemForm.vue", "lib/publisher-admin/pages/admin/menus/index.vue"]
---

# Feature: Menu Edit Page

## Overview

The Menu Edit Page provides a comprehensive visual interface for managing menu items within Publisher CMS. Located at `/admin/menus/[id]`, this page allows administrators to view menu details, create and edit menu items, manage hierarchical structures with unlimited nesting depth, and reorder items through drag-and-drop interactions.

The page addresses a critical UX gap in the menu management workflow, providing an intuitive interface for building complex navigation structures without requiring API knowledge or database access.

## Architecture

```mermaid
graph TD
    subgraph "Menu Edit Page"
        A[Page Container<br/>/admin/menus/[id]] --> B[Menu Header]
        A --> C[Actions Bar]
        A --> D[Menu Items List]
        A --> E[Modals]
        
        B --> B1[Menu Name]
        B --> B2[Location Badge]
        B --> B3[Metadata]
        
        D --> F[MenuItemRenderer<br/>Recursive Component]
        F --> F1[Item Row]
        F --> F2[Children Container]
        F2 --> F
        
        E --> G[MenuItemForm Modal]
        E --> H[Delete Confirmation]
        
        G --> G1[Type Selection]
        G --> G2[Dynamic Fields]
        G --> G3[Validation]
    end
    
    subgraph "API Layer"
        I[GET /api/publisher/menus/:id] --> J[Menu Data]
        K[POST/PUT/DELETE<br/>/items/:itemId] --> L[CRUD Operations]
        M[PATCH /items/reorder] --> N[Batch Reorder]
    end
    
    subgraph "State Management"
        O[menuData] --> P[Computed: menu]
        O --> Q[Computed: menuItems]
        R[isFormOpen] --> S[Form Modal State]
        T[editingItem] --> U[Edit vs Create Mode]
    end
    
    A --> I
    A --> K
    A --> M
```

## Key Components

| Component | File | Purpose |
|-----------|------|---------|
| Menu Edit Page | `lib/publisher-admin/pages/admin/menus/[id].vue` | Main page container, state management, API coordination |
| MenuItemRenderer | `lib/publisher-admin/components/publisher/MenuItemRenderer.vue` | Recursive component for displaying hierarchical item tree |
| MenuItemForm | `lib/publisher-admin/components/publisher/MenuItemForm.vue` | Form modal for creating and editing menu items |

## Component Details

### Menu Edit Page (`[id].vue`)

The main page component manages the complete menu editing workflow:

**State Management:**
- `menuData` - Fetched menu object with nested items
- `isFormOpen` - Controls form modal visibility
- `showDeleteModal` - Controls delete confirmation modal
- `editingItem` - Currently editing item (null = create mode)
- `parentItemForNew` - Parent for new child items
- `deleteTarget` - Item queued for deletion
- `isSubmitting` - Loading state for async operations

**CRUD Operations:**
- `handleFormSubmit()` - Creates or updates items based on `editingItem` state
- `deleteItem()` - Deletes item and all children
- `handleReorder()` - Batch reorders items via PATCH endpoint

**Helper Functions:**
- `findItemById()` - Recursive search for items in nested structure
- `getLocationClass()` - Returns CSS classes for location badges

### MenuItemRenderer

Recursive component that renders menu items with their children:

**Features:**
- Visual indentation based on depth (2rem per level)
- Expand/collapse toggle for items with children
- Type badge with color coding (page=blue, external=green, label=gray)
- Hover-activated action buttons (Edit, Add Child, Delete)
- Drag handle for reordering
- Visibility indicator for hidden items
- URL preview for linked items

**Events:**
- `edit` - Opens form modal for editing
- `delete` - Opens delete confirmation
- `add-child` - Opens form modal for creating child item
- `reorder` - Emitted when item position changes

### MenuItemForm

Form component for creating and editing menu items:

**Menu Item Types:**
| Type | Description | Required Fields |
|------|-------------|-----------------|
| **Internal Page** | Links to CMS page | Page selection |
| **External URL** | Links to external site | Valid URL |
| **Label** | Non-clickable header | None |

**Form Fields:**
- Type selector (radio group)
- Label (text input, required)
- Page selector (type=page, searchable dropdown)
- URL input (type=external, validated)
- Target selector (`_self` or `_blank`)
- Icon input (with live preview)
- CSS Class input
- Visibility toggle

**Validation:**
- Zod schema validation
- Type-specific required fields
- URL format validation for external links
- Real-time error display

## Usage

### Accessing the Page

1. Navigate to **Admin → Menus** from the sidebar
2. Click on a menu name or the edit button
3. The Menu Edit Page loads at `/admin/menus/[id]`

### Creating Menu Items

1. Click **"Add Menu Item"** button in the actions bar
2. Select item type:
   - **Internal Page**: Choose from existing CMS pages
   - **External URL**: Enter full URL (https://...)
   - **Label**: Create a non-clickable heading
3. Fill in the label and optional fields
4. Click **"Create Item"**

### Creating Nested Items

1. Hover over the parent item
2. Click the **+** (Add Child) button
3. The form opens with "Add Child to [Parent Name]" title
4. Fill in the form and submit
5. The new item appears nested under the parent

### Editing Items

1. Hover over the item to edit
2. Click the pencil (Edit) button
3. Modify fields in the form modal
4. Click **"Update Item"**

### Reordering Items

1. Drag items using the drag handle (6-dot icon)
2. Drop in the desired position
3. The system automatically batches and sends reorder API call
4. Visual feedback confirms successful reorder

### Deleting Items

1. Hover over the item to delete
2. Click the trash (Delete) button
3. Review the confirmation modal:
   - If item has children, warning displays child count
   - All children are deleted with parent
4. Click **"Delete Item"** to confirm

### Managing Visibility

- Toggle the **Visible** switch in the form
- Hidden items display an eye-slash icon in the list
- Hidden items are excluded from public API responses

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/publisher/menus/:id` | Fetch menu with full item tree |
| `POST` | `/api/publisher/menus/:id/items` | Create new menu item |
| `PUT` | `/api/publisher/menus/:id/items/:itemId` | Update existing item |
| `DELETE` | `/api/publisher/menus/:id/items/:itemId` | Delete item and children |
| `PATCH` | `/api/publisher/menus/:id/items/reorder` | Batch reorder items |

### Reorder Payload

```json
{
  "items": [
    { "id": 1, "sortOrder": 0 },
    { "id": 2, "sortOrder": 1 },
    { "id": 3, "sortOrder": 2 }
  ]
}
```

## User Interface

### Header Section
- **Menu name** with location badge (header/footer/sidebar/main)
- **Description** (if provided)
- **Metadata**: Slug and item count
- **Back button** to return to menu list

### Actions Bar
- Instructional text
- **Add Menu Item** primary button

### Menu Items List
- Bordered container with white background
- Items rendered recursively with visual hierarchy
- Empty state with call-to-action when no items exist

### Modals

**Form Modal:**
- Dynamic title: "Add Menu Item", "Edit Menu Item", or "Add Child to [Name]"
- Type-aware field display
- Form validation with inline errors
- Cancel and Submit actions

**Delete Modal:**
- Warning icon and item name
- Alert if children will be deleted
- Cancel and Delete actions

## Limitations

- **No real-time collaborative editing** - Concurrent edits may overwrite each other
- **No undo/redo** - Delete operations are permanent
- **Drag handle only** - Full drag-and-drop with visual feedback not yet implemented
- **No bulk operations** - Items must be deleted individually
- **No import/export** - Cannot transfer menu structures between menus

## Related Documentation

- [Menu System](./2026-03-08-menu-system.md) - General menu architecture and API reference
- [Menu Hierarchy Pattern](../decisions/2026-03-08-menu-hierarchy-pattern.md) - Database design decisions
- [Menu API Flow](../flows/2026-03-08-menu-api-request-flow.md) - Request flow for menu operations

## Related Files

- `lib/publisher-admin/pages/admin/menus/[id].vue`
- `lib/publisher-admin/components/publisher/MenuItemRenderer.vue`
- `lib/publisher-admin/components/publisher/MenuItemForm.vue`
- `lib/publisher-admin/pages/admin/menus/index.vue`

## Related Files

- `lib/publisher-admin/pages/admin/menus/[id].vue`
- `lib/publisher-admin/components/publisher/MenuItemRenderer.vue`
- `lib/publisher-admin/components/publisher/MenuItemForm.vue`
- `lib/publisher-admin/pages/admin/menus/index.vue`
