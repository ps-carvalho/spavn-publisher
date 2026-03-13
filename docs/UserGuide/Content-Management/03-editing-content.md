---
title: "Editing Content"
description: "Learn how to find, edit, and update existing content entries in Publisher CMS, including understanding timestamps and version behavior."
category: "Content Management"
tags: ["editing", "updating", "content", "timestamps"]
lastUpdated: "2026-02-28"
---

# ✏️ Editing Content

Content management is an ongoing process — articles get updated, authors change bios, and information needs to stay current. This guide covers how to find and edit existing content entries in Publisher CMS.

---

## 🔍 Finding Content to Edit

Before editing, you need to locate the content entry. Publisher offers several ways to find content.

### Browse All Entries

1. Navigate to **Content** in the sidebar
2. Click on the content type (e.g., **Articles**)
3. Scroll through the list of all entries

### Search for Content

1. Open the content type list view
2. Use the **search bar** at the top
3. Enter your search term
4. Results filter in real-time

| Search Scope | What's Searched |
|--------------|-----------------|
| String fields | Title, name, etc. |
| Text fields | Body, description |
| UID fields | Slug |

### Filter Content

Use filters to narrow down results:

| Filter | Options |
|--------|---------|
| **Status** | Draft, Published, All |
| **Date Range** | Created, Updated |
| **Author** | Filter by creator |

### Sort Content

Click any column header to sort:

| Column | Sort Order |
|--------|------------|
| Title | A → Z or Z → A |
| Updated | Newest first or oldest first |
| Status | Grouped by status |

---

## 📝 Opening the Edit Form

Once you've found the content you want to edit:

### From List View

1. Locate the entry in the table
2. Click on the **entry title** or **Edit** button
3. The edit form opens with current values

### From Dashboard

1. Find the content type card on the dashboard
2. Click **View All** to see entries
3. Select the entry to edit

### Quick Actions

Many list views offer quick action buttons:

| Action | Button | Result |
|--------|--------|--------|
| Edit | ✏️ Pencil icon | Opens edit form |
| Duplicate | 📋 Copy icon | Creates a copy |
| Delete | 🗑️ Trash icon | Removes entry |

---

## ✏️ Making Changes

The edit form looks similar to the creation form but comes pre-filled with existing values.

### What You Can Edit

Almost all fields can be modified:

| Field Type | Editable | Notes |
|------------|----------|-------|
| String | ✅ | Including title |
| Text | ✅ | Full content |
| Richtext | ✅ | With formatting |
| UID/Slug | ⚠️ | Caution: changes URLs |
| Relations | ✅ | Add or remove links |
| Media | ✅ | Replace or remove |

> ⚠️ **Warning:** Changing a slug/URL after publishing will break existing links to that content.

### Editing Different Field Types

The process is the same as creating content:

**Text Fields:**
1. Click in the field
2. Modify the text
3. Changes save automatically or on Save button

**Richtext Fields:**
1. Click in the editor
2. Add, remove, or format content
3. Use toolbar for formatting options

**Boolean Fields:**
1. Click the toggle to switch states
2. Change applies immediately

**Date/Datetime Fields:**
1. Click to open the picker
2. Select a new date/time
3. Click outside to close

**Relation Fields:**
1. Click **Add** to add more relations
2. Click **X** to remove existing relations
3. Changes apply on save

---

## 🕐 Understanding Timestamps

Content types with the `timestamps` option enabled automatically track when changes occur.

### Available Timestamps

| Field | When Updated | Visibility |
|-------|--------------|------------|
| `createdAt` | First save only | Read-only |
| `updatedAt` | Every save | Read-only |

### Viewing Timestamps

Timestamps typically appear in two places:

**In the List View:**
- Updated column shows last modification
- Sort by date to find recent changes

**In the Edit Form:**
- Look for a status bar or info panel
- Shows "Created: [date]" and "Updated: [date]"

### What Triggers `updatedAt`

