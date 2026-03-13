---
title: "Export & Import"
description: "Learn how to export content from Publisher CMS and import data using the API, including best practices for data migration and content backups."
category: "Advanced"
tags: ["export", "import", "data", "migration", "backup", "api"]
lastUpdated: "2026-02-28"
---

# 📤 Export & Import

Moving content in and out of Publisher CMS is essential for backups, migrations, and data synchronization. This guide covers how to export content for safekeeping and import data into your CMS.

---

## 🤔 Overview

Publisher CMS provides robust content access through its API, enabling you to export and import content programmatically. While dedicated UI-based export/import features may be in development, you can accomplish these tasks effectively via the API.

### What You Can Do

| Action | Method | Description |
|--------|--------|-------------|
| **Export content** | API | Retrieve all entries from a content type |
| **Export filtered** | API | Export entries matching specific criteria |
| **Import content** | API | Create entries from external data |
| **Update content** | API | Modify existing entries via import |

### Common Use Cases

| Use Case | Description |
|----------|-------------|
| **Backup** | Regular exports for data safety |
| **Migration** | Move content between environments |
| **Synchronization** | Keep content in sync with external systems |
| **Bulk Creation** | Create many entries at once from a data source |

---

## 👥 Who Can Export & Import

Export and import operations require appropriate permissions:

| Role | Export (Read) | Import (Create) | Import (Update) |
|------|---------------|-----------------|-----------------|
| **Super Admin** | ✅ All content | ✅ All content | ✅ All content |
| **Admin** | ✅ All content | ✅ All content | ✅ All content |
| **Editor** | ✅ Assigned content | ✅ Own content | ✅ Own content |
| **Viewer** | ✅ Readable content | ❌ No | ❌ No |

> ⚠️ **Important**: Import operations require a valid API token with appropriate permissions. Contact your administrator if you need access.

---

## 📤 Exporting Content

Exporting retrieves content from Publisher for use outside the CMS.

### Export Methods Overview

| Method | Best For | Format |
|--------|----------|--------|
| **API GET Request** | Programmatic access | JSON |
| **Filtered Export** | Specific subsets | JSON |
| **Paginated Export** | Large datasets | JSON (multiple requests) |

### Exporting All Entries

Use the API to retrieve all entries from a content type:

```bash
# Get all articles
curl -X GET "https://your-cms.com/api/v1/articles" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Export with Pagination

For large content types, use pagination to retrieve all entries:

```bash
# Get first 100 entries
curl -X GET "https://your-cms.com/api/v1/articles?pagination[page]=1&pagination[pageSize]=100" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Get next 100 entries
curl -X GET "https://your-cms.com/api/v1/articles?pagination[page]=2&pagination[pageSize]=100" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Step-by-Step: Full Export Script

Here's a complete approach to export all content:

1. **Determine Total Count**
   
   ```bash
   curl -s -X GET "https://your-cms.com/api/v1/articles?pagination[pageSize]=1" \
     -H "Authorization: Bearer YOUR_TOKEN" | jq '.meta.pagination.total'
   ```

2. **Calculate Pages Needed**
   
   ```
   pages = ceil(total / pageSize)
   ```

3. **Fetch All Pages**
   
   ```bash
   for page in {1..10}; do
     curl -s -X GET "https://your-cms.com/api/v1/articles?pagination[page]=$page&pagination[pageSize]=100" \
       -H "Authorization: Bearer YOUR_TOKEN" >> "articles_page_$page.json"
   done
   ```

4. **Combine Results**
   
   ```bash
   jq -s '[.[] | .data] | add' articles_page_*.json > all_articles.json
   ```

### Export Response Format

```json
{
  "data": [
    {
      "id": 1,
      "documentId": "abc123",
      "title": "Getting Started with Publisher",
      "slug": "getting-started",
      "content": "...",
      "status": "published",
      "createdAt": "2026-01-15T10:30:00.000Z",
      "updatedAt": "2026-02-20T14:45:00.000Z"
    }
  ],
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

### Exporting Filtered Content

Apply filters to export specific subsets:

```bash
# Export only published articles
curl -X GET "https://your-cms.com/api/v1/articles?filters[status]=published&pagination[pageSize]=100" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Export articles from a date range
curl -X GET "https://your-cms.com/api/v1/articles?filters[createdAt][$gte]=2026-01-01&filters[createdAt][$lte]=2026-01-31" \
  -H "Authorization: Bearer YOUR_API_TOKEN"

# Export by author
curl -X GET "https://your-cms.com/api/v1/articles?filters[author][id]=5" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Converting Export Format

