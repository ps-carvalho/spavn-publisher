<div align="center">

# CORTEX &ensp; <img src="https://img.shields.io/badge/PUBLISHER-F59E0B?style=for-the-badge" alt="Publisher" />

**Developer-first headless CMS built on Nuxt 4.**<br>
Define content models in code. Generate APIs automatically. Ship with zero config.

[![Nuxt](https://img.shields.io/badge/Nuxt-4.3.1-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![Vue](https://img.shields.io/badge/Vue-3.5-4FC08D?logo=vue.js)](https://vuejs.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle-0.45-C5F74F)](https://orm.drizzle.team/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white)](https://sqlite.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

[Quick Start](#quick-start) • [Content Types](#content-types) • [REST API](#rest-api) • [Authentication](#authentication) • [Database](#database) • [Storage](#storage) • [Admin UI](#admin-ui)

</div>

---

## Overview

Publisher is a headless CMS for developers who want full control over their content architecture without the complexity of enterprise solutions. Define your content models in code using `defineContentType()` — Publisher handles the rest:

- **Auto-generated REST APIs** — Every content type gets full CRUD endpoints at `/api/v1/[type]`
- **Admin Dashboard** — A complete admin UI at `/admin` for content management
- **Multi-Database** — SQLite (zero-config) or PostgreSQL (production-ready) via a single env var
- **Cloud Storage** — Local filesystem, Cloudflare R2, or S3-compatible storage
- **Multi-Method Auth** — JWT sessions, API tokens, TOTP, WebAuthn/passkeys, and magic links
- **Page Builder** — Modular page composition with reusable content blocks

## Features

### Core CMS
- **Content Type System** — Define models with `defineContentType()` and 14+ field types
- **Auto-generated APIs** — RESTful CRUD with filtering, sorting, and pagination
- **Admin Dashboard** — Full-featured UI for content, media, users, and settings
- **Media Library** — Upload, organize in folders, auto-generate image variants
- **Page Builder** — Modular page composition with 18+ block types
- **Menu System** — Hierarchical navigation with drag-and-drop reordering
- **Draft & Publish** — Built-in workflow with draft/published states
- **Soft Delete** — Recover deleted content with trash functionality

### Authentication & Security
- **Multi-Method Auth** — Passwordless magic links, TOTP (authenticator apps), WebAuthn/passkeys
- **Device Tracking** — Automatic device fingerprinting with new-device alerts
- **Rate Limiting** — Built-in protection against brute-force attacks
- **RBAC** — Role-based access control with 4 built-in roles (Super Admin, Admin, Editor, Viewer)
- **API Tokens** — Generate tokens for headless API access
- **JWT Sessions** — Secure session management with configurable expiry

### Infrastructure
- **Multi-Database** — SQLite for dev, PostgreSQL for production — same codebase
- **Cloud Storage** — Local, Cloudflare R2, or S3 with hot-swap support
- **Webhooks** — Trigger external services on content events
- **Email Integration** — SMTP, SendGrid, or console (dev) for transactional emails

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Nuxt 4](https://nuxt.com/) + [Nitro](https://nitro.build/) |
| UI | [Vue 3.5](https://vuejs.org/) + [Nuxt UI](https://ui.nuxt.com/) |
| Database | [SQLite](https://sqlite.org/) or [PostgreSQL](https://postgresql.org/) |
| ORM | [Drizzle ORM](https://orm.drizzle.team/) |
| Validation | [Zod](https://zod.dev/) |
| Auth | [jose](https://github.com/panva/jose) (JWT), [otpauth](https://github.com/hectorm/otpauth) (TOTP), [@simplewebauthn](https://simplewebauthn.dev/) |
| Storage | [@aws-sdk/client-s3](https://aws.amazon.com/s3/) (S3-compatible) |
| Email | [nodemailer](https://nodemailer.com/), [@sendgrid/mail](https://sendgrid.com/) |

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

Define content models in the `content-types/` directory using `defineContentType()`. Publisher auto-generates the database table, REST API, and admin UI.

### Example

```typescript
// content-types/article.ts
import { defineContentType } from './lib/publisher/defineContentType'

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

**Operators:** `$contains`, `$gt`, `$gte`, `$lt`, `$lte`, `$ne`

### Authentication

```bash
# API Token (headless access)
curl -H "Authorization: Bearer your-api-token" \
  https://your-cms.com/api/v1/articles

# Health check (no auth required)
curl https://your-cms.com/api/publisher/health
```

---

## Authentication

Publisher supports multiple authentication methods out of the box. All methods can be enabled simultaneously.

### Available Methods

| Method | Description | Best For |
|--------|-------------|----------|
| **Magic Links** | Passwordless email-based login | Occasional users, editors |
| **TOTP** | Time-based one-time passwords (Google Authenticator, Authy) | Security-conscious users |
| **WebAuthn/Passkeys** | Biometric authentication (Touch ID, Face ID, Windows Hello) | Modern devices, passwordless |
| **API Tokens** | Bearer tokens for programmatic access | Headless integrations |

### Device Security

- **Device Fingerprinting** — Automatic tracking of login devices
- **New Device Alerts** — Email notifications when unrecognized devices log in
- **Trusted Devices** — Mark devices as trusted to skip 2FA on future logins

### Configuration

See `publisher.config.ts` for auth settings:

```typescript
auth: {
  tokenExpiry: '7d',
  cookieName: 'publisher-session',
  hashAlgorithm: 'pbkdf2',
  iterations: 100_000,
}

totp: {
  issuer: 'Publisher CMS',
  digits: 6,
  period: 30,
  window: 1, // ±30 seconds tolerance
}

webauthn: {
  rpName: 'Publisher CMS',
  rpID: 'localhost', // Change to your domain in production
  origin: 'http://localhost:3000',
}
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

Publisher supports multiple storage backends for file uploads. Configure in `publisher.config.ts` or via environment variables.

| Provider | Best For | Config |
|----------|----------|--------|
| **Local** (default) | Development, small deployments | `PUBLISHER_UPLOAD_DIR` |
| **Cloudflare R2** | Production, zero egress fees | `PUBLISHER_R2_*` env vars |
| **S3-compatible** | AWS, MinIO, DigitalOcean Spaces | `PUBLISHER_S3_*` env vars |

### Image Processing

Uploaded images automatically generate variants:

| Variant | Size | Use Case |
|---------|------|----------|
| `thumbnail` | 245px | Thumbnails, previews |
| `small` | 500px | Small displays |
| `medium` | 750px | Standard content |
| `large` | 1000px | Full-width images |

### Configuration

```typescript
storage: {
  defaultProvider: 'local',
  providers: {
    local: {
      type: 'local',
      basePath: './public/uploads',
      baseUrl: '/uploads',
      default: true,
    },
    // R2 and S3 configurations available
  },
}
```

See `.env.example` for all storage environment variables.

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
| Dashboard | `/admin` | Overview, quick actions |
| Content | `/admin/content/[type]` | Manage entries for each content type |
| Media | `/admin/media` | Upload, organize in folders, image variants |
| Pages | `/admin/pages` | Page builder with modular blocks |
| Menus | `/admin/menus` | Hierarchical navigation menus |
| Types | `/admin/types` | View registered content types |
| Users | `/admin/users` | User management, role assignment |
| Settings | `/admin/settings` | Tokens, webhooks, system config |

### Design System

- **Primary Color:** Amber (`amber-600`)
- **Neutrals:** Stone palette
- **Components:** Nuxt UI (unstyled, accessible)
- **Dark Mode:** Full system preference support

---

## Configuration

### publisher.config.ts

```typescript
export default {
  appName: 'Publisher',

  defaultAdmin: {
    email: 'admin@publisher.local',
    password: 'admin',
    firstName: 'Admin',
    lastName: 'User',
  },

  features: {
    allowMultipleAuthMethods: true,
  },

  auth: {
    tokenExpiry: '7d',
    cookieName: 'publisher-session',
    hashAlgorithm: 'pbkdf2',
    iterations: 100_000,
  },

  totp: {
    issuer: 'Publisher CMS',
    digits: 6,
    period: 30,
    window: 1,
  },

  webauthn: {
    rpName: 'Publisher CMS',
    rpID: 'localhost',
    origin: 'http://localhost:3000',
  },

  security: {
    notifyNewDevices: true,
    maxDevicesPerUser: 10,
    deviceTracking: true,
  },

  uploads: {
    maxFileSize: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
    imageSizes: {
      thumbnail: 245,
      small: 500,
      medium: 750,
      large: 1000,
    },
  },

  pagination: {
    defaultPageSize: 25,
    maxPageSize: 100,
  },

  roles: {
    'super-admin': { label: 'Super Admin', description: 'Full access' },
    'admin':       { label: 'Admin', description: 'Content + users' },
    'editor':      { label: 'Editor', description: 'Own content' },
    'viewer':      { label: 'Viewer', description: 'Read-only' },
  },

  database: {
    provider: 'postgres',
    url: process.env.DATABASE_URL,
    poolSize: 10,
  },

  storage: {
    defaultProvider: 'local',
    providers: { /* ... */ },
  },

  email: {
    defaultProvider: 'console',
    providers: { /* ... */ },
  },
}
```

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PUBLISHER_SECRET` | Yes | — | JWT signing secret |
| `DATABASE_URL` | No | SQLite | `postgresql://...` for PostgreSQL |
| `PUBLISHER_RP_ID` | No | `localhost` | WebAuthn relying party ID |
| `PUBLISHER_TOTP_ISSUER` | No | `Publisher CMS` | TOTP issuer name |
| `PUBLISHER_EMAIL_PROVIDER` | No | `console` | Email provider (smtp/sendgrid/console) |
| `PUBLISHER_STORAGE_DEFAULT` | No | `local` | Storage provider |
| `PUBLISHER_UPLOAD_DIR` | No | `public/uploads` | Local upload directory |

See `.env.example` for the complete list.

---

## Development

```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm run test         # Run tests
npm run test:watch   # Watch mode
```

### Project Structure

```
cortex-publisher/
├── app/                          # Nuxt application
│   ├── assets/                   # CSS, images
│   ├── layouts/                  # App layouts
│   └── pages/                    # App pages
│
├── lib/
│   ├── publisher/                # Core CMS library
│   │   ├── defineContentType.ts  # Content type helper
│   │   ├── defineBlockType.ts    # Block type helper
│   │   ├── defineMenu.ts         # Menu helper
│   │   └── types.ts              # TypeScript types
│   │
│   └── publisher-admin/          # Admin UI layer
│       ├── components/           # Reusable components
│       ├── composables/          # Vue composables
│       ├── middleware/           # Auth middleware
│       ├── pages/                # Admin pages
│       └── nuxt.config.ts        # Layer config
│
├── server/
│   ├── api/
│   │   ├── v1/                   # Auto-generated content APIs
│   │   └── publisher/            # Admin APIs
│   │       ├── auth/             # Authentication endpoints
│   │       ├── media/            # Media management
│   │       ├── users/            # User management
│   │       ├── webhooks/         # Webhook management
│   │       └── health.get.ts     # Health check
│   │
│   ├── core/                     # Core server utilities
│   ├── database/                 # Database utilities
│   ├── middleware/               # Server middleware
│   ├── plugins/                  # Server plugins
│   └── utils/
│       └── publisher/            # Publisher utilities
│           ├── database/         # Multi-database layer
│           ├── storage/          # Multi-storage layer
│           ├── email/            # Email providers
│           ├── auth.ts           # Auth utilities
│           ├── totp.ts           # TOTP handling
│           ├── webauthn.ts       # WebAuthn handling
│           ├── magicLink.ts      # Magic link emails
│           ├── deviceFingerprint.ts
│           ├── rateLimit.ts      # Rate limiting
│           ├── webhooks.ts       # Webhook dispatcher
│           └── schemaCompiler.ts # Dynamic schema generation
│
├── docs/                         # Documentation
│   ├── UserGuide/                # User documentation
│   ├── features/                 # Feature specs
│   ├── decisions/                # Architecture decisions
│   └── flows/                    # Process flows
│
├── .spavn/                       # Design & planning
│   ├── design-spec.md            # Design specification
│   └── plans/                    # Development plans
│
├── publisher.config.ts           # CMS configuration
├── nuxt.config.ts                # Nuxt configuration
├── drizzle.config.ts             # Drizzle ORM config
├── docker-compose.yml            # PostgreSQL for dev
└── package.json
```

---

## Documentation

Comprehensive documentation is available in the `docs/` directory:

- **[User Guide](docs/UserGuide/)** — Content management, media library, user administration
- **[Features](docs/features/)** — Feature specifications and implementation details
- **[Decisions](docs/decisions/)** — Architecture decision records (ADRs)
- **[Flows](docs/flows/)** — API and user interaction flow diagrams

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License — see [LICENSE](LICENSE) for details.
