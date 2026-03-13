---
title: "Managing Media"
description: "Learn how to organize, search, edit, and delete media files in the Publisher CMS Media Library."
category: "Media Library"
tags: ["media", "manage", "organize", "delete", "search", "metadata"]
lastUpdated: "2026-02-28"
---

# 📂 Managing Media

Once you've uploaded files to the Media Library, you'll need to organize and manage them effectively. This guide covers browsing, searching, editing metadata, and maintaining a clean media library.

---

## 🗂️ Browsing the Media Library

The Media Library provides flexible views for finding your files:

### Grid View

The default view shows files as visual thumbnails:

| Element | Description |
|---------|-------------|
| **Thumbnail** | Visual preview of the file |
| **Icon** | Generic icon for non-image files (PDF, video, audio) |
| **Filename** | Shown below each thumbnail |
| **Selection** | Checkbox for bulk operations |
| **Hover Actions** | Quick access to view, edit, delete |

**When to use Grid View:**
- Finding images visually
- Browsing for design assets
- Quick visual scanning

### List View

A detailed table view with sortable columns:

| Column | Description | Sortable |
|--------|-------------|----------|
| **Preview** | Small thumbnail | No |
| **Name** | File name | Yes |
| **Type** | File format (JPEG, PNG, etc.) | Yes |
| **Size** | File size in KB/MB | Yes |
| **Dimensions** | Image width × height | No |
| **Uploaded** | Upload date and time | Yes |
| **Actions** | Edit, delete buttons | No |

**When to use List View:**
- Finding files by name
- Sorting by date or size
- Detailed file management

### Switching Views

Toggle between views using the view buttons in the toolbar:

| Icon | View |
|------|------|
| ⊞ | Grid View |
| ☰ | List View |

---

## 🔍 Searching and Filtering

Quickly find files using search and filters:

### Search by Name

1. Locate the **search bar** at the top of the Media Library
2. Type your search term
3. Results update in real-time
4. Press `Enter` or click the search icon

**Search Tips:**

| Tip | Example |
|-----|---------|
| Partial matches work | `banner` finds `hero-banner.jpg` |
| Case-insensitive | `BANNER` finds `banner.jpg` |
| Searches filename only | Not alt text or captions |

### Filter by Type

Narrow results by file type:

| Filter | Shows |
|--------|-------|
| **All** | Everything |
| **Images** | JPEG, PNG, GIF, WebP, SVG |
| **Documents** | PDF |
| **Videos** | MP4 |
| **Audio** | MP3 |

1. Click the **filter dropdown** or **type tabs**
2. Select the file type you want
3. Library updates to show only that type

### Filter by Date

Some views allow date filtering:

| Option | Shows |
|--------|-------|
| **Today** | Files uploaded today |
| **This Week** | Files from the past 7 days |
| **This Month** | Files from the past 30 days |
| **Custom Range** | Specify start and end dates |

---

## 👁️ Viewing Media Details

To see full information about a file:

### Opening the Detail View

1. Click on any file in the grid or list
2. A detail panel or modal opens
3. View all file information

### Detail View Information

| Section | Information Shown |
|---------|-------------------|
| **Preview** | Full-size preview (images) or player (video/audio) |
| **Filename** | Original file name |
| **File Type** | MIME type (e.g., `image/jpeg`) |
| **File Size** | Size in KB or MB |
| **Dimensions** | Width × Height (images only) |
| **Uploaded Date** | When the file was added |
| **Alt Text** | Alternative text for accessibility |
| **Caption** | Optional description |
| **Tags** | Keywords for organization |
| **Variants** | Links to different sizes (images) |
| **Usage** | Content entries using this file |

### Preview Actions

While viewing a file:

| Action | Description |
|--------|-------------|
| **Zoom** | Enlarge image preview |
| **Download** | Download original file |
| **Copy URL** | Copy direct link to file |
| **Edit** | Open metadata editor |
| **Delete** | Remove file from library |

---

## ✏️ Editing Media Metadata

Metadata helps organize and describe your files. Here's how to edit it:

### Opening the Editor

1. Find the file you want to edit
2. Click the **Edit** button (pencil icon)
3. Or click the file and select **Edit** from the detail view

### Editable Fields

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| **Filename** | Text | Display name for the file | Yes |
| **Alt Text** | Text | Image description for screen readers | Recommended |
| **Caption** | Text | Description shown with the image | No |
| **Tags** | Keywords | Comma-separated tags for organization | No |

### Best Practices for Metadata

#### Alt Text (Alternative Text)

Essential for accessibility and SEO:

| ✅ Good Alt Text | ❌ Bad Alt Text |
|------------------|-----------------|
| "Team collaborating around whiteboard in office" | "image" |
| "Red promotional banner with 50% off text" | "banner.jpg" |
| "Portrait of CEO Jane Smith smiling" | "photo" |

**Guidelines:**
- Describe what's in the image
- Keep it concise (under 125 characters)
- Don't start with "Image of..." or "Picture of..."
- Include relevant keywords naturally

#### Captions

Optional but useful for context:

- Add context that isn't in the image
- Credit photographers or sources
- Provide additional information

