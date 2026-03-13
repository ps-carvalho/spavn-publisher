---
title: "Publishing Workflow"
description: "Understand the draft and publish workflow in Publisher CMS, including status states, visibility, and content lifecycle management."
category: "Content Management"
tags: ["publishing", "draft", "workflow", "status"]
lastUpdated: "2026-02-28"
---

# 🚀 Publishing Workflow

Publisher CMS provides a built-in publishing workflow that helps you control when and how your content becomes visible to the world. This guide explains the draft/publish system and how to manage your content's lifecycle.

---

## 🎯 Understanding the Workflow

The publishing workflow is controlled by the `draftAndPublish` option enabled on content types like **Articles**. This gives you fine-grained control over content visibility.

### Why Use a Publishing Workflow?

| Benefit | Description |
|---------|-------------|
| **Review Process** | Content can be reviewed before going live |
| **Staged Rollout** | Prepare content in advance, publish when ready |
| **Error Prevention** | Catch mistakes before public visibility |
| **Team Collaboration** | Multiple people can work on drafts simultaneously |

---

## 📊 Content States

Content with `draftAndPublish` enabled can exist in two primary states:

### Draft State

| Aspect | Behavior |
|--------|----------|
| **Visibility** | Only visible in admin interface |
| **API Access** | Not returned in public API calls |
| **Editing** | Can be freely edited |
| **URL** | No public URL assigned |

### Published State

| Aspect | Behavior |
|--------|----------|
| **Visibility** | Live and publicly accessible |
| **API Access** | Returned in API responses |
| **Editing** | Can edit and republish |
| **URL** | Accessible via slug/ID |

---

## 🔄 State Transitions

Content moves between states through specific actions:

```
┌─────────┐                    ┌───────────┐
│  Draft  │ ──── Publish ────> │ Published │
│         │ <─── Unpublish ─── │           │
└─────────┘                    └───────────┘
```

| From | To | Action | Result |
|------|-----|--------|--------|
| Draft | Published | **Publish** | Content goes live |
| Published | Draft | **Unpublish** | Content hidden from API |
| Draft | Draft | **Save** | Changes saved, status unchanged |
| Published | Published | **Save** | Changes saved, remains live |

---

## 📝 Working with Drafts

### Creating a Draft

When you create new content, it starts as a draft:

1. Navigate to your content type
2. Click **+ Create Entry**
3. Fill in the fields
4. Click **Save** or **Save as Draft**
5. Content is saved with draft status

### Identifying Drafts

In the content list view, drafts are clearly marked:

| Indicator | Appearance |
|-----------|------------|
| Status column | Shows "Draft" badge (usually yellow/gray) |
| Filter | Can filter to show only drafts |
| Count | Dashboard shows draft count |

### Editing Drafts

Drafts can be edited freely without affecting any live content:

1. Open the draft from the list
2. Make your changes
3. Save continues to keep it as draft
4. Publish when ready

---

## 🌐 Publishing Content

### When to Publish

Publish content when:
- ✅ All required fields are complete
- ✅ Content has been reviewed
- ✅ You're ready for it to be publicly visible
- ✅ Any linked content (relations) is ready

### How to Publish

**From the Edit Form:**

1. Open your draft content
2. Ensure all fields are complete
3. Click the **Publish** button
4. Confirmation message appears
5. Status changes to "Published"

**From the List View:**

1. Select one or more draft entries
2. Click **Publish** in bulk actions
3. Confirm the action
4. Selected entries become published

### After Publishing

Once published:

| What Happens | Description |
|--------------|-------------|
| **Status Change** | Badge changes to "Published" (green) |
| **API Visibility** | Content appears in API responses |
| **Timestamp** | `publishedAt` is set (if tracked) |
| **URL Active** | Content accessible via its slug |

---

## 🔙 Unpublishing Content

Unpublishing reverts published content back to draft state.

### When to Unpublish

Consider unpublishing when:
- Content is outdated or incorrect
- Temporary removal is needed
- Major revisions are required
- Content should no longer be public

