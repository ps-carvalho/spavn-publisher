---
title: "Search & Filters"
description: "Master advanced search and filtering capabilities in Publisher CMS to quickly find and organize content entries using operators, combinations, and saved presets."
category: "Advanced"
tags: ["search", "filters", "querying", "content", "api"]
lastUpdated: "2026-02-28"
---

# 🔍 Search & Filters

Finding the right content quickly is essential when managing large amounts of data. Publisher CMS provides powerful search and filtering capabilities that help you locate specific entries, narrow down results, and organize your content efficiently.

---

## 🤔 Understanding Search vs. Filters

Publisher offers two complementary ways to find content:

| Feature | Purpose | Best For |
|---------|---------|----------|
| **Quick Search** | Fast text-based lookup | Finding entries by title, name, or text content |
| **Advanced Filters** | Structured, field-specific queries | Precise matching using operators and conditions |

### When to Use Each

| Scenario | Recommended Approach |
|----------|---------------------|
| Find an article by title | Quick Search |
| Find all draft articles | Filter by status |
| Find articles from last month | Filter by date range |
| Find content with specific field values | Advanced Filters |
| Combine multiple conditions | Advanced Filters |

---

## 🔎 Quick Search

The search bar provides instant, full-text search across your content.

### Using the Search Bar

1. **Navigate to a Content Type**
   
   Go to **Content** → Select your content type (e.g., Articles)

2. **Locate the Search Bar**
   
   Find the search input at the top of the list view

3. **Enter Your Search Term**
   
   Type your query — results filter in real-time

4. **Review Results**
   
   Matching entries appear instantly as you type

### What Gets Searched

| Field Type | Included in Search |
|------------|-------------------|
| String fields | ✅ Title, name, short text |
| Text fields | ✅ Body, description, long text |
| UID fields | ✅ Slug, identifier |
| Number fields | ❌ Not searched |
| Boolean fields | ❌ Not searched |
| Relation fields | ❌ Not searched (use filters instead) |

> 💡 **Tip**: Quick search is case-insensitive and matches partial text. Searching for "pub" will find "Publisher", "Publishing", and "Published".

---

## 🎛️ Filter Operators Reference

Advanced filters use operators to create precise queries. Understanding these operators is key to effective filtering.

### Available Operators

| Operator | Syntax | Description | Example |
|----------|--------|-------------|---------|
| **Exact Match** | `(none)` | Field equals value exactly | `?filters[status]=published` |
| **$contains** | `$contains` | Field contains substring | `?filters[title][$contains]=guide` |
| **$gt** | `$gt` | Greater than | `?filters[views][$gt]=100` |
| **$gte** | `$gte` | Greater than or equal | `?filters[views][$gte]=100` |
| **$lt** | `$lt` | Less than | `?filters[price][$lt]=50` |
| **$lte** | `$lte` | Less than or equal | `?filters[price][$lte]=50` |
| **$ne** | `$ne` | Not equal | `?filters[status][$ne]=draft` |

### Operator Use Cases

| Use Case | Operator | Example Query |
|----------|----------|---------------|
| Find published content | Exact | `filters[status]=published` |
| Search titles containing word | $contains | `filters[title][$contains]=tutorial` |
| High-view articles | $gt | `filters[views][$gt]=1000` |
| Price range filtering | $gte + $lte | Combine both operators |
| Exclude drafts | $ne | `filters[status][$ne]=draft` |

---

## 🔧 Using Filters in the Admin Interface

### Accessing Filters

1. **Open a Content Type List**
   
   Navigate to **Content** → Select your content type

2. **Click the Filters Button**
   
   Look for a **Filters** or **Filter** button/icon near the search bar

3. **Add Filter Conditions**
   
   Select field, operator, and value for each condition

4. **Apply Filters**
   
   Click **Apply** to filter the list

### Step-by-Step: Creating a Filter

1. **Click "Add Filter"**
   
   Opens the filter configuration panel

2. **Select a Field**
   
   Choose from available fields in your content type:
   
   | Field Category | Examples |
   |----------------|----------|
   | Basic | Title, Slug, Status |
   | Dates | Created At, Updated At |
   | Numbers | View Count, Sort Order |
   | Relations | Author, Category |

3. **Choose an Operator**
   
   Select from the operator dropdown based on field type

4. **Enter the Value**
   
   Input the value to compare against

5. **Add More Filters (Optional)**
   
   Click "Add Filter" again to combine conditions

