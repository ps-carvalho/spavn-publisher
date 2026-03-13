---
title: "Configuring Webhooks"
description: "Set up webhooks to receive real-time notifications when content changes in Publisher CMS."
category: "API & Integrations"
tags: ["webhooks", "automation", "notifications", "api"]
lastUpdated: "2026-02-28"
---

# 🔗 Configuring Webhooks

Webhooks allow external applications to receive real-time notifications when content changes in Publisher. This guide covers creating, testing, and troubleshooting webhooks.

---

## 🤔 What Are Webhooks?

Webhooks are HTTP callbacks that notify your application when specific events occur. Instead of constantly polling the API for changes, webhooks push data to you in real-time.

### How Webhooks Work

```
┌─────────────┐     Content Created      ┌─────────────────┐
│  Publisher  │ ──────────────────────▶  │  Your Server    │
│     CMS     │     POST /webhook        │  /api/webhooks  │
└─────────────┘                          └─────────────────┘
                                                │
                                                ▼
                                         Process the event
                                         (update cache, send
                                          notifications, etc.)
```

### Webhooks vs. Polling

| Approach | Efficiency | Latency | Complexity |
|----------|------------|---------|------------|
| **Webhooks** | ✅ High — only sends when needed | ✅ Real-time | Medium |
| **Polling** | ❌ Low — constant requests | ❌ Delayed | Low |

---

## 💡 Common Use Cases

| Use Case | Description |
|----------|-------------|
| **Cache Invalidation** | Clear CDN/frontend cache when content updates |
| **Search Indexing** | Sync content to Elasticsearch, Algolia, etc. |
| **Notifications** | Send Slack/Email alerts on content changes |
| **CI/CD Triggers** | Automatically rebuild static sites |
| **Data Synchronization** | Sync content to external databases or CRMs |
| **Audit Logging** | Send events to external monitoring systems |

---

## 👥 Who Can Manage Webhooks?

| Role | Create Webhooks | View Webhooks | Delete Webhooks |
|------|-----------------|---------------|-----------------|
| **Super Admin** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Admin** | ❌ No | ✅ Yes | ❌ No |
| **Editor** | ❌ No | ❌ No | ❌ No |
| **Viewer** | ❌ No | ❌ No | ❌ No |

> ⚠️ **Important**: Only Super Admins can create and delete webhooks. Admins can view webhook logs for monitoring.

---

## ➕ Creating a Webhook

### Step-by-Step Instructions

1. **Navigate to Webhooks**
   
   Log in to the Publisher admin panel and go to **Settings → Webhooks**.

2. **Create New Webhook**
   
   Click the **"Create Webhook"** button.

