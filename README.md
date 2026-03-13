<div align="center">

# CORTEX &ensp; <img src="https://img.shields.io/badge/PUBLISHER-F59E0B?style=for-the-badge" alt="Publisher" />

**Developer-first headless CMS built on Nuxt 4.**<br>
Define. Generate. Ship. With zero config.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-0.45-C5F74F)](https://orm.drizzle.team/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Quick Start](#quick-start) &ensp;&bull;&ensp; [Content Types](#content-types) &ensp;&bull;&ensp; [REST API](#rest-api) &ensp;&bull;&ensp; [Database](#database) &ensp;&bull;&ensp; [Storage](#storage) &ensp;&bull;&ensp; [Admin UI](#admin-ui) &ensp;&bull;&ensp; [Configuration](#configuration)

</div>

---

## Overview

Publisher is a headless CMS for developers who want full control over their content architecture without the complexity of enterprise solutions. Define your content models in code using `defineContentType()` — Publisher handles the rest:

- **Auto-generated REST APIs** — Every content type gets full CRUD endpoints at `/api/v1/[type]`
- **Admin Dashboard** — A complete admin UI at `/admin` for content management
- **Multi-Database** — SQLite (zero-config) or PostgreSQL (production-ready) via a single env var
- **Cloud Storage** — Local filesystem, Cloudflare R2, or S3-compatible storage
- **JWT Auth** — Session cookies for admin, API tokens for headless access

## Features

- **Content Type System** — Define models with `defineContentType()` and 14+ field types
- **Auto-generated APIs** — RESTful CRUD with filtering, sorting, and pagination
- **Admin Dashboard** — Full-featured UI for content, media, users, and settings
- **Media Library** — Upload, organize in folders, auto-generate image variants
- **Page Builder** — Modular page composition with 18 block types
- **Multi-Database** — SQLite for dev, PostgreSQL for production — same codebase
- **Cloud Storage** — Local, Cloudflare R2, or S3 with hot-swap support
- **Authentication** — JWT sessions + API tokens with role-based access
- **Webhooks** — Trigger external services on content events
- **Draft & Publish** — Built-in workflow with draft/published states
- **Soft Delete** — Recover deleted content with trash functionality
- **Folder Permissions** — RBAC folder-level access control for media

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Nuxt 4](https://nuxt.com/) + [Nitro](https://nitro.build/) |
| UI | [Vue 3.5](https://vuejs.org/) + [Nuxt UI](https://ui.nuxt.com/) |
| Database | [SQLite](https://sqlite.org/) or [PostgreSQL](https://postgresql.org/) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Validation | [Zod](https://zod.dev/) |
| Auth | [jose](https://github.com/panva/jose) (JWT) |
| Storage | Local / [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/) / S3 |

---

## Quick Start

### Prerequisites

- Node.js 18+ (20+ recommended)
- npm, pnpm, yarn, or bun
- Docker (optional, for PostgreSQL)

### Installation

```bash
git clone https://github.com/ps-carvalho/cortex-publisher.git
cd cortex-publisher
npm install
```

### Environment Setup

```bash
cp .env.example .env
```

Generate a JWT secret and add it to `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

```env
PUBLISHER_SECRET=your-generated-secret-here
```

### Start Development

```bash
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin) — login with `admin@publisher.local` / `admin`.

> **Note:** SQLite is the default. The database is automatically created on first run. See [Database](#database) to switch to PostgreSQL.

---

## Content Types

Define content models in `content-types/` using `defineContentType()`. Publisher auto-generates the database table, REST API, and admin UI.

### Example

```typescript
// content-types/article.ts
import { defineContentType } from '../lib/publisher/defineContentType'

export default defineContentType({
  name: 'article',
  displayName: 'Article',
  pluralName: 'articles',
  icon: 'i-heroicons-document-text',
  description: 'Blog posts and articles',
  options: {
    draftAndPublish: true,
    timestamps: true,
    softDelete: true,
  },
  fields: {
    title: { type: 'string', required: true, maxLength: 255, label: 'Title' },
    slug: { type: 'uid', targetField: 'title', label: 'Slug' },
    body: { type: 'richtext', label: 'Body' },
    excerpt: { type: 'text', label: 'Excerpt' },
    author: { type: 'relation', relationTo: 'author', relationType: 'manyToOne' },
    cover: { type: 'media', label: 'Cover Image' },
  },
})
```

### Field Types

| Type | Description | Example |
|------|-------------|---------|
| `string` | Short text (max 255) | Titles, names |
| `text` | Long-form text | Descriptions, bios |
| `richtext` | HTML content | Article bodies |
| `number` | Numeric values | Prices, counts |
| `boolean` | True/false | Featured, active |
| `date` | Date (YYYY-MM-DD) | Birth dates |
| `datetime` | Date + time | Published at |
| `uid` | Auto-slug from field | URL identifiers |
| `media` | File uploads | Images, documents |
| `relation` | Link to content type | Authors, categories |
| `enum` | Predefined options | Status, category |
| `json` | Structured data | Metadata, settings |
| `email` | Email address | Contact emails |
| `password` | Hashed string | API keys |

---

## REST API

Every content type gets a full REST API at `/api/v1/[pluralName]`.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/articles` | List (paginated, filtered, sorted) |
| `GET` | `/api/v1/articles/:id` | Get by ID |
| `POST` | `/api/v1/articles` | Create *(auth required)* |
| `PATCH` | `/api/v1/articles/:id` | Partial update *(auth required)* |
| `PUT` | `/api/v1/articles/:id` | Full replace *(auth required)* |
| `DELETE` | `/api/v1/articles/:id` | Delete *(auth required)* |

### Query Parameters

```bash
# Pagination
GET /api/v1/articles?pagination[page]=1&pagination[pageSize]=10

# Filtering
GET /api/v1/articles?filters[status]=published
GET /api/v1/articles?filters[title][$contains]=tutorial
GET /api/v1/articles?filters[views][$gte]=100

# Sorting
GET /api/v1/articles?sort=createdAt:desc
```

Operators: `$contains`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`

### Authentication

```bash
# API Token (headless access)
curl -H "Authorization: Bearer your-api-token" \
  https://your-cms.com/api/v1/articles

# Health check (no auth required)
curl https://your-cms.com/api/publisher/health
```

---

## Database

Publisher supports **SQLite** (zero-config default) and **PostgreSQL** (production-ready). Switch with a single environment variable.

### SQLite (Default)

No configuration needed. A SQLite database is created at `.data/publisher.db` on first run.

### PostgreSQL

#### Option 1: Docker (recommended for local dev)

```bash
docker compose up -d
```

Add to `.env`:

```env
DATABASE_URL=postgresql://publisher:publisher@localhost:5433/publisher_test
```

#### Option 2: External PostgreSQL

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

#### Option 3: Individual env vars

```env
DB_PROVIDER=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=publisher
DB_PASSWORD=publisher
DB_NAME=publisher_cms
```

### Configuration Priority

| Priority | Source | Example |
|----------|--------|---------|
| 1 (highest) | `DATABASE_URL` env var | `postgresql://...` |
| 2 | `DB_*` env vars | `DB_HOST`, `DB_PORT`, etc. |
| 3 | `publisher.config.ts` | `database: { provider: 'postgres' }` |
| 4 (default) | Built-in | SQLite at `.data/publisher.db` |

### Health Check

```bash
curl http://localhost:3000/api/publisher/health
```

```json
{
  "status": "healthy",
  "provider": "postgres",
  "responseTimeMs": 3,
  "pool": {
    "activeConnections": 0,
    "idleConnections": 2,
    "queriesExecuted": 55,
    "isHealthy": true
  }
}
```

---

## Storage

Publisher supports multiple storage backends for file uploads.

| Provider | Best For | Config |
|----------|----------|--------|
| **Local** (default) | Development, small deployments | `PUBLISHER_UPLOAD_DIR` |
| **Cloudflare R2** | Production, zero egress fees | `PUBLISHER_R2_*` env vars |
| **S3-compatible** | AWS, MinIO, DigitalOcean Spaces | `PUBLISHER_S3_*` env vars |

Configure in `publisher.config.ts` or via environment variables. See `.env.example` for all options.

---

## Admin UI

Access the admin dashboard at `/admin`.

### Default Credentials

| Field | Value |
|-------|-------|
| Email | `admin@publisher.local` |
| Password | `admin` |

> **Change these immediately in production.**

### Sections

| Section | Path | Description |
|---------|------|-------------|
| Content | `/admin/content/[type]` | Manage entries for each content type |
| Media | `/admin/media` | Upload, organize in folders, image variants |
| Pages | `/admin/pages` | Page builder with modular blocks |
| Types | `/admin/types` | View registered content types |
| Settings | `/admin/settings` | Users, tokens, webhooks |

---

## Configuration

### publisher.config.ts

```typescript
export default {
  appName: 'Publisher',

  defaultAdmin: {
    email: 'admin@publisher.local',
    password: 'admin',
  },

  database: {
    provider: 'sqlite',           // 'sqlite' | 'postgres'
    sqlitePath: '.data/publisher.db',
  },

  auth: {
    tokenExpiry: '7d',
    cookieName: 'publisher-session',
    saltRounds: 12,
  },

  uploads: {
    maxFileSize: 10 * 1024 * 1024,  // 10MB
    imageSizes: {
      thumbnail: 245,
      small: 500,
      medium: 750,
      large: 1000,
    },
  },

  roles: {
    'super-admin': { label: 'Super Admin' },
    'admin':       { label: 'Admin' },
    'editor':      { label: 'Editor' },
    'viewer':      { label: 'Viewer' },
  },
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PUBLISHER_SECRET` | Yes | — | JWT signing secret |
| `DATABASE_URL` | No | SQLite | `postgresql://...` for PostgreSQL |
| `PUBLISHER_UPLOAD_DIR` | No | `public/uploads` | Upload directory |
| `PUBLISHER_R2_*` | No | — | Cloudflare R2 credentials |
| `PUBLISHER_S3_*` | No | — | S3-compatible credentials |

---

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Project Structure

```
cortex-publisher/
├── app/                          # Nuxt frontend
│   ├── components/publisher/     # Admin UI components
│   └── pages/admin/              # Admin pages
│
├── content-types/                # Content type definitions
├── block-types/                  # Page builder block types (18 blocks)
├── page-types/                   # Page type definitions
│
├── lib/publisher/                # Core library
│   ├── defineContentType.ts      # Content type helper
│   └── types.ts                  # TypeScript types
│
├── server/
│   ├── api/v1/                   # Auto-generated content APIs
│   ├── api/publisher/            # Admin APIs (auth, media, users, webhooks)
│   ├── plugins/publisher-db.ts   # Database initialization
│   └── utils/publisher/
│       ├── database/             # Multi-database abstraction layer
│       │   ├── index.ts          # Provider factory (SQLite/PostgreSQL)
│       │   ├── queries.ts        # Dialect-aware query helpers
│       │   ├── dialect.ts        # SQL dialect helpers
│       │   └── schema/           # Drizzle schema (sqlite.ts, postgres.ts)
│       ├── storage/              # Multi-storage abstraction layer
│       │   ├── registry.ts       # Storage provider registry
│       │   └── providers/        # Local, R2, S3 providers
│       ├── schemaCompiler.ts     # Dynamic DDL generation
│       └── registry.ts           # Content type registry
│
├── publisher.config.ts           # Publisher configuration
├── docker-compose.yml            # PostgreSQL for development
└── nuxt.config.ts                # Nuxt configuration
```

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
