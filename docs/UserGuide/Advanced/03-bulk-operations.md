---
title: "Bulk Operations"
description: "Learn how to perform actions on multiple content entries at once in Publisher CMS, including bulk publish, unpublish, delete, and archive operations."
category: "Advanced"
tags: ["bulk", "operations", "publish", "delete", "content", "management"]
lastUpdated: "2026-02-28"
---

# 📦 Bulk Operations

Managing content one entry at a time can be tedious when you have dozens or hundreds of items. Bulk operations let you perform actions on multiple entries simultaneously, saving time and ensuring consistency.

---

## 🤔 What Are Bulk Operations?

Bulk operations allow you to select multiple content entries and perform the same action on all of them at once.

### Available Bulk Actions

| Action | What It Does | Reversible? |
|--------|--------------|-------------|
| **Bulk Publish** | Publishes all selected entries | Yes (unpublish) |
| **Bulk Unpublish** | Changes all selected to draft | Yes (publish) |
| **Bulk Delete** | Removes all selected entries | Varies* |
| **Bulk Archive** | Soft-deletes selected entries | Yes (restore) |

> ℹ️ **Note**: *Delete reversibility depends on whether soft delete is enabled for the content type.

### When to Use Bulk Operations

| Scenario | Recommended Action |
|----------|-------------------|
| Publish 50 new articles at once | Bulk Publish |
| Take down a series of outdated posts | Bulk Unpublish |
| Remove test content before launch | Bulk Delete |
| Clean up old draft entries | Bulk Archive/Delete |

---

## ✅ Selecting Multiple Entries

Before performing bulk operations, you need to select the entries to act on.

### Selection Methods

| Method | How To | Best For |
|--------|--------|----------|
| **Individual Checkboxes** | Click checkbox next to each entry | Small, specific selections |
| **Select All (Page)** | Click checkbox in header row | All entries on current page |
| **Select All (All Pages)** | Look for "Select all X entries" option | All entries in filtered set |

### Step-by-Step: Selecting Entries

1. **Navigate to Content List**
   
   Go to **Content** → Select your content type

2. **Enter Selection Mode**
   
   Click the checkbox in the header row or next to individual entries

3. **Select Entries**
   
   | Selection Type | Action |
   |----------------|--------|
   | Individual | Click checkbox next to each entry |
   | Page select | Click header checkbox to select all visible |
   | All pages | If available, click "Select all X entries" link |

4. **View Selection Count**
   
   The number of selected entries appears at the top of the list

### Selection Tips

> 💡 **Tip**: Use filters first to narrow down your list, then use "Select All" to grab all matching entries.

> 🔍 **Tip**: The selection count helps you verify you've selected the right entries before proceeding.

### Selection with Filters

Combine filtering with bulk operations:

1. Apply filters to narrow results (e.g., `status=draft`)
2. Use "Select All" to select all filtered entries
3. Perform bulk action on the filtered selection

| Filter | Use Case for Bulk Action |
|--------|-------------------------|
| `status=draft` | Bulk publish all drafts |
| `createdAt` range | Delete content from a specific period |
| `author` filter | Unpublish content by a specific author |

---

## 📤 Bulk Publish

Publish multiple draft entries at once to make them live.

### When to Bulk Publish

- Launching a new section with multiple articles
- Publishing scheduled content in batches
- Making draft content available after review

### Step-by-Step: Bulk Publish

1. **Select Draft Entries**
   
   - Navigate to your content type
   - Filter by `status=draft` (optional but recommended)
   - Select entries to publish

2. **Open Bulk Actions Menu**
   
   Look for a **Bulk Actions** dropdown or button after selecting entries

3. **Choose "Publish"**
   
   Select **Publish** from the available actions

4. **Review Selection**
   
   A confirmation dialog shows:
   - Number of entries to be published
   - List of entry titles (if shown)

5. **Confirm the Action**
   
   Click **Confirm** or **Publish** to proceed

6. **Verify Results**
   
   - Success message appears
   - Entries now show "Published" status
   - Content is available via API

### Bulk Publish Confirmation

```
┌─────────────────────────────────────┐
│  Publish Selected Entries?          │
│                                     │
│  You are about to publish 25 entries│
│                                     │
│  This will make them live in the API│
│                                     │
│  [Cancel]         [Publish 25]      │
└─────────────────────────────────────┘
```

---

## 📥 Bulk Unpublish

Change multiple published entries back to draft status.

### When to Bulk Unpublish

- Temporarily removing a category of content
- Taking down outdated content for review
- Preparing content for major updates

### Step-by-Step: Bulk Unpublish

1. **Select Published Entries**
   
   - Navigate to your content type
   - Filter by `status=published`
   - Select entries to unpublish