---

## 🔄 Combining Multiple Filters

Multiple filters work together to narrow down results precisely.

### AND Logic (Default)

By default, multiple filters use AND logic — entries must match ALL conditions:

```
?filters[status]=published&filters[views][$gt]=100
```

This finds entries that are:
- Status = published **AND**
- Views > 100

### Filter Combination Examples

| Goal | Filter Combination |
|------|-------------------|
| Published articles with high views | `status=published` + `views[$gt]=500` |
| Recent drafts | `status=draft` + `createdAt[$gte]=2026-01-01` |
| Articles by specific author | `author=123` + `status=published` |

> ⚠️ **Note**: Currently, Publisher uses AND logic for combining filters. OR logic between filters is not available in the UI but can be achieved via direct API queries.

---

## 📊 Filtering by Content Type Fields

Different field types support different operators:

### Text & String Fields

| Operator | Works? | Use Case |
|----------|--------|----------|
| Exact | ✅ | Match exact title |
| $contains | ✅ | Partial text match |
| $ne | ✅ | Exclude specific text |

```
?filters[title][$contains]=publisher
?filters[slug]=getting-started
```

### Number & Integer Fields

| Operator | Works? | Use Case |
|----------|--------|----------|
| Exact | ✅ | Match exact number |
| $gt / $gte | ✅ | Minimum value |
| $lt / $lte | ✅ | Maximum value |
| $ne | ✅ | Exclude value |

```
?filters[viewCount][$gte]=100&filters[viewCount][$lte]=1000
```

### Boolean Fields

| Operator | Works? | Use Case |
|----------|--------|----------|
| Exact | ✅ | true or false |
| $ne | ✅ | Opposite value |

```
?filters[featured]=true
?filters[isPublished][$ne]=false
```

---

## 📋 Filtering by Status

Content status is one of the most common filter criteria.

### Available Status Values

| Status | Description |
|--------|-------------|
| `draft` | Unpublished content |
| `published` | Live content available via API |

### Status Filter Examples

```
# Find all drafts
?filters[status]=draft

# Find all published content
?filters[status]=published

# Find all non-drafts
?filters[status][$ne]=draft
```

### Quick Status Filtering

In the admin interface:

1. Open the content type list
2. Look for **status tabs** or **quick filters** above the list
3. Click **Draft** or **Published** for instant filtering

---

## 📅 Filtering by Date Ranges

Date filtering is powerful for finding time-based content.

### Date Field Operators

| Operator | Syntax | Example |
|----------|--------|---------|
| After date | `$gt` | `filters[createdAt][$gt]=2026-01-01` |
| On or after | `$gte` | `filters[createdAt][$gte]=2026-01-01` |
| Before date | `$lt` | `filters[createdAt][$lt]=2026-02-01` |
| On or before | `$lte` | `filters[createdAt][$lte]=2026-02-01` |

### Common Date Filter Patterns

| Goal | Filter Query |
|------|--------------|
| Content from 2026 | `createdAt[$gte]=2026-01-01&createdAt[$lte]=2026-12-31` |
| Recent content (last 30 days) | `createdAt[$gte]=2026-01-29` |
| Updated this week | `updatedAt[$gte]=2026-02-22` |
| Created before a date | `createdAt[$lt]=2026-01-01` |

### Date Format

Use ISO 8601 format for dates:

```
YYYY-MM-DD          # Date only
YYYY-MM-DDTHH:mm:ss # Date with time
```

---

## ↕️ Sorting Results

Sorting helps organize your filtered results.

### Sort Syntax

```
?sort=fieldName:ASC   # Ascending (A-Z, oldest-newest)
?sort=fieldName:DESC  # Descending (Z-A, newest-oldest)
```

### Sortable Fields

| Field | ASC Order | DESC Order |
|-------|-----------|------------|
| `title` | A → Z | Z → A |
| `createdAt` | Oldest first | Newest first |
| `updatedAt` | Oldest updated | Recently updated |
| `status` | Draft → Published | Published → Draft |

### Sorting in the Interface

1. Click any **column header** in the list view
2. Click again to reverse the sort order
3. An arrow indicator shows current sort direction

### Sort Examples

```
# Newest articles first
?sort=createdAt:DESC

# Alphabetical by title
?sort=title:ASC

# Recently updated
?sort=updatedAt:DESC
```

---

## 📄 Pagination

Large result sets are paginated for performance.