### How to Unpublish

**From the Edit Form:**

1. Open the published content
2. Click **Unpublish** button
3. Confirm the action
4. Content reverts to draft status

**From the List View:**

1. Select one or more published entries
2. Click **Unpublish** in bulk actions
3. Confirm the action
4. Entries revert to draft

### What Happens When Unpublishing

| Effect | Description |
|--------|-------------|
| **API Removal** | Content no longer returned in API |
| **Status Change** | Badge changes to "Draft" |
| **URL Inactive** | Public URL returns 404 |
| **Content Preserved** | All data is retained |

> ⚠️ **Warning:** Unpublishing breaks any public links to the content. Consider the impact before unpublishing.

---

## ⏰ Scheduled Publishing

Some configurations support scheduled publishing — setting content to automatically publish at a future date/time.

### How Scheduled Publishing Works

| Step | Action |
|------|--------|
| 1 | Create your content as draft |
| 2 | Set a future publish date/time |
| 3 | Save the content |
| 4 | System automatically publishes at scheduled time |

### Setting a Schedule

If scheduling is available:

1. Create or edit your content
2. Look for a **Schedule** or **Publish Date** field
3. Set the desired date and time
4. Save the content
5. Status shows "Scheduled" until the time arrives

> 💡 **Note:** Scheduled publishing requires server-side cron jobs or similar mechanisms. Check with your administrator for availability.

---

## 🔌 Visibility in the Public API

Understanding how content states affect API responses:

### Draft Content

```http
GET /api/v1/articles
```

**Response:** Draft entries are **NOT** included

```http
GET /api/v1/articles/{id}
```

**Response:** Returns `404 Not Found` for draft entries

### Published Content

```http
GET /api/v1/articles
```

**Response:** Published entries **ARE** included in the list

```http
GET /api/v1/articles/{id}
```

**Response:** Returns the full entry data

### Admin API Access

Administrators and editors with proper authentication can access draft content through:

- The admin interface
- Authenticated API calls with special parameters

| Parameter | Purpose |
|-----------|---------|
| `_publicationState=preview` | Include drafts in API response |
| Authenticated request | Access based on permissions |

---

## 📋 Status Reference

| Status | Badge Color | API Visible | Editable |
|--------|-------------|-------------|----------|
| **Draft** | Yellow/Gray | ❌ No | ✅ Yes |
| **Published** | Green | ✅ Yes | ✅ Yes |
| **Scheduled** | Blue | ❌ No | ✅ Yes |

---

## 👥 Role Permissions for Publishing

Not all users can publish content:

| Role | Create Draft | Publish | Unpublish |
|------|--------------|---------|-----------|
| **Super Admin** | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ |
| **Editor** | ✅ | ✅ (own) | ✅ (own) |
| **Viewer** | ❌ | ❌ | ❌ |

> 💡 **Note:** Editors can typically only publish/unpublish content they created themselves.

---

## 💡 Tips for the Publishing Workflow

> 📝 **Draft first, publish later**: Create content as drafts and review before publishing.

> 👀 **Preview before publishing**: Use preview features to see how content will appear.

> 🔗 **Check relations**: Ensure related content (like authors) is published before linking.

> 📅 **Plan your schedule**: For time-sensitive content, consider scheduled publishing.

> ⚠️ **Unpublish carefully**: Remember that unpublishing removes content from your live site/app.

> 📊 **Monitor status**: Use the dashboard to track how many drafts vs. published entries you have.

> 🔄 **Republish after edits**: When editing published content, save and verify it remains published.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Content Types Overview](./01-content-types-overview.md) | Understand content type options |
| [Creating Content](./02-creating-content.md) | Create and save new content |
| [Editing Content](./03-editing-content.md) | Modify existing content |
| [Working with Relations](./05-working-with-relations.md) | Link content together |

---

*Previous: [Editing Content](./03-editing-content.md) | Next: [Working with Relations →](./05-working-with-relations.md)*