3. **Configure Webhook Settings**
   
   | Field | Description | Example |
   |-------|-------------|---------|
   | **Name** | Descriptive identifier | "Production Site Rebuild" |
   | **URL** | Endpoint to receive payloads | `https://yoursite.com/api/webhook` |
   | **Secret** | Signing key (auto-generated) | Used for HMAC verification |
   | **Events** | Triggers to subscribe to | See [Available Events](#-available-events) |
   | **Active** | Enable/disable webhook | Toggle on/off |

4. **Select Events**
   
   Choose which content events should trigger the webhook:
   
   ```
   ☑ Articles - Created
   ☑ Articles - Updated
   ☑ Articles - Deleted
   ☐ Authors - Created
   ☐ Authors - Updated
   ☐ Authors - Deleted
   ```

5. **Save the Webhook**
   
   Click **"Create Webhook"** to save your configuration.

---

## 📋 Available Events

### Content Events

| Event | Trigger | Content Types |
|-------|---------|---------------|
| `entry.created` | New content entry created | All content types |
| `entry.updated` | Existing entry modified | All content types |
| `entry.deleted` | Entry removed | All content types |
| `entry.published` | Draft entry published | Content types with drafts enabled |
| `entry.unpublished` | Published entry unpublished | Content types with drafts enabled |

### Event Filtering by Content Type

When configuring a webhook, you can select specific content types:

| Content Type | Events Available |
|--------------|------------------|
| **Articles** | created, updated, deleted, published |
| **Authors** | created, updated, deleted |
| **Categories** | created, updated, deleted |
| *Custom Types* | created, updated, deleted |

---

## 📨 Webhook Payload

### Payload Structure

When an event occurs, Publisher sends a POST request to your configured URL:

```json
{
  "event": "entry.created",
  "createdAt": "2026-02-28T15:30:00.000Z",
  "model": "articles",
  "entry": {
    "id": 42,
    "title": "My New Article",
    "slug": "my-new-article",
    "body": "Article content here...",
    "excerpt": "A brief summary",
    "createdAt": "2026-02-28T15:30:00.000Z",
    "updatedAt": "2026-02-28T15:30:00.000Z",
    "publishedAt": "2026-02-28T15:30:00.000Z"
  }
}
```

### Headers Sent

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Type` | `application/json` | Payload format |
| `X-Publisher-Signature` | `sha256=...` | HMAC signature for verification |
| `X-Publisher-Event` | `entry.created` | Event type |
| `X-Publisher-Delivery` | `uuid` | Unique delivery ID |

---

## 🔐 Webhook Security

### HMAC Signature Verification

Every webhook is signed with HMAC-SHA256 using your webhook secret. Always verify signatures to ensure requests are from Publisher.

```javascript
// Node.js example
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expectedSignature = 'sha256=' + 
    crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Usage in Express
app.post('/api/webhook', (req, res) => {
  const signature = req.headers['x-publisher-signature'];
  const secret = process.env.WEBHOOK_SECRET;
  
  if (!verifySignature(req.body, signature, secret)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Process the webhook
  console.log('Verified webhook:', req.body);
  res.status(200).send('OK');
});
```

```python
# Python example
import hmac
import hashlib

def verify_signature(payload, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected)
```

### Security Best Practices

| Practice | Why It Matters |
|----------|----------------|
| ✅ Always verify signatures | Prevents spoofed webhook requests |
| ✅ Use HTTPS endpoints | Encrypts data in transit |
| ✅ Keep secrets secure | Never expose webhook secrets |
| ✅ Validate event types | Only process expected events |
| ❌ Don't trust IP addresses | IPs can be spoofed |

---

## 🧪 Testing Webhooks

### Using the Test Feature

1. Navigate to **Settings → Webhooks**
2. Click on the webhook you want to test
3. Click the **"Send Test"** button
4. Check the response status

### Test Payload

The test sends a sample payload:

```json
{
  "event": "entry.created",
  "createdAt": "2026-02-28T15:30:00.000Z",
  "model": "articles",
  "entry": {
    "id": 1,
    "title": "Test Article",
    "slug": "test-article",
    "body": "This is a test webhook payload",
    "excerpt": "Test excerpt"
  }
}
```

### Using a Local Test Server

For development, use a service like ngrok to receive webhooks locally:

```bash
# Install ngrok
brew install ngrok

# Create a tunnel to your local server
ngrok http 3000

# Use the ngrok URL in your webhook configuration
# https://abc123.ngrok.io/api/webhook
```

### Using Webhook Testing Services

| Service | Use Case |
|---------|----------|
| [webhook.site](https://webhook.site) | Quick testing, inspect payloads |
| [RequestBin](https://requestbin.com) | Debug webhook requests |
| [ngrok](https://ngrok.com) | Local development testing |

---

## 📊 Viewing Webhook Logs

Publisher maintains detailed logs of all webhook deliveries.

### Accessing Logs

1. Go to **Settings → Webhooks**
2. Click on a webhook
3. Select the **"Logs"** tab

### Log Information

| Field | Description |
|-------|-------------|
| **Timestamp** | When the webhook was sent |
| **Event** | Type of event that triggered it |
| **Status** | HTTP response code (200, 404, 500, etc.) |
| **Attempts** | Number of delivery attempts |
| **Response Time** | How long your server took to respond |
| **Payload** | Full request body sent |
| **Response** | Response body from your server |

### Log Retention

Webhook logs are stored in the `publisher_webhook_logs` table:

- **Retention period**: 30 days by default
- **Storage**: Automatic cleanup of old logs
- **Export**: Available via Admin API

---

## 🔄 Retry Behavior

When a webhook delivery fails, Publisher automatically retries:

| Attempt | Delay | Example Timeline |
|---------|-------|------------------|
| **1st** | Immediate | 0:00 - Initial attempt |
| **2nd** | 30 seconds | 0:30 - First retry |
| **3rd** | 5 minutes | 5:30 - Second retry |

### Retry Conditions

| Status Code | Action |
|-------------|--------|
| **2xx** (200-299) | ✅ Success — No retry |
| **3xx** (300-399) | ⚠️ Follow redirect |
| **4xx** (400-499) | ❌ Fail — No retry (client error) |
| **5xx** (500-599) | 🔄 Retry — Server error |
| **Timeout** | 🔄 Retry — No response in 10s |

### After Failed Retries

If all retry attempts fail:

- Webhook is marked as **Failed**
- Entry is preserved in logs
- No automatic re-enablement

---

## 🚨 Troubleshooting

### Common Issues

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| **404 Not Found** | Wrong URL | Verify endpoint URL |
| **401 Unauthorized** | Signature verification failing | Check secret configuration |
| **408 Timeout** | Server too slow | Optimize endpoint response |
| **500 Server Error** | Your server crashing | Check server logs |
| **No webhooks received** | Webhook disabled | Check "Active" toggle |

### Debugging Checklist

```
☐ Webhook is marked "Active"
☐ URL is correct and accessible
☐ Server accepts POST requests
☐ Endpoint returns 2xx status code
☐ Response time is under 10 seconds
☐ Signature verification is implemented correctly
☐ Firewall allows incoming connections
```

### Checking Logs

```bash
# Via API - get recent webhook logs
curl -X GET "https://your-cms.com/api/publisher/webhooks/123/logs" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

### Example Log Response

```json
{
  "data": [
    {
      "id": 456,
      "webhookId": 123,
      "event": "entry.created",
      "status": 200,
      "attempts": 1,
      "responseTime": 245,
      "createdAt": "2026-02-28T15:30:00.000Z",
      "payload": { ... },
      "response": "OK"
    }
  ]
}
```

---

## 💡 Tips & Best Practices

> ⚡ **Respond quickly**: Your endpoint should respond within 10 seconds. Process webhooks asynchronously if needed.

> 🔄 **Make webhooks idempotent**: Handle duplicate deliveries gracefully using the `X-Publisher-Delivery` header.

> 📝 **Log everything**: Keep your own logs of received webhooks for debugging.

> 🔐 **Verify signatures**: Never skip signature verification in production.

> 🧪 **Test failure scenarios**: Ensure your system handles webhook downtime gracefully.

---

## 🔗 Related Guides

| Guide | Description |
|-------|-------------|
| [API Tokens](./01-api-tokens.md) | Secure API authentication |
| [External API Usage](./03-external-api-usage.md) | Consuming the Content API |
| [Publishing Workflow](../Content-Management/04-publishing-workflow.md) | Content publication process |

---

*Previous: [Managing API Tokens ←](./01-api-tokens.md)*

*Next: [External API Usage →](./03-external-api-usage.md)*