#### JSON to CSV Conversion

Use `jq` to convert JSON exports to CSV:

```bash
# Extract specific fields to CSV
jq -r '.data[] | [.id, .title, .slug, .status] | @csv' articles.json > articles.csv
```

#### JSON to Other Formats

| Target Format | Tool | Command Example |
|---------------|------|-----------------|
| CSV | jq | `jq -r '... | @csv'` |
| YAML | python | `python -c 'import yaml, json; print(yaml.dump(json.load(open("data.json"))))'` |
| XML | python | Use `dicttoxml` library |

---

## 📥 Importing Content

Importing creates or updates content entries from external data.

### Import Methods

| Method | Use Case | HTTP Method |
|--------|----------|-------------|
| **Single Entry** | Create one entry | POST |
| **Bulk Create** | Create multiple entries | Multiple POSTs |
| **Update Existing** | Modify entries | PUT |

### Preparing Import Data

Before importing, prepare your data:

1. **Format as JSON**
   
   Structure your data to match Publisher's schema:

   ```json
   {
     "data": {
       "title": "My New Article",
       "slug": "my-new-article",
       "content": "Article content here...",
       "status": "draft",
       "author": 1
     }
   }
   ```

2. **Validate Field Types**
   
   | Field Type | Expected Format |
   |------------|-----------------|
   | String | `"text value"` |
   | Text | `"long text value"` |
   | Number | `123` |
   | Boolean | `true` or `false` |
   | Date | `"2026-02-28"` or ISO 8601 |
   | Relation | `id` number or `{ connect: [ids] }` |

3. **Check Required Fields**
   
   Ensure all required fields have values

### Importing Single Entries

```bash
# Create a new article
curl -X POST "https://your-cms.com/api/v1/articles" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "title": "Imported Article",
      "slug": "imported-article",
      "content": "This content was imported via API.",
      "status": "draft"
    }
  }'
```

### Step-by-Step: Bulk Import Process

1. **Prepare Your Data File**
   
   Create a JSON file with all entries:

   ```json
   [
     {
       "title": "Article 1",
       "slug": "article-1",
       "content": "Content 1",
       "status": "draft"
     },
     {
       "title": "Article 2",
       "slug": "article-2",
       "content": "Content 2",
       "status": "draft"
     }
   ]
   ```

2. **Create Import Script**
   
   ```bash
   #!/bin/bash
   API_URL="https://your-cms.com/api/v1/articles"
   TOKEN="your_api_token"
   
   jq -c '.[]' articles.json | while read article; do
     curl -s -X POST "$API_URL" \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -d "{\"data\": $article}"
     echo "" # New line for readability
   done
   ```

3. **Run the Import**
   
   ```bash
   chmod +x import.sh
   ./import.sh
   ```

4. **Verify Results**
   
   Check that entries were created successfully

### Field Mapping

When importing from external systems, you may need to map fields:

| External Field | Publisher Field | Notes |
|----------------|-----------------|-------|
| `headline` | `title` | Rename field |
| `body` | `content` | Rename field |
| `is_published` | `status` | Convert boolean to status |
| `author_email` | `author` | Look up relation ID |

### Example: Field Mapping Script

```bash
#!/bin/bash
# Transform external data to Publisher format

jq -c '.[] | {
  title: .headline,
  slug: (.headline | ascii_downcase | gsub(" "; "-")),
  content: .body,
  status: (if .is_published then "published" else "draft" end)
}' external_data.json > publisher_ready.json
```

---

## 🔄 Handling Duplicates

When importing, you may encounter duplicate entries.

### Duplicate Detection Strategies

| Strategy | Implementation | Best For |
|----------|----------------|----------|
| **Slug-based** | Check if slug exists | URL-safe content |
| **ID-based** | Store external ID | Migrations with IDs |
| **Title-based** | Check title matches | Simple deduplication |

### Check Before Import

```bash
# Check if slug exists before creating
SLUG="my-article"
EXISTS=$(curl -s "https://your-cms.com/api/v1/articles?filters[slug]=$SLUG" \
  -H "Authorization: Bearer $TOKEN" | jq '.data | length')

if [ "$EXISTS" -eq 0 ]; then
  echo "Safe to import"
  # Run import
else
  echo "Duplicate found, skipping"
fi
```

### Update vs. Create

| Scenario | Action |
|----------|--------|
| Entry doesn't exist | POST (create new) |
| Entry exists, needs update | PUT (update existing) |
| Entry exists, no changes | Skip |

### Update Existing Entries