2. **Choose "Unpublish" Action**
   
   Select **Unpublish** from bulk actions

3. **Review and Confirm**
   
   Verify the count and confirm the action

4. **Verify Results**
   
   - Entries now show "Draft" status
   - Content is no longer available via API

### Effects of Unpublishing

| Effect | Description |
|--------|-------------|
| API visibility | Content removed from public API |
| Admin visibility | Content remains visible as draft |
| Editability | Can still edit and republish |
| URLs | May return 404 if accessed |
| Search | Removed from search results |

---

## 🗑️ Bulk Delete

Remove multiple entries permanently (or soft-delete if enabled).

### ⚠️ Warning About Bulk Delete

> ⚠️ **Warning**: Bulk delete is a destructive operation. Depending on your content type settings, this may be permanent. Always verify your selection before confirming.

### Soft Delete vs. Hard Delete

| Delete Type | Behavior | Recoverable? |
|-------------|----------|--------------|
| **Soft Delete** | Entries marked with `deletedAt` | ✅ Yes, by admins |
| **Hard Delete** | Entries permanently removed | ❌ No |

### Step-by-Step: Bulk Delete

1. **Select Entries to Delete**
   
   - Navigate to your content type
   - Select entries (consider filtering first)

2. **Choose "Delete" Action**
   
   Select **Delete** from bulk actions

3. **Review Warning**
   
   The confirmation dialog will show:
   - Number of entries to delete
   - Warning about irreversibility
   - Soft delete indicator if applicable

4. **Confirm the Action**
   
   Type confirmation if required, or click **Delete**

5. **Verify Deletion**
   
   - Entries disappear from the list
   - Success message appears

### Bulk Delete Confirmation

```
┌─────────────────────────────────────┐
│  ⚠️ Delete Selected Entries?        │
│                                     │
│  You are about to delete 10 entries │
│                                     │
│  This action will soft-delete these │
│  entries. They can be restored by   │
│  an administrator.                  │
│                                     │
│  [Cancel]           [Delete 10]     │
└─────────────────────────────────────┘
```

### Who Can Bulk Delete

| Role | Can Bulk Delete | Can Recover |
|------|-----------------|-------------|
| Super Admin | ✅ Yes | ✅ Yes |
| Admin | ✅ Yes | ✅ Yes |
| Editor | Own content only | ❌ No |
| Viewer | ❌ No | ❌ No |

---

## 📁 Bulk Archive

If your content type has soft delete enabled, archiving is available.

### What Archive Does

| Stage | What Happens |
|-------|--------------|
| **Archive** | Entry marked with `deletedAt` timestamp |
| **Hidden** | Entry disappears from normal lists |
| **Recoverable** | Admins can restore the entry |
| **Accessible** | Entry still exists in database |

### Step-by-Step: Bulk Archive

1. **Select entries to archive**
2. **Choose "Archive" from bulk actions**
3. **Confirm the action**
4. **Entries are soft-deleted but recoverable**

### Recovering Archived Content

If you need to restore archived entries:

1. **Contact an Administrator**
   
   Only admins can access and restore archived content

2. **Admin Recovery Process**
   
   - Access the content type's archive/deleted items view
   - Select entries to restore
   - Click **Restore** to bring them back

3. **Verify Restoration**
   
   - Entries reappear in the main list
   - All data is preserved

---

## 🔄 Complete Bulk Operation Flow

Here's the complete workflow for any bulk operation:

```
┌──────────────────────┐
│   Navigate to        │
│   Content Type       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   (Optional) Apply   │
│   Filters            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Select Entries     │
│   (checkboxes)       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Open Bulk Actions  │
│   Menu               │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Choose Action      │
│   (Publish/Delete/...)│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Review Selection   │
│   & Confirm          │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   Verify Results     │
│   (Success Message)  │
└──────────────────────┘
```

---

## ⏪ Undo Considerations

### What Can Be Undone

| Action | Undo Method | Difficulty |
|--------|-------------|------------|
| **Publish** | Bulk unpublish | Easy |
| **Unpublish** | Bulk publish | Easy |
| **Soft Delete** | Admin restore | Medium |
| **Hard Delete** | From backup only | Difficult |

### Best Practices for Safe Operations

> 💾 **Backup first**: For large deletions, export content before deleting.

> 🔍 **Verify selection**: Double-check the count before confirming.

> 📝 **Document changes**: Keep a log of bulk operations for reference.

> 🧪 **Test with small batches**: Try with 5-10 entries first.

### Recovery Options

