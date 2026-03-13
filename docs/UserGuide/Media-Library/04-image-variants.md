---
title: "Image Variants"
description: "Understand how Publisher CMS automatically generates multiple image sizes and how to use them effectively for performance and responsiveness."
category: "Media Library"
tags: ["images", "variants", "responsive", "performance", "optimization"]
lastUpdated: "2026-02-28"
---

# 🖼️ Image Variants

When you upload an image to Publisher, the system automatically creates multiple resized versions called **variants**. This guide explains what variants are, when they're created, and how to use them effectively.

---

## 🤔 What Are Image Variants?

**Image variants** are automatically generated copies of your original image at different sizes. Each variant is optimized for a specific use case, from tiny thumbnails to large hero images.

### Why Variants Matter

| Benefit | Description |
|---------|-------------|
| **Performance** | Serve smaller files for smaller displays |
| **Bandwidth** | Reduce data transfer for mobile users |
| **Consistency** | Standardized sizes across your site |
| **Speed** | Faster page loads with appropriate image sizes |

### The Problem Without Variants

Imagine loading a 5MB hero image just to display a 100×100 pixel thumbnail:

| Issue | Impact |
|-------|--------|
| Slow loading | Poor user experience |
| Wasted bandwidth | Higher costs, slower mobile |
| Browser resizing | Loss of quality |

### The Solution With Variants

Publisher creates the right size for each use:

| Use Case | Variant Used | File Size Example |
|----------|--------------|-------------------|
| Thumbnail grid | Thumbnail (245px) | ~15 KB |
| Mobile preview | Small (500px) | ~45 KB |
| Article image | Medium (750px) | ~85 KB |
| Hero banner | Large (1000px) | ~150 KB |

---

## 📐 Available Variant Sizes

Publisher generates these image variants automatically:

### Size Reference Table

| Variant | Width | Aspect Ratio | Typical Use Case |
|---------|-------|--------------|------------------|
| **Thumbnail** | 245px | Preserved | Grid views, previews, widgets |
| **Small** | 500px | Preserved | Thumbnails, mobile displays |
| **Medium** | 750px | Preserved | Standard content width |
| **Large** | 1000px | Preserved | Full-width displays, featured images |
| **Original** | (as uploaded) | Preserved | Source file, downloads |

### Visual Size Comparison

```
Thumbnail  Small      Medium     Large      Original
├────┤     ├──────┤   ├────────┤ ├──────────┤ ├────────────────┤
245px      500px      750px      1000px      (original width)
```

### Important Notes

| Note | Details |
|------|---------|
| **Width-based** | Only width is specified; height scales proportionally |
| **Aspect ratio** | Original aspect ratio is always preserved |
| **No upscaling** | Images smaller than a variant size won't be enlarged |
| **Format** | Variants maintain the original format (JPEG, PNG, etc.) |

---

## ⚙️ When Variants Are Created

### Automatic Generation

Variants are created automatically when you upload an image:

| Step | What Happens |
|------|--------------|
| 1. Upload | Original file is received and validated |
| 2. Storage | Original is saved to the media store |
| 3. Processing | Each variant is generated asynchronously |
| 4. Completion | All variants become available |

### Processing Time

| Image Size | Typical Processing Time |
|------------|------------------------|
| < 1 MB | Instant (< 1 second) |
| 1-3 MB | Quick (1-3 seconds) |
| 3-5 MB | Moderate (3-5 seconds) |
| > 5 MB | Longer (5+ seconds) |

> 💡 **Tip:** Variants are generated in the background. You can start using the image immediately — variants become available as they're processed.

### When Variants Are NOT Created

| Scenario | Result |
|----------|--------|
| Non-image file | No variants (PDF, video, audio) |
| SVG files | No variants (vector graphics scale naturally) |
| Image smaller than variant | Original used instead (no upscaling) |

---

## 🔗 Accessing Image Variants

### Via the Admin UI

When viewing an image in the Media Library:

1. Open the image's **detail view**
2. Look for the **Variants** section
3. See all available sizes with dimensions
4. Click any variant to preview or copy URL

### Via the API

When fetching media through the API, variants are included in the response:

```json
{
  "id": 123,
  "name": "hero-banner.jpg",
  "url": "/uploads/hero-banner.jpg",
  "formats": {
    "thumbnail": {
      "url": "/uploads/thumbnail_hero-banner.jpg",
      "width": 245,
      "height": 164
    },
    "small": {
      "url": "/uploads/small_hero-banner.jpg",
      "width": 500,
      "height": 333
    },
    "medium": {
      "url": "/uploads/medium_hero-banner.jpg",
      "width": 750,
      "height": 500
    },
    "large": {
      "url": "/uploads/large_hero-banner.jpg",
      "width": 1000,
      "height": 667
    }
  }
}
```

### URL Patterns

Variants follow a consistent naming pattern:

| Variant | URL Pattern |
|---------|-------------|
| Original | `/uploads/filename.jpg` |
| Thumbnail | `/uploads/thumbnail_filename.jpg` |
| Small | `/uploads/small_filename.jpg` |
| Medium | `/uploads/medium_filename.jpg` |
| Large | `/uploads/large_filename.jpg` |

---

## 🖥️ Using Variants in Content

### Choosing the Right Size

Match variant size to your display context:

| Display Context | Recommended Variant | Why |
|-----------------|--------------------|----|
| Thumbnail grid (4+ columns) | Thumbnail (245px) | Fits small containers |
| Sidebar image | Thumbnail (245px) or Small (500px) | Limited width |
| Mobile full-width | Small (500px) | Mobile screen size |
| Article inline image | Medium (750px) | Standard content width |
| Featured/Hero image | Large (1000px) | Maximum visual impact |
| Lightbox/zoom | Original | Full detail on demand |

### In the Rich Text Editor

When inserting images into content:

1. Position cursor where image should appear
2. Click **Insert Image** in the toolbar
3. Select from Media Library
4. Choose **Display Size** from dropdown:
   - Thumbnail
   - Small
   - Medium
   - Large
   - Original
5. Image inserts at selected size

### In Media Fields

For media fields in content types:

1. The field stores a reference to the original
2. Your frontend code selects the appropriate variant
3. Use responsive images for best results

### Responsive Image Example

For web development, use the `srcset` attribute:

```html
<img
  src="/uploads/medium_hero-banner.jpg"
  srcset="
    /uploads/thumbnail_hero-banner.jpg 245w,
    /uploads/small_hero-banner.jpg 500w,
    /uploads/medium_hero-banner.jpg 750w,
    /uploads/large_hero-banner.jpg 1000w
  "
  sizes="(max-width: 600px) 100vw, 750px"
  alt="Hero banner description"
/>
```

The browser automatically selects the best size for the user's device!

---

## 📊 Performance Benefits

### File Size Comparison

Real-world example with a typical photograph:

| Variant | Dimensions | File Size | % of Original |
|---------|------------|-----------|---------------|
| Original | 3000×2000 | 2.4 MB | 100% |
| Large | 1000×667 | 185 KB | 7.7% |
| Medium | 750×500 | 98 KB | 4.1% |
| Small | 500×333 | 48 KB | 2.0% |
| Thumbnail | 245×163 | 14 KB | 0.6% |

### Bandwidth Savings

Using appropriate variants saves significant bandwidth:

| Scenario | Original | Appropriate Variant | Savings |
|----------|----------|--------------------| ------- |
| 10 thumbnails on page | 24 MB | 140 KB | 99.4% |
| Mobile article view | 2.4 MB | 48 KB | 98% |
| Desktop article | 2.4 MB | 98 KB | 96% |

### Page Speed Impact

| Metric | With Original | With Variants |
|--------|--------------|---------------|
| Page weight | 25+ MB | 500 KB |
| Load time (4G) | 45+ seconds | 2 seconds |
| Load time (WiFi) | 8 seconds | 0.5 seconds |
| Lighthouse score | 45 | 95 |

---

## 💾 Original File Preservation

### Your Original Is Safe

Publisher **always preserves** your original uploaded file:

| Guarantee | Description |
|-----------|-------------|
| **No quality loss** | Original is stored exactly as uploaded |
| **Full resolution** | All pixels and metadata preserved |
| **Always available** | Original URL never changes |
| **Download ready** | Use for downloads or archives |

### When to Use the Original

| Use Case | Why Original |
|----------|--------------|
| Downloads | Users want full-quality file |
| Print | Maximum resolution needed |
| Editing | Source for external editing |
| Zoom/lightbox | Full detail on demand |
| Archives | Master copy preservation |

---

## 🔄 Regenerating Variants

Sometimes you may need to regenerate variants:

### When to Regenerate

| Scenario | Action Needed |
|----------|---------------|
| Configuration change | Variant sizes updated in config |
| Quality adjustment | Compression settings changed |
| Corrupted variant | File was damaged or lost |
| Format migration | Converting to new format |

### How to Regenerate

1. Contact your administrator, OR
2. If you have access to regeneration tools:
   - Open Media Library settings
   - Find **Regenerate Variants** option
   - Select images or regenerate all
   - Wait for processing to complete

> ⚠️ **Note:** Regenerating variants for a large library can take significant time and server resources.

---

## 🎨 Advanced Usage

### Art Direction

For different aspect ratios on different devices, you'll need to upload separate images rather than relying on variants. Variants preserve the original aspect ratio.

### Lazy Loading

Combine variants with lazy loading for maximum performance:

```html
<img
  src="/uploads/thumbnail_hero-banner.jpg"
  data-src="/uploads/large_hero-banner.jpg"
  loading="lazy"
  alt="Hero banner"
/>
```

### Placeholder Images

Use the thumbnail as a placeholder while larger images load:

1. Display thumbnail immediately (blurry but fast)
2. Load larger variant in background
3. Swap when loaded (blur-up technique)

---

## 💡 Tips for Working with Variants

> 📱 **Think mobile-first:** Start with the smallest size that looks good, then ensure larger sizes also work well.

> 🎯 **Match context:** Don't use a 1000px image in a 200px container — use the thumbnail instead.

> 📊 **Monitor performance:** Use browser DevTools to verify you're loading appropriate image sizes.

> 🖼️ **Upload high quality:** Start with the best quality image you have — the system handles optimization.

> 🔍 **Test responsive:** Check how your images look on different screen sizes and devices.

> ⚡ **Use lazy loading:** Defer loading images below the fold for faster initial page loads.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Media Library Overview](./01-media-library-overview.md) | Understanding the media system |
| [Uploading Media](./02-uploading-media.md) | File upload process and formats |
| [Managing Media](./03-managing-media.md) | Organizing and editing uploaded files |

---

*Previous: [Managing Media](./03-managing-media.md) | Next: [User Management Overview →](../User-Management/01-user-management-overview.md)*
