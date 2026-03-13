---
title: "Working with Relations"
description: "Learn how to link content entries together using relations in Publisher CMS, including relation types and best practices."
category: "Content Management"
tags: ["relations", "linking", "connections", "content"]
lastUpdated: "2026-02-28"
---

# 🔗 Working with Relations

Relations allow you to connect content entries together, creating a rich network of related information. This guide explains how relations work and how to use them effectively in Publisher CMS.

---

## 🤔 What Are Relations?

A **relation** is a connection between two content types that allows you to link entries together. Think of it as creating relationships between your data.

### Why Use Relations?

| Benefit | Example |
|---------|---------|
| **Avoid duplication** | Store author info once, link from many articles |
| **Data integrity** | Update author bio in one place |
| **Rich content** | Build complex content structures |
| **Better queries** | Fetch related content efficiently |

### Real-World Example

In Publisher, **Articles** are linked to **Authors** through a relation:

```
┌─────────────┐         ┌─────────────┐
│   Article   │ ──────> │   Author    │
│             │         │             │
│ - title     │         │ - name      │
│ - body      │         │ - email     │
│ - author ───┼────────>│ - bio       │
└─────────────┘         └─────────────┘
```

---

## 📊 Types of Relations

Publisher supports four types of relations:

### One-to-One (1:1)

Each entry relates to exactly one entry of another type.

| Example | Description |
|---------|-------------|
| User → Profile | Each user has exactly one profile |

```
Entry A ←→ Entry B
(One)      (One)
```

### One-to-Many (1:N)

One entry can relate to many entries of another type.

| Example | Description |
|---------|-------------|
| Author → Articles | One author can write many articles |

```
Entry A ←→ Entry B, C, D...
(One)      (Many)
```

### Many-to-One (N:1)

Many entries can relate to one entry (the inverse of one-to-many).

| Example | Description |
|---------|-------------|
| Articles → Category | Many articles can belong to one category |

```
Entry A, B, C... ←→ Entry X
(Many)              (One)
```

### Many-to-Many (N:N)

Many entries can relate to many entries.

| Example | Description |
|---------|-------------|
| Articles ↔ Tags | Articles can have multiple tags; tags can apply to multiple articles |

```
Entry A, B, C... ←→ Entry X, Y, Z...
(Many)              (Many)
```

---

## 🔗 Relations in Publisher

### Article → Author Relation

The most common relation in Publisher connects articles to their authors.

**Relation Type:** Many-to-One (many articles can have one author)

| Content Type | Field | Relates To |
|--------------|-------|------------|
| Article | `author` | Author |

This means:
- Each article can have one author
- Each author can have many articles
- The relation is optional (articles can exist without authors)

---

## 🎯 Using the Relation Picker

The relation picker is the UI component for selecting related content.

### Opening the Picker

1. Navigate to the content edit form
2. Find the relation field (e.g., "Author")
3. Click **Add** or **Select** button
4. A modal/dropdown appears with available entries

### Selecting a Relation

**For Single Relations (one author per article):**

1. Browse or search the list
2. Click on the entry you want
3. The modal closes
4. Selected entry appears in the field

**For Multiple Relations (many-to-many):**

1. Browse or search the list
2. Click entries to select (checkmark appears)
3. Select as many as needed
4. Click **Confirm** or **Done**
5. All selected entries appear in the field

### Searching in the Picker

When the list is long:

| Method | How To |
|--------|--------|
| **Search bar** | Type to filter by name/title |
| **Scroll** | Navigate through pages |
| **Filters** | Use any available filters |

### Removing a Relation

1. Find the relation field
2. Click the **X** next to the entry
3. Or click **Remove** / **Clear** button
4. The relation is removed (content entry not deleted)

---

## 📝 Step-by-Step: Linking Articles to Authors

Here's a complete workflow for connecting articles and authors:

### Step 1: Create the Author

Before linking, you need an author entry:

1. Navigate to **Content** → **Authors**
2. Click **+ Create Entry**
3. Fill in author details:
   - **Name**: "Jane Smith"
   - **Email**: "jane@example.com"
   - **Bio**: "Senior technology writer"
4. Click **Publish**

### Step 2: Create or Edit the Article