| Situation | Recovery Method |
|-----------|-----------------|
| Accidentally unpublished | Bulk publish again |
| Accidentally soft-deleted | Admin restore |
| Accidentally hard-deleted | Restore from backup |
| Wrong entries selected | Contact admin immediately |

---

## 👥 Role Requirements

Different roles have different bulk operation capabilities:

### Permission Matrix

| Role | Bulk Publish | Bulk Unpublish | Bulk Delete | Bulk Archive |
|------|--------------|----------------|-------------|--------------|
| **Super Admin** | ✅ All | ✅ All | ✅ All | ✅ All |
| **Admin** | ✅ All | ✅ All | ✅ All | ✅ All |
| **Editor** | ✅ Own | ✅ Own | ✅ Own only | ✅ Own |
| **Viewer** | ❌ No | ❌ No | ❌ No | ❌ No |

### Editor Limitations

Editors can typically only perform bulk operations on content they created:

- Can bulk publish own drafts
- Can bulk unpublish own published content
- Can bulk delete own entries only
- Cannot affect others' content

---

## ⚡ Performance Considerations

Bulk operations process multiple entries and may impact performance.

### Impact Factors

| Factor | Performance Impact |
|--------|-------------------|
| **Number of entries** | More entries = longer processing |
| **Content size** | Large content fields = more processing |
| **Relations** | Updating relations adds overhead |
| **Webhooks** | Each entry may trigger webhooks |

### Recommended Batch Sizes

| Operation | Recommended Max | Reason |
|-----------|-----------------|--------|
| Publish/Unpublish | 100 entries | Minimal processing |
| Delete | 50 entries | Database intensive |
| Archive | 100 entries | Light operation |

### Performance Tips

> ⏱️ **Off-peak operations**: Run large bulk operations during low-traffic periods.

> 📊 **Batch processing**: For 500+ entries, consider doing 100 at a time.

> 🔔 **Webhook awareness**: Bulk operations may trigger many webhook calls.

> 📈 **Monitor performance**: Watch for timeouts on large operations.

---

## 🛠️ Troubleshooting

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| **"Select all" not available** | Too many entries | Use filters to narrow down |
| **Bulk action button disabled** | No entries selected | Select at least one entry |
| **Operation timed out** | Too many entries | Process in smaller batches |
| **Some entries not updated** | Permission issue | Check role permissions |
| **"Cannot delete" error** | Relation constraints | Remove relations first |

### Error Messages

| Error | Meaning | Action |
|-------|---------|--------|
| `403 Forbidden` | Insufficient permissions | Contact admin for access |
| `409 Conflict` | Relation prevents action | Resolve relation constraints |
| `500 Server Error` | Processing failure | Try smaller batch size |
| `408 Timeout` | Operation took too long | Reduce batch size |

### Partial Failures

Sometimes bulk operations partially succeed:

```
┌─────────────────────────────────────┐
│  Bulk Operation Results             │
│                                     │
│  ✅ 45 entries published            │
│  ❌ 5 entries failed                │
│                                     │
│  Failed entries:                    │
│  - "Article Title" (validation)     │
│  - "Another Title" (permission)     │
│                                     │
│  [View Details]    [Close]          │
└─────────────────────────────────────┘
```

> 🔍 **Tip**: Always review failure details to understand what went wrong and fix issues before retrying.

---

## 📋 Bulk Operations Checklist

Before performing bulk operations:

| Step | Check |
|------|-------|
| ☐ | Correct content type selected |
| ☐ | Filters applied (if needed) |
| ☐ | Right entries selected (verify count) |
| ☐ | Correct action chosen |
| ☐ | Permissions verified |
| ☐ | Backup created (for deletions) |
| ☐ | Off-peak time selected (for large operations) |

---

## 💡 Best Practices

> 🧪 **Start small**: Test bulk operations with a few entries first.

> 🔍 **Use filters wisely**: Filter before selecting to target the right entries.

> 📊 **Check the count**: Always verify how many entries are selected.

> 💾 **Backup before delete**: Export content before bulk deletions.

> ⏱️ **Time it right**: Large operations during off-peak hours.

> 📝 **Document everything**: Keep a log of bulk operations performed.

> 🔔 **Consider webhooks**: Bulk actions may trigger many notifications.

> 👥 **Communicate changes**: Inform team members before major bulk operations.

> 🔄 **Verify results**: Check a sample of entries after the operation.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Search & Filters](./01-search-filters.md) | Filter content before bulk operations |
| [Export & Import](./02-export-import.md) | Backup content before bulk deletions |
| [Publishing Workflow](../Content-Management/04-publishing-workflow.md) | Understanding publish states |
| [User Roles](../User-Management/01-user-roles.md) | Permission requirements |

---

*Previous: [Export & Import](./02-export-import.md)*