### Pagination Parameters

| Parameter | Description | Default | Max |
|-----------|-------------|---------|-----|
| `pagination[page]` | Page number (1-indexed) | 1 | — |
| `pagination[pageSize]` | Items per page | 25 | 100 |

### Pagination Syntax

```
?pagination[page]=1&pagination[pageSize]=25
```

### Pagination in Practice

| Goal | Query |
|------|-------|
| First 25 results | `pagination[page]=1&pagination[pageSize]=25` |
| Next 25 results | `pagination[page]=2&pagination[pageSize]=25` |
| Get 50 items | `pagination[page]=1&pagination[pageSize]=50` |
| Maximum items | `pagination[page]=1&pagination[pageSize]=100` |

> 💡 **Tip**: The pagination default is 25 items per page. You can request up to 100 items per page for efficiency, but larger page sizes may impact performance.

---

## 🔗 URL-Based Filtering

Filters are reflected in the URL, enabling sharing and bookmarking.

### Sharing Filtered Views

1. Apply your desired filters
2. Copy the URL from the browser address bar
3. Share the URL with team members

### Example Shareable URLs

```
# All published articles
/admin/content/articles?filters[status]=published

# Recent drafts, sorted by update date
/admin/content/articles?filters[status]=draft&sort=updatedAt:DESC

# High-view published articles
/admin/content/articles?filters[status]=published&filters[views][$gt]=1000
```

### Bookmarking Filters

1. Apply your frequently-used filters
2. Bookmark the page in your browser
3. Use the bookmark to quickly return to that filtered view

> 💡 **Tip**: Create bookmarks for common filter combinations like "My Drafts", "Recent Content", or "Published This Month" for quick access.

---

## 💾 Saving Filter Presets

> ℹ️ **Note**: Filter preset saving may vary based on your Publisher version. Check with your administrator for availability.

### If Available in Your Instance

1. **Configure Your Filters**
   
   Set up the filter combination you want to save

2. **Save the Preset**
   
   Look for a **"Save Filter"** or **"Save View"** option

3. **Name Your Preset**
   
   Give it a descriptive name like "Published This Month"

4. **Access Later**
   
   Find saved presets in a dropdown or sidebar

### Preset Ideas

| Preset Name | Filter Configuration |
|-------------|---------------------|
| "My Drafts" | Status = draft, Author = current user |
| "Needs Review" | Status = draft, Updated > 7 days ago |
| "Popular Content" | Views > 500, Status = published |
| "Recent" | Created in last 7 days |

---

## 🌐 Direct API Filtering

For programmatic access, use the API with filter parameters.

### API Filter Syntax

```bash
# Basic filter
GET /api/v1/articles?filters[status]=published

# Multiple filters
GET /api/v1/articles?filters[status]=published&filters[views][$gt]=100

# With pagination and sorting
GET /api/v1/articles?filters[status]=published&sort=createdAt:DESC&pagination[page]=1&pagination[pageSize]=25
```

### Using cURL

```bash
curl -X GET "https://your-cms.com/api/v1/articles?filters[status]=published&sort=createdAt:DESC" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Response Structure

```json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 10,
      "total": 245
    }
  }
}
```

---

## 💡 Tips for Effective Searching

> 🔍 **Start broad, then narrow**: Begin with a simple search, then add filters to refine results.

> 📋 **Use URL bookmarks**: Save common filter combinations as browser bookmarks for quick access.

> 📅 **Leverage date filters**: Date-based filtering is often the fastest way to find recent or time-specific content.

> 🏷️ **Filter by status first**: When looking for specific content, filtering by draft/published status significantly narrows results.

> ↕️ **Sort strategically**: Sort by "Updated" to find recently modified content, or by "Created" to see chronological order.

> 🔗 **Share filter URLs**: Team members can benefit from your filter configurations — just share the URL.

> ⚡ **Combine search + filters**: Use quick search for text matching, then add filters for field-specific conditions.

> 📊 **Check pagination**: If results seem incomplete, check if you're on page 1 and adjust page size if needed.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Export & Import](./02-export-import.md) | Export filtered content to files |
| [Bulk Operations](./03-bulk-operations.md) | Perform actions on filtered results |
| [Content Types Overview](../Content-Management/01-content-types-overview.md) | Understand available fields |
| [External API Usage](../API-Integrations/03-external-api-usage.md) | API filtering in detail |

---

*Next: [Export & Import →](./02-export-import.md)*