```bash
# Update an existing article by ID
curl -X PUT "https://your-cms.com/api/v1/articles/123" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "title": "Updated Title",
      "content": "Updated content"
    }
  }'
```

---

## ✅ Import Checklist

Before running an import:

| Step | Check |
|------|-------|
| ☐ | API token has correct permissions |
| ☐ | Data is formatted as valid JSON |
| ☐ | All required fields are present |
| ☐ | Field types match expected formats |
| ☐ | Relations reference valid IDs |
| ☐ | Slugs are unique |
| ☐ | Test with a small batch first |

---

## 🛠️ Troubleshooting Import Errors

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `401 Unauthorized` | Invalid or missing token | Check token is valid and has permissions |
| `400 Bad Request` | Invalid data format | Validate JSON structure and field types |
| `422 Validation Error` | Missing required field | Add missing required fields to payload |
| `409 Conflict` | Duplicate unique field | Use different slug or check for duplicates |
| `404 Not Found` | Invalid endpoint or ID | Verify URL and resource ID |

### Validation Error Response

```json
{
  "error": {
    "status": 400,
    "message": "Validation error",
    "details": {
      "errors": [
        {
          "path": ["data", "title"],
          "message": "Title is required",
          "name": "ValidationError"
        }
      ]
    }
  }
}
```

### Debug Tips

> 🔍 **Check the response**: Always examine error responses for specific field errors.

> 📝 **Validate JSON**: Use a JSON validator before sending requests.

> 🧪 **Test single entry**: Import one entry first to verify the format works.

> 📊 **Check logs**: Review API logs for detailed error information.

---

## 📋 Best Practices for Data Migration

### Before Migration

| Practice | Why It Matters |
|----------|----------------|
| **Backup existing data** | Can rollback if issues occur |
| **Document current state** | Know what success looks like |
| **Test in staging** | Verify process before production |
| **Plan for downtime** | Large imports may need maintenance window |

### During Migration

| Practice | Why It Matters |
|----------|----------------|
| **Use transactions** | All-or-nothing imports prevent partial data |
| **Import in batches** | Smaller batches are easier to debug |
| **Log all operations** | Track what was imported and any errors |
| **Validate after import** | Verify data integrity |

### After Migration

| Practice | Why It Matters |
|----------|----------------|
| **Verify counts** | Expected vs actual entry counts |
| **Spot check entries** | Randomly verify content accuracy |
| **Test relations** | Ensure linked content is correct |
| **Update integrations** | May need to refresh caches or webhooks |

### Migration Script Template

```bash
#!/bin/bash
# Migration script template

set -e  # Exit on error

API_URL="https://your-cms.com/api/v1"
TOKEN="your_token"
LOG_FILE="migration_$(date +%Y%m%d_%H%M%S).log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting migration..."

# Count entries to import
TOTAL=$(jq '. | length' data.json)
log "Processing $TOTAL entries..."

# Process each entry
SUCCESS=0
FAILED=0

jq -c '.[]' data.json | while read -r entry; do
  TITLE=$(echo "$entry" | jq -r '.title')
  
  if curl -sf -X POST "$API_URL/articles" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"data\": $entry}" > /dev/null; then
    log "✓ Created: $TITLE"
    ((SUCCESS++))
  else
    log "✗ Failed: $TITLE"
    ((FAILED++))
  fi
done

log "Migration complete: $SUCCESS succeeded, $FAILED failed"
```

---

## 💡 Tips for Export & Import

> 💾 **Regular backups**: Set up automated exports on a schedule for backup purposes.

> 🧪 **Test imports first**: Always test import scripts with a small subset before full imports.

> 📝 **Keep original data**: Don't delete your source data until you've verified the import.

> 🔄 **Use version control**: Store export scripts and mappings in git for tracking changes.

> ⏱️ **Off-peak imports**: Run large imports during low-traffic periods.

> 🔗 **Handle relations carefully**: Import parent content before content that references it.

> 📊 **Monitor API limits**: Large imports may hit rate limits — add delays between requests.

> 📋 **Create a rollback plan**: Know how you'll undo the import if problems occur.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [Search & Filters](./01-search-filters.md) | Filter content before exporting |
| [Bulk Operations](./03-bulk-operations.md) | Perform actions on multiple entries |
| [API Tokens](../API-Integrations/01-api-tokens.md) | Create tokens for API access |
| [External API Usage](../API-Integrations/03-external-api-usage.md) | Detailed API documentation |

---

*Previous: [Search & Filters](./01-search-filters.md) | Next: [Bulk Operations →](./03-bulk-operations.md)*
