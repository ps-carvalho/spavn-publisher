---
title: "Creating Content"
description: "Step-by-step guide to creating new content entries in Publisher CMS, covering all field types and best practices."
category: "Content Management"
tags: ["creating", "content", "fields", "tutorial"]
lastUpdated: "2026-02-28"
---

# ✏️ Creating Content

This guide walks you through creating new content entries in Publisher CMS. You'll learn how to navigate the interface, fill in different field types, and save your work.

---

## 🚀 Quick Start

Creating content in Publisher follows a simple pattern:

1. **Navigate** to the content type
2. **Click** the "Create" button
3. **Fill in** the fields
4. **Save** as draft or publish

---

## 📋 Step-by-Step: Creating an Article

Let's walk through creating an Article entry — the process is similar for all content types.

### Step 1: Navigate to the Content Type

1. Log into the Publisher admin interface
2. In the sidebar, click **Content** to expand the menu
3. Click on **Articles** (or your desired content type)
4. You'll see the list view showing existing entries

### Step 2: Start Creating

1. Click the **+ Create Entry** button (usually in the top-right corner)
2. The content creation form opens with all available fields

### Step 3: Fill in Required Fields

Required fields are marked with an asterisk (*). For Articles:

| Field | What to Enter |
|-------|---------------|
| **Title** \* | Enter a descriptive headline (max 255 characters) |
| **Slug** | Auto-generated from title — you can customize it |

### Step 4: Fill in Optional Fields

| Field | What to Enter |
|-------|---------------|
| **Body** | Full article content using the rich text editor |
| **Excerpt** | A brief summary (shown in listings) |

### Step 5: Save Your Content

Choose how to save:
- **Save as Draft** — Content saved but not published
- **Publish** — Content saved and immediately live

---

## 🎨 Working with Different Field Types

Each field type has its own input method. Here's how to use each:

### String Fields

Short text inputs for titles, names, and brief text.

| Action | How To |
|--------|--------|
| Enter text | Click the field and type |
| Character limit | Shown if there's a maximum |
| Required | Cannot save without filling |

> 💡 **Tip:** Keep titles concise and descriptive — they become the slug and appear in listings.

---

### Text Fields

Multi-line text areas for longer content like bios and descriptions.

| Action | How To |
|--------|--------|
| Enter text | Click and type in the textarea |
| Resize | Drag the corner to expand |
| Line breaks | Press Enter for new paragraphs |

> 💡 **Tip:** Text fields support plain text only. For formatted content, use richtext fields.

---

### Richtext Fields

Full-featured editor for formatted content.

**Available Formatting:**

| Format | Button | Keyboard Shortcut |
|--------|--------|-------------------|
| Bold | **B** | `Cmd/Ctrl + B` |
| Italic | *I* | `Cmd/Ctrl + I` |
| Heading | H dropdown | — |
| List (bulleted) | • List | — |
| List (numbered) | 1. List | — |
| Link | 🔗 | `Cmd/Ctrl + K` |
| Image | 🖼️ | — |
| Code | `</>` | — |

**How to Add Links:**

1. Select the text you want to link
2. Click the link button (or press `Cmd/Ctrl + K`)
3. Enter the URL
4. Press Enter to apply

**How to Add Images:**

1. Click the image button in the toolbar
2. Choose from:
   - **Upload** — Select a file from your computer
   - **Media Library** — Choose an existing image
3. Add alt text for accessibility
4. Click Insert

---

### Number Fields

Integer inputs for numeric values.

| Action | How To |
|--------|--------|
| Enter value | Type a number or use arrow keys |
| Increment | Click up arrow or press Up key |
| Decrement | Click down arrow or press Down key |

> 💡 **Tip:** Number fields only accept integers. For decimals, check if a float field is available.

---

### Boolean Fields

True/false toggles or checkboxes.

| State | Appearance |
|-------|------------|
| **True / Yes** | Toggle is blue/checked |
| **False / No** | Toggle is gray/unchecked |

**How to Toggle:**
- Click the toggle switch
- Click the checkbox
- Press Space when focused

---

### Date Fields

Date picker for selecting dates.

| Action | How To |
|--------|--------|
| Open picker | Click the date field |
| Select date | Click on a day in the calendar |
| Navigate months | Use arrow buttons |
| Clear date | Click the X button |

**Keyboard Navigation:**

| Key | Action |
|-----|--------|
| `Tab` | Move to next field |
| `Enter` | Confirm selection |
| `Esc` | Close picker |

---

### Datetime Fields

Combined date and time picker.

| Action | How To |
|--------|--------|
| Select date | Click on a day in the calendar |
| Select time | Use the time dropdown or type |
| Time format | 12-hour or 24-hour (system setting) |

