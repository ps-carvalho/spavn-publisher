---
title: "External API Usage"
description: "A developer's guide to consuming Publisher's Content API for fetching and managing content programmatically."
category: "API & Integrations"
tags: ["api", "rest", "developer", "integration"]
lastUpdated: "2026-02-28"
---

# 🌐 External API Usage

This guide covers everything developers need to integrate with Publisher's Content API. Learn how to authenticate, fetch, create, update, and delete content programmatically.

---

## 🚀 Introduction to the Content API

Publisher automatically generates a RESTful API for each content type you create. This API follows modern conventions and provides full CRUD (Create, Read, Update, Delete) operations.

### API Characteristics

| Feature | Description |
|---------|-------------|
| **Protocol** | REST over HTTPS |
| **Format** | JSON request/response |
| **Authentication** | Bearer token (JWT or API token) |
| **Versioning** | URL-based (`/api/v1/`) |
| **Filtering** | Rich query operators |
| **Pagination** | Offset-based with metadata |

---

## 🔑 Authentication

### Bearer Token Authentication

All API requests requiring authentication use the Bearer token scheme:

```bash
curl -X GET "https://your-cms.com/api/v1/articles" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

### Public vs. Authenticated Endpoints

| Endpoint Type | Authentication | Access |
|---------------|----------------|--------|
| **List entries** | Optional | Public returns published only |
| **Get single entry** | Optional | Public returns published only |
| **Create entry** | Required | Needs valid token |
| **Update entry** | Required | Needs valid token |
| **Delete entry** | Required | Needs valid token |

> 💡 **Tip**: For read-only public content access, you don't need authentication if draft & publish is enabled. Only published content is returned.

### Getting Your API Token

See [Managing API Tokens](./01-api-tokens.md) for instructions on creating an API token.

---

## 🌍 Base URL Structure

### URL Format

```
https://your-cms-domain.com/api/v1/{pluralName}
```

| Component | Description | Example |
|-----------|-------------|---------|
| `your-cms-domain.com` | Your Publisher instance domain | `cms.example.com` |
| `/api/v1/` | API version prefix | Fixed for v1 API |
| `{pluralName}` | Plural name of content type | `articles`, `authors` |

### Examples

```bash
# List all articles
GET https://cms.example.com/api/v1/articles

# Get a specific author
GET https://cms.example.com/api/v1/authors/5

# Create a new article
POST https://cms.example.com/api/v1/articles
```

---

## 📖 Listing Content

### Basic List Request

```bash
curl -X GET "https://your-cms.com/api/v1/articles" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response Structure

```json
{
  "data": [
    {
      "id": 1,
      "title": "First Article",
      "slug": "first-article",
      "body": "Content here...",
      "excerpt": "A brief summary",
      "createdAt": "2026-02-28T10:00:00.000Z",
      "updatedAt": "2026-02-28T12:30:00.000Z",
      "publishedAt": "2026-02-28T10:00:00.000Z"
    },
    {
      "id": 2,
      "title": "Second Article",
      "slug": "second-article",
      "body": "More content...",
      "excerpt": "Another summary",
      "createdAt": "2026-02-27T09:00:00.000Z",
      "updatedAt": "2026-02-27T09:00:00.000Z",
      "publishedAt": "2026-02-27T09:00:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "pageSize": 25,
      "pageCount": 4,
      "total": 100
    }
  }
}
```

---

## 📄 Pagination

### Pagination Parameters

```bash
GET /api/v1/articles?pagination[page]=1&pagination[pageSize]=25
```

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `pagination[page]` | integer | 1 | Page number (1-indexed) |
| `pagination[pageSize]` | integer | 25 | Items per page (max: 100) |

### Pagination Example

```bash
# Get page 2 with 10 items per page
curl -X GET "https://your-cms.com/api/v1/articles?pagination[page]=2&pagination[pageSize]=10" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Pagination Metadata

```json
{
  "meta": {
    "pagination": {
      "page": 2,
      "pageSize": 10,
      "pageCount": 10,
      "total": 100
    }
  }
}
```

---

## 🔍 Filtering & Sorting

### Basic Filtering

```bash
# Filter by exact match
GET /api/v1/articles?filters[status]=published