| Action | Updates Timestamp? |
|--------|-------------------|
| Save draft | ✅ Yes |
| Publish | ✅ Yes |
| Unpublish | ✅ Yes |
| Auto-save | ✅ Yes |
| View only | ❌ No |

---

## 🗑️ Soft Delete Behavior

Content types with `softDelete` enabled (like Articles) allow recovery of deleted content.

### How Soft Delete Works

| Stage | What Happens |
|-------|--------------|
| **Delete** | Entry marked with `deletedAt` timestamp |
| **Hidden** | Entry disappears from normal lists |
| **Recoverable** | Admins can restore the entry |
| **Purge** | Permanent deletion requires explicit action |

### Recovering Deleted Content

If you accidentally delete content:

1. Contact your **Administrator**
2. They can access deleted items
3. Restore the entry to its previous state

### Who Can Delete

| Role | Can Delete | Can Recover |
|------|------------|-------------|
| Super Admin | ✅ | ✅ |
| Admin | ✅ | ✅ |
| Editor | Own content only | ❌ |
| Viewer | ❌ | ❌ |

---

## 💾 Saving Changes

### Save Options

| Button | What It Does |
|--------|--------------|
| **Save** | Saves changes, keeps current status |
| **Save as Draft** | Saves and changes status to draft |
| **Publish** | Saves and makes content live |
| **Unpublish** | Saves and reverts to draft |

### Save Confirmation

After saving:

1. A success message appears
2. `updatedAt` timestamp refreshes
3. You remain on the edit form

### Handling Validation Errors

If save fails:

1. Error message appears at top of form
2. Problematic fields are highlighted
3. Fix the issues and try again

**Common Validation Errors:**

| Error | Solution |
|-------|----------|
| Required field empty | Fill in the required field |
| Invalid email format | Use format: name@domain.com |
| Duplicate slug | Choose a unique slug |
| Invalid JSON | Fix syntax in JSON field |

---

## 🔄 Publishing Status Changes

When editing, you can change the publication status:

### Draft → Published

1. Make your edits
2. Click **Publish**
3. Content becomes live in the API

### Published → Draft (Unpublish)

1. Open the published content
2. Click **Unpublish**
3. Content reverts to draft, removed from API

### Staying in Same Status

1. Make your edits
2. Click **Save**
3. Status remains unchanged

---

## 📋 Bulk Editing

For updating multiple entries at once:

### Select Multiple Entries

1. In list view, click checkboxes next to entries
2. Or use **Select All** for the current page
3. Selected count appears at top

### Available Bulk Actions

| Action | What It Does |
|--------|--------------|
| **Publish** | Publishes all selected |
| **Unpublish** | Reverts all to draft |
| **Delete** | Removes all selected |

> ⚠️ **Warning:** Bulk actions cannot be undone easily. Verify your selection before proceeding.

---

## 💡 Tips for Editing Content

> 🔍 **Search first**: Use the search function to quickly find content instead of browsing pages.

> 📝 **Check timestamps**: Review when content was last updated to understand if changes are needed.

> 🔗 **Update relations**: When editing an author, consider if linked articles need updates.

> 🏷️ **Slug caution**: Avoid changing slugs on published content — it breaks existing URLs.

> 👁️ **Preview changes**: If available, use preview to see how edits look before saving.

> 💾 **Save frequently**: Make incremental saves rather than one big save at the end.

> 📋 **Copy before major edits**: Duplicate the entry if making significant changes, so you have a backup.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Content Types Overview](./01-content-types-overview.md) | Understand available content types |
| [Creating Content](./02-creating-content.md) | Create new content entries |
| [Publishing Workflow](./04-publishing-workflow.md) | Draft, publish, and scheduled states |
| [Working with Relations](./05-working-with-relations.md) | Link content together |

---

*Previous: [Creating Content](./02-creating-content.md) | Next: [Publishing Workflow →](./04-publishing-workflow.md)*