> 💡 **Tip:** Datetime fields are useful for scheduling publication dates.

---

### UID (Slug) Fields

Auto-generated URL-friendly identifiers.

**How It Works:**

1. Type your title in the source field (e.g., "title")
2. The slug auto-generates as you type
3. Example: "My First Article!" → `my-first-article`

**Customizing the Slug:**

1. Click the **Edit** button next to the slug
2. Type your custom slug
3. Only lowercase letters, numbers, and hyphens allowed

| Character | Converts To |
|-----------|-------------|
| Spaces | Hyphens (`-`) |
| Special chars | Removed |
| Uppercase | Lowercase |

> 💡 **Tip:** Keep slugs short and descriptive for better SEO and readability.

---

### Email Fields

Specialized input for email addresses.

| Feature | Description |
|---------|-------------|
| Validation | Checks for valid email format |
| Uniqueness | Can enforce no duplicate emails |
| Type | Shows email keyboard on mobile |

**Common Validation Errors:**

| Error | Cause |
|-------|-------|
| "Invalid email format" | Missing @ or domain |
| "Email already exists" | Duplicate email (if unique) |

---

### Media Fields

File picker for images and documents.

**How to Add Media:**

1. Click the **Add Media** button
2. Choose an option:
   - **Upload** — Drag & drop or browse files
   - **From Library** — Select existing media
3. The selected media appears as a thumbnail
4. Click **Remove** to deselect

**Supported Formats:**

| Type | Formats |
|------|---------|
| Images | JPG, PNG, GIF, WebP, SVG |
| Documents | PDF, DOC, DOCX |
| Other | Configured by administrator |

---

### Relation Fields

Content picker for linking related entries.

**How to Add Relations:**

1. Click the **Add Relation** button
2. A modal opens showing available entries
3. Search or browse to find the entry
4. Click to select
5. The related entry appears in the field

**Multiple Relations:**

If the relation allows multiple entries:
- Keep selecting to add more
- Drag to reorder
- Click X to remove

---

### Enum Fields

Dropdown select for predefined options.

**How to Use:**

1. Click the dropdown
2. Select from available options
3. Only one option can be selected

> 💡 **Tip:** Enum options are configured by developers. Contact your admin to add new options.

---

### JSON Fields

Code editor for structured data.

**How to Use:**

1. Click in the code editor area
2. Enter valid JSON
3. Syntax highlighting helps spot errors
4. Validation occurs on save

**Example:**
```json
{
  "seo": {
    "metaTitle": "My Article",
    "metaDescription": "A great article"
  }
}
```

---

## ⚠️ Required vs Optional Fields

### Identifying Required Fields

| Indicator | Location |
|-----------|----------|
| Asterisk (*) | After field label |
| Red outline | Appears on save attempt |
| Error message | "This field is required" |

### Handling Required Fields

1. **Fill them first** — Complete required fields before optional ones
2. **Check validation** — Some fields have format requirements
3. **Cannot skip** — Save is blocked until filled

---

## 💾 Saving Your Content

### Save as Draft

Use draft mode when:
- Work is in progress
- Content needs review
- Not ready to be live

**How to Save as Draft:**

1. Click **Save** or **Save as Draft**
2. Content is saved with draft status
3. You can continue editing

### Publish Immediately

Use publish when content is ready to go live.

**How to Publish:**

1. Complete all required fields
2. Click **Publish** button
3. Content is saved and immediately available via API

### Auto-Save

Publisher automatically saves your work:

| Feature | Behavior |
|---------|----------|
| **Interval** | Every 30 seconds (configurable) |
| **Indicator** | "Saving..." / "Saved" message |
| **Recovery** | Draft restored if browser closes |

---

## 💡 Tips for Content Creation

> 🎯 **Start with the title**: A good title sets the direction for your content and auto-generates a useful slug.

> 📝 **Write excerpts deliberately**: Even though it's optional, a good excerpt improves SEO and listing displays.

> 🔗 **Add relations early**: Link your article to an author before publishing to ensure proper attribution.

> 💾 **Save frequently**: While auto-save works, manually saving ensures you don't lose work.

> 👁️ **Preview before publishing**: Use the preview feature to see how content will appear.

> ✅ **Check required fields first**: Make sure all required fields are filled before spending time on optional ones.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Content Types Overview](./01-content-types-overview.md) | Understand available content types and fields |
| [Editing Content](./03-editing-content.md) | Modify existing content entries |
| [Publishing Workflow](./04-publishing-workflow.md) | Draft, publish, and scheduled states |
| [Working with Relations](./05-working-with-relations.md) | Link content together |

---

*Previous: [Content Types Overview](./01-content-types-overview.md) | Next: [Editing Content →](./03-editing-content.md)*