1. Navigate to **Content** → **Articles**
2. Create new or edit existing article
3. Fill in article content

### Step 3: Link the Author

1. Find the **Author** relation field
2. Click **Add Author** or the picker button
3. Search for "Jane Smith"
4. Click to select
5. Author appears in the field

### Step 4: Save the Article

1. Complete any remaining fields
2. Click **Save** or **Publish**
3. The relation is now saved

---

## 🔄 Creating Related Content Inline

Some configurations allow creating related content directly from the relation picker:

### How It Works

1. Open the relation picker
2. Click **+ Create New** button
3. A form appears for the related content type
4. Fill in the details
5. Save the new entry
6. It's automatically selected as the relation

### When to Use Inline Creation

| Scenario | Benefit |
|----------|---------|
| New author needed | Create author without leaving article form |
| Quick additions | Add missing entries on the fly |
| Efficiency | Reduces context switching |

> 💡 **Note:** Inline creation may not be available for all relation types. Check your configuration.

---

## 📋 Relation Field Reference

### Visual Indicators

| Element | Meaning |
|---------|---------|
| **Entry card** | Shows related entry's title/name |
| **Thumbnail** | May show image if available |
| **X button** | Remove this relation |
| **Add button** | Open picker to add more |
| **Count badge** | Number of relations (for multiple) |

### Field States

| State | Appearance |
|-------|------------|
| **Empty** | "No entries selected" message |
| **Has entries** | Cards showing selected items |
| **Maximum reached** | Add button disabled |
| **Loading** | Spinner while fetching options |

---

## 🔍 Viewing Relations

### From the Content Entry

When viewing an article, you can see:
- Which author it's linked to
- Click the author name to navigate to that entry

### From the Related Content

When viewing an author, you can see:
- All articles linked to this author
- This is a "reverse" or "inverse" relation

### In the API

Relations are included in API responses:

```json
{
  "id": 1,
  "title": "My Article",
  "author": {
    "id": 5,
    "name": "Jane Smith",
    "email": "jane@example.com"
  }
}
```

---

## ⚠️ Important Considerations

### Deleting Related Content

What happens when you delete content that's linked to others?

| Scenario | Result |
|----------|--------|
| Delete an Author | Articles may lose their author reference |
| Delete an Article | Author remains unaffected |

**Options for handling deletion:**

| Setting | Behavior |
|---------|----------|
| **Set NULL** | Relation field becomes empty |
| **Cascade delete** | Related entries also deleted (rare) |
| **Restrict** | Cannot delete while relations exist |

> ⚠️ **Warning:** Always check what content might be affected before deleting entries with relations.

### Publishing Dependencies

Consider the publishing state of related content:

| Scenario | Recommendation |
|----------|----------------|
| Article is published, Author is draft | Author won't appear in public API |
| Author is published, Article is draft | Neither appears publicly |

> 💡 **Best Practice:** Publish related content together to ensure consistency.

---

## 💡 Best Practices for Relations

> 🎯 **Plan your relations**: Design your content model before creating entries. Know which content types need to connect.

> 📝 **Create related content first**: When possible, create authors, categories, etc. before creating content that links to them.

> 🔗 **Use meaningful relations**: Only create relations that serve a purpose. Don't over-complicate your content model.

> 👁️ **Check both directions**: Remember relations work two ways. An article has an author; an author has articles.

> 📊 **Consider API consumers**: Relations affect how data is returned in the API. Structure them for easy consumption.

> ⚠️ **Mind the publishing state**: Ensure related content is published when you publish the main content.

> 🗑️ **Delete carefully**: Be aware of what else might be affected when deleting related content.

> 📋 **Use inline creation wisely**: While convenient, inline creation can lead to duplicate entries if you're not careful.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Content Types Overview](./01-content-types-overview.md) | Understand content types and fields |
| [Creating Content](./02-creating-content.md) | Create new content entries |
| [Editing Content](./03-editing-content.md) | Modify existing content |
| [Publishing Workflow](./04-publishing-workflow.md) | Manage content states |

---

*Previous: [Publishing Workflow](./04-publishing-workflow.md) | Next: [Media Library →](../Media-Library/)*