# Filter by field
GET /api/v1/articles?filters[slug]=my-article
```

### Filter Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `$contains` | Contains substring (case-insensitive) | `filters[title][$contains]=guide` |
| `$gt` | Greater than | `filters[id][$gt]=10` |
| `$gte` | Greater than or equal | `filters[id][$gte]=10` |
| `$lt` | Less than | `filters[id][$lt]=100` |
| `$lte` | Less than or equal | `filters[id][$lte]=100` |
| `$ne` | Not equal | `filters[status][$ne]=draft` |
| *(none)* | Exact match | `filters[slug]=my-article` |

### Filter Examples

```bash
# Articles with titles containing "tutorial"
curl -X GET "https://your-cms.com/api/v1/articles?filters[title][\$contains]=tutorial"

# Articles created after a certain date
curl -X GET "https://your-cms.com/api/v1/articles?filters[createdAt][\$gt]=2026-01-01"

# Articles with ID between 10 and 50
curl -X GET "https://your-cms.com/api/v1/articles?filters[id][\$gte]=10&filters[id][\$lte]=50"
```

### Combining Filters

```bash
# Multiple filters (AND logic)
curl -X GET "https://your-cms.com/api/v1/articles?filters[status]=published&filters[category]=tech"
```

### Sorting

```bash
# Sort by creation date, descending
GET /api/v1/articles?sort=createdAt:DESC

# Sort by title, ascending
GET /api/v1/articles?sort=title:ASC

# Multiple sort fields
GET /api/v1/articles?sort=publishedAt:DESC,title:ASC
```

| Parameter | Format | Example |
|-----------|--------|---------|
| `sort` | `field:direction` | `sort=createdAt:DESC` |
| Direction | `ASC` or `DESC` | `ASC` = ascending, `DESC` = descending |

---

## 📋 Getting a Single Entry

### By ID

```bash
curl -X GET "https://your-cms.com/api/v1/articles/42" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Response

```json
{
  "data": {
    "id": 42,
    "title": "Understanding Webhooks",
    "slug": "understanding-webhooks",
    "body": "Full article content...",
    "excerpt": "Learn how webhooks work",
    "createdAt": "2026-02-28T10:00:00.000Z",
    "updatedAt": "2026-02-28T15:30:00.000Z",
    "publishedAt": "2026-02-28T10:00:00.000Z"
  }
}
```

### By Slug (using filters)

```bash
curl -X GET "https://your-cms.com/api/v1/articles?filters[slug]=my-article" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ➕ Creating Content

### Basic Create Request

```bash
curl -X POST "https://your-cms.com/api/v1/articles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My New Article",
    "slug": "my-new-article",
    "body": "This is the full article content.",
    "excerpt": "A brief summary of the article."
  }'
```

### Successful Response (201 Created)

```json
{
  "data": {
    "id": 101,
    "title": "My New Article",
    "slug": "my-new-article",
    "body": "This is the full article content.",
    "excerpt": "A brief summary of the article.",
    "createdAt": "2026-02-28T16:00:00.000Z",
    "updatedAt": "2026-02-28T16:00:00.000Z",
    "publishedAt": null
  }
}
```

### Creating with Relations

```bash
curl -X POST "https://your-cms.com/api/v1/articles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Article with Author",
    "slug": "article-with-author",
    "body": "Content here...",
    "excerpt": "Summary",
    "author": 5
  }'
```

---

## ✏️ Updating Content

### Full Update (PUT)

```bash
curl -X PUT "https://your-cms.com/api/v1/articles/42" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Updated Title",
    "slug": "updated-slug",
    "body": "Updated content",
    "excerpt": "Updated summary"
  }'
```

### Partial Update (PATCH)

```bash
# Only update specific fields
curl -X PATCH "https://your-cms.com/api/v1/articles/42" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Title Only"
  }'
```

### Successful Response (200 OK)

```json
{
  "data": {
    "id": 42,
    "title": "New Title Only",
    "slug": "updated-slug",
    "body": "Updated content",
    "excerpt": "Updated summary",
    "createdAt": "2026-02-28T10:00:00.000Z",
    "updatedAt": "2026-02-28T17:00:00.000Z",
    "publishedAt": "2026-02-28T10:00:00.000Z"
  }
}
```

---

## 🗑️ Deleting Content

### Delete Request

```bash
curl -X DELETE "https://your-cms.com/api/v1/articles/42" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Successful Response (200 OK)

