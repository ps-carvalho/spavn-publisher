---
title: "Uploading Media"
description: "Learn how to upload files to the Media Library in Publisher CMS, including supported formats, size limits, and troubleshooting tips."
category: "Media Library"
tags: ["upload", "media", "files", "drag-drop", "troubleshooting"]
lastUpdated: "2026-02-28"
---

# 📤 Uploading Media

Uploading files to the Media Library is quick and easy. This guide walks you through the process step-by-step, from choosing files to troubleshooting common issues.

---

## 🚀 Quick Upload Overview

Before you start, here's what you need to know:

| Requirement | Details |
|-------------|---------|
| **Max File Size** | 10 MB per file |
| **Supported Formats** | JPEG, PNG, GIF, WebP, SVG, PDF, MP4, MP3 |
| **Upload Methods** | Drag & drop or file picker |
| **Concurrent Uploads** | Multiple files at once supported |

---

## 📋 Supported File Formats

Publisher accepts the following file types:

### ✅ Allowed Formats

| Category | Format | MIME Type | Extension |
|----------|--------|-----------|-----------|
| 🖼️ Image | JPEG | `image/jpeg` | `.jpg`, `.jpeg` |
| 🖼️ Image | PNG | `image/png` | `.png` |
| 🖼️ Image | GIF | `image/gif` | `.gif` |
| 🖼️ Image | WebP | `image/webp` | `.webp` |
| 🖼️ Image | SVG | `image/svg+xml` | `.svg` |
| 📄 Document | PDF | `application/pdf` | `.pdf` |
| 🎬 Video | MP4 | `video/mp4` | `.mp4` |
| 🎵 Audio | MP3 | `audio/mpeg` | `.mp3` |

### ❌ Unsupported Formats

The following common formats are **NOT** supported:

| Format | Reason | Alternative |
|--------|--------|-------------|
| BMP | Outdated, large files | Convert to PNG or JPEG |
| TIFF | Large files, web incompatibility | Convert to PNG or JPEG |
| AVI | Large files, codec issues | Convert to MP4 |
| MOV | Codec compatibility | Convert to MP4 |
| WAV | Large file size | Convert to MP3 |
| DOC/DOCX | Not supported | Convert to PDF |

---

## 📏 File Size Limits

| Limit | Value | Notes |
|-------|-------|-------|
| **Maximum per file** | 10 MB | Applies to all file types |
| **Recommended for images** | < 5 MB | Faster uploads and processing |
| **Recommended for videos** | < 10 MB | For short clips only |

> ⚠️ **Important:** Files exceeding 10 MB will be rejected. For larger videos, consider using a video hosting service (like YouTube or Vimeo) and embedding the link instead.

---

## 🖱️ Upload Methods

There are two ways to upload files to the Media Library:

### Method 1: Drag and Drop

The fastest way to upload files:

1. Open the **Media Library** from the sidebar
2. Click the **Upload** button (or look for the upload zone)
3. **Drag files** from your computer directly onto the upload area
4. Files begin uploading automatically
5. Wait for the progress bar to complete
6. Your files appear in the library

**Tips for Drag & Drop:**

| ✅ Do | ❌ Don't |
|-------|----------|
| Drag multiple files at once | Drag folders (upload files inside instead) |
| Wait for upload to complete | Close the browser mid-upload |
| Check file format first | Drag unsupported file types |

---

### Method 2: File Picker

The traditional method with more control:

1. Open the **Media Library** from the sidebar
2. Click the **Upload** button
3. Click **Browse Files** or **Choose Files**
4. Navigate to your file location
5. Select one or more files (hold `Cmd`/`Ctrl` for multiple)
6. Click **Open** or **Upload**
7. Wait for the upload progress to complete
8. Your files appear in the library

---

## 📝 Step-by-Step Upload Process

Here's the complete workflow from start to finish:

### Step 1: Prepare Your File

Before uploading, ensure your file meets requirements:

- [ ] File format is supported (see table above)
- [ ] File size is under 10 MB
- [ ] Filename is descriptive and meaningful
- [ ] Image is properly oriented (not rotated)

### Step 2: Open the Media Library

1. Log into the Publisher admin interface
2. Click **Media Library** in the sidebar
3. You'll see the main media browser

### Step 3: Initiate Upload

Choose your method:

| Method | Action |
|--------|--------|
| **Drag & Drop** | Drag files onto the upload zone |
| **File Picker** | Click Upload → Browse Files → Select files |

### Step 4: Monitor Progress

During upload, you'll see:

| Indicator | Description |
|-----------|-------------|
| **Progress Bar** | Shows upload percentage |
| **File Name** | Which file is currently uploading |
| **Status** | Uploading, Processing, Complete, or Error |

### Step 5: Add Metadata (Optional)

