---
title: "Media Library Overview"
description: "Understand the Media Library in Publisher CMS, including supported file types, storage, and how media integrates with your content."
category: "Media Library"
tags: ["media", "images", "files", "overview", "storage"]
lastUpdated: "2026-02-28"
---

# 🖼️ Media Library Overview

The Media Library is your central hub for managing all digital assets in Publisher CMS. From images to documents, videos to audio files — everything you need to enrich your content is organized and accessible here.

---

## 🤔 What Is the Media Library?

The **Media Library** is a dedicated space where you can upload, organize, and manage all media files used across your content. It provides a unified interface for handling digital assets, ensuring they're easy to find, reuse, and deliver efficiently.

### Why Use the Media Library?

| Benefit | Description |
|---------|-------------|
| **Centralized Storage** | All files in one place, accessible from anywhere |
| **Easy Reuse** | Use the same file across multiple content entries |
| **Automatic Optimization** | Images are automatically resized into multiple variants |
| **Organization** | Tag, search, and filter to find files quickly |
| **API Access** | All media is available via the REST API |

---

## 📁 Supported File Types

Publisher supports a variety of file types to meet your content needs:

### 🖼️ Images

| Format | MIME Type | Best For |
|--------|-----------|----------|
| **JPEG** | `image/jpeg` | Photos, complex images with gradients |
| **PNG** | `image/png` | Graphics with transparency, screenshots |
| **GIF** | `image/gif` | Simple animations |
| **WebP** | `image/webp` | Modern format with excellent compression |
| **SVG** | `image/svg+xml` | Icons, logos, scalable graphics |

### 📄 Documents

| Format | MIME Type | Best For |
|--------|-----------|----------|
| **PDF** | `application/pdf` | Documents, reports, downloadable files |

### 🎬 Videos

| Format | MIME Type | Best For |
|--------|-----------|----------|
| **MP4** | `video/mp4` | Video content, embedded clips |

### 🎵 Audio

| Format | MIME Type | Best For |
|--------|-----------|----------|
| **MP3** | `audio/mpeg` | Podcasts, music, sound clips |

---

## 📏 File Size Limits

To ensure optimal performance and storage efficiency, file uploads are limited:

| Setting | Value |
|---------|-------|
| **Maximum File Size** | 10 MB |
| **Applies To** | All file types |

> ⚠️ **Note:** Files larger than 10 MB will be rejected during upload. Consider compressing large images or using external hosting for larger video files.

---

## 🔗 How Media Integrates with Content

Media files aren't just stored — they're deeply integrated with your content types:

### Media Fields in Content Types

When a content type includes a **media field**, you can:

| Action | Description |
|--------|-------------|
| **Select** | Choose from existing files in the Media Library |
| **Upload** | Add new files directly from the content editor |
| **Preview** | See a thumbnail preview of selected media |
| **Remove** | Detach media without deleting the file |

### Single vs. Multiple Media

Media fields can be configured to accept:

| Type | Description | Use Case |
|------|-------------|----------|
| **Single Media** | One file per field | Article featured image |
| **Multiple Media** | Multiple files per field | Image gallery, document attachments |

### Relation Tracking

Publisher tracks where media is used:

- View which content entries reference a specific file
- Prevent accidental deletion of in-use media
- Understand media usage across your site

---

## 💾 Media Storage Overview

Understanding how your media is stored helps you manage assets effectively:

### File Storage

| Aspect | Description |
|--------|-------------|
| **Location** | Files are stored in the configured storage backend |
| **Organization** | Files are organized by upload date and ID |
| **Naming** | Original filenames are preserved in metadata |
| **Access** | Files are served via CDN for fast delivery |

### Image Variants

When you upload an image, Publisher automatically creates multiple size variants:

| Variant | Width | Use Case |
|---------|-------|----------|
| **Thumbnail** | 245px | Grid views, previews, widgets |
| **Small** | 500px | Thumbnails, mobile displays |
| **Medium** | 750px | Standard content width |
| **Large** | 1000px | Full-width displays, high-DPI screens |
| **Original** | (as uploaded) | Source file, preserved exactly |

> 💡 **Learn More:** See [Image Variants](./04-image-variants.md) for detailed information about automatic image resizing.

---

## 🖥️ Accessing the Media Library

You can access the Media Library from several places in the admin UI:

### From the Sidebar

1. Log into the Publisher admin interface
2. Look for the **Media Library** section in the left sidebar
3. Click to open the main media browser

### From Content Editors

When editing content with a media field:

1. Click the **Add Media** button in the field
2. A media picker modal opens
3. Choose existing files or upload new ones
4. Select the file(s) you want to use

### From the Dashboard

The main dashboard may show:

- Recent media uploads
- Storage usage statistics
- Quick upload shortcuts

---

## 🗂️ Media Library Interface

When you open the Media Library, you'll see:

### Grid View (Default)

| Element | Description |
|---------|-------------|
| **Thumbnail Grid** | Visual preview of all files |
| **File Info** | Name, type, and size on hover |
| **Selection Checkbox** | For bulk operations |
| **Quick Actions** | View, edit, delete buttons |

### List View

| Element | Description |
|---------|-------------|
| **File Table** | Detailed list with columns |
| **Sortable Columns** | Name, date, size, type |
| **Search Bar** | Find files by name |
| **Filters** | Filter by type, date, tags |

---

## 💡 Tips for Using the Media Library

> 🎯 **Name files descriptively:** Use clear, meaningful filenames like `hero-banner-summer-sale.jpg` instead of `IMG_0001.jpg`.

> 🖼️ **Optimize before uploading:** While Publisher creates variants, starting with optimized files saves storage and upload time.

> 🏷️ **Use alt text:** Always add descriptive alt text to images for accessibility and SEO.

> 🗑️ **Clean up regularly:** Remove unused files to keep your library organized and save storage space.

> 📱 **Consider mobile:** Choose images that look good at all sizes, from thumbnail to full-width.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Uploading Media](./02-uploading-media.md) | Step-by-step upload process and troubleshooting |
| [Managing Media](./03-managing-media.md) | Organizing, editing, and deleting files |
| [Image Variants](./04-image-variants.md) | Understanding auto-generated image sizes |

---

*Previous: [Working with Relations](../Content-Management/05-working-with-relations.md) | Next: [Uploading Media →](./02-uploading-media.md)*