```json
{
  "data": null
}
```

> ⚠️ **Warning**: Deletion is permanent. There is no undo. Consider implementing soft-delete logic in your application if needed.

---

## 📊 Complete API Reference

### Content API Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/v1/{pluralName}` | List entries | Optional* |
| `GET` | `/api/v1/{pluralName}/{id}` | Get single entry | Optional* |
| `POST` | `/api/v1/{pluralName}` | Create entry | ✅ Yes |
| `PUT` | `/api/v1/{pluralName}/{id}` | Full update | ✅ Yes |
| `PATCH` | `/api/v1/{pluralName}/{id}` | Partial update | ✅ Yes |
| `DELETE` | `/api/v1/{pluralName}/{id}` | Delete entry | ✅ Yes |

*Public endpoints return only published content. With authentication, drafts are also visible.

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/publisher/auth/login` | Authenticate user |
| `POST` | `/api/publisher/auth/logout` | End session |
| `GET` | `/api/publisher/auth/me` | Get current user |
| `GET` | `/api/publisher/tokens/` | List API tokens |
| `POST` | `/api/publisher/tokens/` | Create API token |
| `DELETE` | `/api/publisher/tokens/{id}` | Revoke API token |
| `GET` | `/api/publisher/webhooks/` | List webhooks |
| `POST` | `/api/publisher/webhooks/` | Create webhook |
| `GET` | `/api/publisher/webhooks/{id}/logs` | View webhook logs |

---

## ⚠️ Error Responses

### Error Response Format

```json
{
  "error": {
    "status": 404,
    "name": "NotFoundError",
    "message": "Entry not found",
    "details": {}
  }
}
```

### HTTP Status Codes

| Status | Meaning | Common Cause |
|--------|---------|--------------|
| **200** | OK | Request successful |
| **201** | Created | Resource created successfully |
| **400** | Bad Request | Invalid request body or parameters |
| **401** | Unauthorized | Missing or invalid token |
| **403** | Forbidden | Valid token but insufficient permissions |
| **404** | Not Found | Resource doesn't exist |
| **409** | Conflict | Duplicate entry (e.g., unique slug) |
| **422** | Unprocessable Entity | Validation error |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side error |

### Validation Error Example

```json
{
  "error": {
    "status": 422,
    "name": "ValidationError",
    "message": "Validation failed",
    "details": {
      "errors": [
        {
          "field": "title",
          "message": "Title is required"
        },
        {
          "field": "slug",
          "message": "Slug must be unique"
        }
      ]
    }
  }
}
```

---

## 🔄 Rate Limiting

### Default Limits

| Plan | Requests/minute | Burst limit |
|------|-----------------|-------------|
| **Standard** | 60 | 100 |
| **Professional** | 300 | 500 |
| **Enterprise** | Custom | Custom |

### Rate Limit Headers

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1709137200
```

### Handling Rate Limits

```javascript
// Example: Respect rate limits
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitMs = (resetTime * 1000) - Date.now();
      await new Promise(r => setTimeout(r, waitMs));
      continue;
    }
    
    return response;
  }
  throw new Error('Max retries exceeded');
}
```

---

## 💡 Best Practices

### Use Environment Variables

```bash
# .env
PUBLISHER_API_URL=https://cms.example.com/api/v1
PUBLISHER_API_TOKEN=your_token_here
```

```javascript
// config.js
module.exports = {
  apiUrl: process.env.PUBLISHER_API_URL,
  apiToken: process.env.PUBLISHER_API_TOKEN,
};
```

### Implement Caching

```javascript
// Cache responses to reduce API calls
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCached(path) {
  const cacheKey = path;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Authorization': `Bearer ${API_TOKEN}` }
  });
  const data = await response.json();
  
  cache.set(cacheKey, { data, timestamp: Date.now() });
  return data;
}
```

### Handle Errors Gracefully