After upload, you can add:

| Field | Description | Recommendation |
|-------|-------------|----------------|
| **Alt Text** | Image description for accessibility | Always add for images |
| **Title** | Display name | Use if different from filename |
| **Caption** | Description shown with image | Optional, for editorial use |
| **Tags** | Keywords for organization | Add for easier searching |

### Step 6: Confirm Upload

Once complete:

1. Green checkmark appears on successful uploads
2. Files are immediately available in the library
3. Image variants are generated automatically (for images)
4. Files can be used in content right away

---

## 🔄 Upload from Content Editor

You can also upload files while editing content:

1. Open a content entry for editing
2. Find the **media field** you want to populate
3. Click **Add Media** or the upload icon
4. A media picker modal opens
5. Click **Upload Files** tab in the modal
6. Drag & drop or browse for files
7. Select the newly uploaded file(s)
8. Click **Confirm** or **Add**

The file is uploaded and attached to your content in one action!

---

## ⚠️ Troubleshooting Upload Errors

Encountering issues? Here are common problems and solutions:

### "File too large" Error

| Problem | File exceeds 10 MB limit |
|---------|--------------------------|
| **Solution** | Compress the file or use a smaller version |
| **For Images** | Use tools like TinyPNG or Squoosh to reduce size |
| **For Videos** | Use HandBrake to compress, or host externally |

### "Invalid file type" Error

| Problem | File format not supported |
|---------|---------------------------|
| **Solution** | Convert to a supported format |
| **Check** | File extension matches actual content |
| **Common Issue** | `.jpg` file that's actually a PNG renamed |

### "Upload failed" Error

| Problem | Server-side issue or network problem |
|---------|--------------------------------------|
| **Solutions** | Try the following: |
| | 1. Check your internet connection |
| | 2. Refresh the page and try again |
| | 3. Clear browser cache |
| | 4. Try a different browser |
| | 5. Contact support if issue persists |

### "Processing failed" Error

| Problem | File uploaded but couldn't be processed |
|---------|----------------------------------------|
| **For Images** | File may be corrupted or invalid |
| **For Videos** | Codec not supported in MP4 container |
| **Solution** | Re-export the file from the original source |

### Slow Upload Speeds

| Problem | Uploads taking too long |
|---------|------------------------|
| **Solutions** | Try the following: |
| | 1. Use smaller file sizes |
| | 2. Check your internet upload speed |
| | 3. Upload fewer files at once |
| | 4. Try during off-peak hours |

---

## ✅ Best Practices for File Naming

Good file names make your Media Library easier to manage:

### ✅ Good File Names

| Example | Why It's Good |
|---------|---------------|
| `hero-banner-summer-2024.jpg` | Descriptive, includes context |
| `product-widget-blue.png` | Clear purpose and variant |
| `author-jane-smith-profile.jpg` | Identifies content and person |
| `user-guide-chapter-1.pdf` | Organized, numbered |

### ❌ Bad File Names

| Example | Why It's Bad |
|---------|--------------|
| `IMG_0001.jpg` | Generic, no meaning |
| `Screenshot 2024-01-15 at 3.45 PM.png` | Too long, includes timestamp |
| `final-final-v2-REAL.jpg` | Version confusion |
| `image.jpg` | Completely unhelpful |
| `my file name with spaces.jpg` | Spaces can cause issues |

### Naming Conventions

| Rule | Recommendation |
|------|----------------|
| **Use lowercase** | `my-image.jpg` not `My-Image.jpg` |
| **Use hyphens** | `my-image.jpg` not `my_image.jpg` |
| **No spaces** | Replace spaces with hyphens |
| **Be descriptive** | Name should indicate content |
| **Include context** | Date, category, or purpose |
| **Keep it short** | Under 50 characters ideal |

---

## 💡 Tips for Successful Uploads

> 🖼️ **Optimize images first:** Compress images before uploading to save time and storage. Tools like TinyPNG can reduce file size by 70% without visible quality loss.

> 📱 **Consider variants:** Publisher creates multiple sizes automatically. Upload the highest quality version you have — the system handles optimization.

> 🔤 **Rename before upload:** Change filenames to something meaningful before uploading. It's easier than renaming later.

> 🌐 **Check internet stability:** Large uploads need a stable connection. Avoid uploading on unstable WiFi.

> 📋 **Batch related files:** Upload related files together to add consistent tags and metadata in one go.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Media Library Overview](./01-media-library-overview.md) | Understanding the media system |
| [Managing Media](./03-managing-media.md) | Organizing and editing uploaded files |
| [Image Variants](./04-image-variants.md) | Auto-generated image sizes |

---

*Previous: [Media Library Overview](./01-media-library-overview.md) | Next: [Managing Media →](./03-managing-media.md)*