#### Tags

Use tags for organization:

| Good Tags | Purpose |
|-----------|---------|
| `hero`, `banner`, `thumbnail` | Image purpose |
| `2024`, `q1`, `summer` | Time period |
| `marketing`, `product`, `team` | Category |
| `homepage`, `blog`, `email` | Usage location |

### Saving Changes

1. Make your edits in the form
2. Click **Save** or **Save Changes**
3. Confirmation message appears
4. Changes apply immediately

---

## 🗑️ Deleting Media

Remove files you no longer need:

### Single File Deletion

1. Find the file to delete
2. Click the **Delete** button (trash icon)
3. A confirmation dialog appears
4. Review the warning about usage
5. Click **Confirm** or **Delete**

### Bulk Deletion

Delete multiple files at once:

1. Switch to **Grid View** for easier selection
2. Click the **checkbox** on each file to delete
3. Selected files show a checkmark
4. Click **Bulk Actions** → **Delete**
5. Confirm the deletion

### Deletion Warnings

Before deleting, check for usage:

| Warning | Meaning |
|---------|---------|
| "This file is in use" | File is attached to content |
| "Used in 3 entries" | Number of content references |
| List of usage | Which entries use the file |

> ⚠️ **Important:** Deleting media that's in use will remove it from your content. Always check usage before deleting!

### Recovering Deleted Files

If soft delete is enabled:

1. Look for a **Trash** or **Deleted** filter
2. Switch to view deleted files
3. Select the file to recover
4. Click **Restore** or **Undelete**

Files are permanently deleted after the retention period (configured by your administrator).

---

## 🔄 Replacing Media Files

Need to update a file without changing content references?

### When to Replace

| Scenario | Action |
|----------|--------|
| Updated logo | Replace the old logo file |
| Better quality image | Replace with higher resolution |
| Fixed typo in PDF | Replace with corrected version |

### Replacement Process

1. Open the file's **detail view**
2. Click **Replace File** or **Upload New Version**
3. Select the new file
4. Confirm the replacement

**What happens:**
- File ID and references stay the same
- New file content replaces old
- Image variants are regenerated
- All content using the file updates automatically

> 💡 **Note:** The replacement file should be the same type (image for image, PDF for PDF) for best results.

---

## 🔗 Viewing Media Usage

See where a file is used across your content:

### Checking Usage

1. Open the file's **detail view**
2. Look for the **Usage** or **References** section
3. See a list of content entries using this file

### Usage Information

| Information | Description |
|-------------|-------------|
| **Content Type** | Which type (Article, Author, etc.) |
| **Entry Title** | Name of the content entry |
| **Field** | Which field uses the media |
| **Link** | Click to edit the content |

### Why Check Usage?

| Reason | Benefit |
|--------|---------|
| **Before deleting** | Avoid breaking content |
| **Content audit** | Find orphaned or underused files |
| **Updates** | Know what content is affected by changes |

---

## 📦 Bulk Operations

Manage multiple files efficiently:

### Selecting Multiple Files

| Method | Action |
|--------|--------|
| **Click checkboxes** | Select individual files |
| **Shift + Click** | Select range of files |
| **Select All** | Select all files in current view |

### Available Bulk Actions

| Action | Description |
|--------|-------------|
| **Delete** | Remove all selected files |
| **Add Tags** | Add tags to multiple files |
| **Move to Folder** | Organize into folders (if enabled) |
| **Download** | Download all selected as ZIP |

### Performing Bulk Actions

1. Select the files you want to affect
2. Click **Bulk Actions** dropdown
3. Choose the action
4. Confirm when prompted
5. Action applies to all selected files

---

## 📊 Media Library Statistics

Monitor your media usage:

### Common Statistics

| Metric | Description |
|--------|-------------|
| **Total Files** | Number of files in library |
| **Total Size** | Combined storage used |
| **By Type** | Count of images, videos, documents, etc. |
| **Recent Uploads** | Files added in the last 7 days |

### Storage Management

Keep your library efficient:

| Task | Frequency |
|------|-----------|
| Delete unused files | Monthly |
| Review large files | Quarterly |
| Check for duplicates | As needed |
| Archive old media | Annually |

---

## 💡 Tips for Media Management

> 🗂️ **Use tags consistently:** Create a tagging convention and stick to it. This makes finding files much easier.

> 🧹 **Clean up regularly:** Schedule time to review and remove unused files. A clean library is easier to manage.

> ✅ **Always add alt text:** Make accessibility a habit by adding alt text immediately after upload.

> 🔍 **Check before deleting:** Always verify usage before deleting files to avoid broken content.

> 📋 **Batch your work:** Add metadata to multiple files at once using bulk operations.

> 📁 **Name thoughtfully:** Good names make files searchable without needing tags.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Media Library Overview](./01-media-library-overview.md) | Understanding the media system |
| [Uploading Media](./02-uploading-media.md) | File upload process and formats |
| [Image Variants](./04-image-variants.md) | Auto-generated image sizes |

---

*Previous: [Uploading Media](./02-uploading-media.md) | Next: [Image Variants →](./04-image-variants.md)*
