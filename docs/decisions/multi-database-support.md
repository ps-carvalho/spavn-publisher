# Multi-Database Support

> **Decision Date:** 2026-03-01
> **Status:** Implemented
> **Related Files:** `server/utils/publisher/database/`

## Decision

Publisher CMS now supports multiple database backends: **SQLite** (default) and **PostgreSQL**. This flexibility was added to support different deployment scenarios:

| Database | Use Case |
|----------|----------|
| **SQLite** | Development, local testing, small deployments, single-server setups |
| **PostgreSQL** | Production with high traffic, concurrent users, horizontal scaling |

The provider abstraction layer allows adding MySQL/MariaDB support in the future without significant architecture changes.

---

## Database Configuration

Configuration is defined in `publisher.config.ts`:

### SQLite (Default)

```typescript
export default {
  // ... other config
  
  database: {
    provider: 'sqlite' as const,
    sqlitePath: '.data/publisher.db',
  },
}
```

SQLite requires zero configuration — it works out of the box with a file-based database stored in `.data/publisher.db`.

### PostgreSQL

Uncomment and configure the PostgreSQL section in `publisher.config.ts`:

```typescript
export default {
  // ... other config
  
  database: {
    provider: 'postgres' as const,
    /** Full connection URL (recommended) */
    url: process.env.DATABASE_URL,
    /** Or configure individual connection settings */
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'publisher',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'publisher',
    /** Connection pool size (default: 10) */
    poolSize: 10,
  },
}
```

---

## Environment Variables

Database configuration can be set via environment variables with the following priority:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 (highest) | `DATABASE_URL` | Full connection URL — auto-detects provider from scheme |
| 2 | `DB_*` variables | Individual connection settings |
| 3 | `publisher.config.ts` | Database section in config file |
| 4 (lowest) | Default | SQLite at `.data/publisher.db` |

### Available Environment Variables

```bash
# Full connection URL (auto-detects provider from scheme)
DATABASE_URL="postgresql://user:password@localhost:5432/publisher"
# or for SQLite:
DATABASE_URL="file:.data/publisher.db"

# Individual PostgreSQL settings
DB_PROVIDER=postgres          # 'sqlite' or 'postgres'
DB_HOST=localhost
DB_PORT=5432
DB_USER=publisher
DB_PASSWORD=secret
DB_NAME=publisher
```

### URL Scheme Detection

| URL Prefix | Detected Provider |
|------------|-------------------|
| `file:` or `sqlite:` | SQLite |
| `postgres://` or `postgresql://` | PostgreSQL |

---

## PostgreSQL Setup Guide

### Option 1: Docker Compose

A `docker-compose.yml` is provided for local PostgreSQL development:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: publisher-postgres
    environment:
      POSTGRES_USER: publisher
      POSTGRES_PASSWORD: publisher
      POSTGRES_DB: publisher_test
    ports:
      - '5433:5432'  # Uses 5433 to avoid conflicts with local PG
    volumes:
      - publisher_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U publisher -d publisher_test']
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  publisher_pgdata:
```

Start PostgreSQL:

```bash
docker-compose up -d
```

Connect with environment variables:

```bash
DATABASE_URL="postgresql://publisher:publisher@localhost:5433/publisher_test" npm run dev
```

### Option 2: Cloud-Hosted PostgreSQL

Publisher works with any PostgreSQL provider:

- **AWS RDS** / Aurora
- **Google Cloud SQL**
- **Azure Database for PostgreSQL**
- **Supabase**
- **Neon**
- **Railway**
- **Render**
- **ElephantSQL**

Set the `DATABASE_URL` environment variable with your provider's connection string:

```bash
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

### Connection Pooling Settings

For production PostgreSQL deployments, tune these settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `poolSize` | 10 | Maximum connections in the pool |
| `connectionTimeout` | 5000 | Connection acquisition timeout (ms) |
| `idleTimeout` | 30000 | Idle connection timeout (ms) |

Example:

```typescript
database: {
  provider: 'postgres' as const,
  url: process.env.DATABASE_URL,
  poolSize: 20,           // Increase for high-traffic apps
  connectionTimeout: 10000,
  idleTimeout: 60000,
}
```

---

## Architecture Overview

### Provider Factory Pattern