```javascript
async function getArticle(id) {
  try {
    const response = await fetch(`${API_URL}/articles/${id}`, {
      headers: { 'Authorization': `Bearer ${API_TOKEN}` }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null; // Article not found
      }
      throw new Error(`API Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch article:', error);
    throw error;
  }
}
```

### Use Pagination for Large Datasets

```javascript
// Fetch all pages of articles
async function fetchAllArticles() {
  const allArticles = [];
  let page = 1;
  let hasMore = true;
  
  while (hasMore) {
    const response = await fetch(
      `${API_URL}/articles?pagination[page]=${page}&pagination[pageSize]=100`,
      { headers: { 'Authorization': `Bearer ${API_TOKEN}` } }
    );
    const { data, meta } = await response.json();
    
    allArticles.push(...data);
    hasMore = meta.pagination.page > meta.pagination.pageCount;
    page++;
  }
  
  return allArticles;
}
```

### Validate Data Before Submission

```javascript
// Always validate before creating/updating
function validateArticle(article) {
  const errors = [];
  
  if (!article.title?.trim()) {
    errors.push('Title is required');
  }
  if (!article.slug?.match(/^[a-z0-9-]+$/)) {
    errors.push('Slug must be lowercase alphanumeric with dashes');
  }
  if (article.body?.length < 50) {
    errors.push('Body must be at least 50 characters');
  }
  
  return errors;
}
```

---

## 🛠️ Code Examples

### JavaScript/Node.js Client

```javascript
class PublisherClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }
  
  async request(method, path, body = null) {
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${this.baseUrl}${path}`, options);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'API request failed');
    }
    
    return response.json();
  }
  
  // List entries
  list(contentType, params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request('GET', `/${contentType}?${query}`);
  }
  
  // Get single entry
  get(contentType, id) {
    return this.request('GET', `/${contentType}/${id}`);
  }
  
  // Create entry
  create(contentType, data) {
    return this.request('POST', `/${contentType}`, data);
  }
  
  // Update entry
  update(contentType, id, data) {
    return this.request('PATCH', `/${contentType}/${id}`, data);
  }
  
  // Delete entry
  delete(contentType, id) {
    return this.request('DELETE', `/${contentType}/${id}`);
  }
}

// Usage
const client = new PublisherClient(
  'https://cms.example.com/api/v1',
  process.env.PUBLISHER_API_TOKEN
);

// Get all articles
const articles = await client.list('articles', {
  'filters[status]': 'published',
  'sort': 'publishedAt:DESC',
  'pagination[pageSize]': 10
});

// Create new article
const newArticle = await client.create('articles', {
  title: 'Hello World',
  slug: 'hello-world',
  body: 'My first article',
  excerpt: 'Introduction'
});
```

### Python Client

```python
import requests
import os

class PublisherClient:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.token = token
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def _request(self, method, path, data=None):
        url = f"{self.base_url}{path}"
        response = requests.request(method, url, headers=self.headers, json=data)
        response.raise_for_status()
        return response.json()
    
    def list(self, content_type, params=None):
        return self._request('GET', f'/{content_type}', params)
    
    def get(self, content_type, entry_id):
        return self._request('GET', f'/{content_type}/{entry_id}')
    
    def create(self, content_type, data):
        return self._request('POST', f'/{content_type}', data)
    
    def update(self, content_type, entry_id, data):
        return self._request('PATCH', f'/{content_type}/{entry_id}', data)
    
    def delete(self, content_type, entry_id):
        return self._request('DELETE', f'/{content_type}/{entry_id}')

# Usage
client = PublisherClient(
    'https://cms.example.com/api/v1',
    os.environ.get('PUBLISHER_API_TOKEN')
)

# Get articles
articles = client.list('articles', {'pagination[pageSize]': 10})

# Create article
new_article = client.create('articles', {
    'title': 'Python Article',
    'slug': 'python-article',
    'body': 'Content here',
    'excerpt': 'Summary'
})
```

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [API Tokens](./01-api-tokens.md) | Create and manage API tokens |
| [Webhooks](./02-webhooks.md) | Real-time content notifications |
| [Content Types Overview](../Content-Management/01-content-types-overview.md) | Understanding content structure |

---

*Previous: [Configuring Webhooks ←](./02-webhooks.md)*