The database layer uses a factory pattern to abstract provider-specific implementation details:

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Code                         │
│                 (uses getProvider() / getDb())               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Database Provider Interface                 │
│  - db: Drizzle ORM instance                                 │
│  - execute(sql, params): Promise<unknown[]>                 │
│  - dialect: 'sqlite' | 'postgres'                           │
│  - close(): Promise<void>                                   │
│  - stats?(): ConnectionStats                                │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          ▼                               ▼
┌─────────────────────┐       ┌─────────────────────┐
│   SQLite Provider   │       │  PostgreSQL Provider │
│  (better-sqlite3)   │       │     (postgres.js)    │
└─────────────────────┘       └─────────────────────┘
```

### Schema Files

Two explicit schema files define dialect-specific table definitions:

| File | Purpose |
|------|---------|
| `server/utils/publisher/database/schema/sqlite.ts` | SQLite schema with TEXT for JSON, INTEGER for boolean |
| `server/utils/publisher/database/schema/postgres.ts` | PostgreSQL schema with JSONB, BOOLEAN, TIMESTAMPTZ |

### Query Helpers

The `queries.ts` module provides dialect-agnostic query functions for dynamic content type tables:

```typescript
import { findById, insertRow, listRows } from '~/server/utils/publisher/database/queries'

// Get a single row by ID
const page = await findById('publisher_pages', 123)

// Insert a new row (auto-serializes JSON for SQLite)
const { lastInsertId } = await insertRow('publisher_ct_articles', {
  title: 'Hello World',
  slug: 'hello-world',
  content: { blocks: [] }  // Auto-serialized for SQLite
})

// List with pagination
const rows = await listRows('publisher_ct_articles', {
  where: 'status = ?',
  params: ['published'],
  orderBy: 'created_at DESC',
  limit: 25,
  offset: 0
})
```

### Dialect Helpers

The `dialect.ts` module provides SQL generation utilities:

```typescript
import { now, jsonType, booleanType, dialectHelpers } from './dialect'

// Get dialect-aware SQL fragments
const timestamp = now(dialect)        // SQLite: datetime('now') | PostgreSQL: NOW()
const jsonCol = jsonType(dialect)     // SQLite: TEXT | PostgreSQL: JSONB
const boolCol = booleanType(dialect)  // SQLite: INTEGER | PostgreSQL: BOOLEAN

// Or use the convenience object
const { now, jsonType, timestampDefault } = dialectHelpers(dialect)
```

---

## Health Check Endpoint

A public health check endpoint is available for monitoring and load balancer checks:

### Request

```http
GET /api/publisher/health
```

### Response (Healthy)

```json
{
  "status": "healthy",
  "provider": "postgres",
  "responseTimeMs": 2,
  "timestamp": "2026-03-01T12:00:00.000Z",
  "pool": {
    "activeConnections": 3,
    "idleConnections": 7,
    "queriesExecuted": 1523,
    "isHealthy": true
  }
}
```

### Response (Unhealthy)

```json
{
  "status": "unhealthy",
  "provider": "postgres",
  "error": "Connection refused",
  "timestamp": "2026-03-01T12:00:00.000Z"
}
```

**Status Codes:**
- `200 OK` — Database is healthy
- `503 Service Unavailable` — Database connection failed

---

## Performance Considerations

### SQLite

| Feature | Setting | Impact |
|---------|---------|--------|
| **WAL Mode** | Enabled by default | Better concurrent read performance |
| **Foreign Keys** | Enabled by default | Data integrity enforcement |
| **Single Writer** | Inherent limitation | Only one write at a time |

**Recommendations:**
- Ideal for development, testing, and low-traffic sites
- Suitable for single-server deployments with moderate traffic
- Not recommended for horizontal scaling or high concurrency writes

### PostgreSQL

| Feature | Benefit |
|---------|---------|
| **Connection Pooling** | Efficient connection reuse, reduced overhead |
| **JSONB Columns** | Native JSON storage with indexing and querying |
| **Native Boolean** | True boolean type instead of integer emulation |
| **TIMESTAMPTZ** | Timezone-aware timestamps |
| **Concurrent Writes** | Multiple simultaneous writers |

**Recommendations:**
- Use for production with multiple concurrent users
- Enable SSL for cloud-hosted instances (`?sslmode=require`)
- Tune `poolSize` based on expected traffic
- Consider read replicas for read-heavy workloads

---

## Migration Path

To migrate from SQLite to PostgreSQL:

1. **Set up PostgreSQL** (Docker or cloud provider)
2. **Export data** from SQLite
3. **Configure PostgreSQL** in `publisher.config.ts` or via environment variables
4. **Import data** to PostgreSQL
5. **Verify** with health check endpoint

The schema is automatically created on first run for both providers.

---

## Related Documentation

- [Authentication Architecture](./2026-02-28-authentication-architecture.md)
- [JSON Block Data Storage](./2026-02-28-json-block-data-storage.md)
