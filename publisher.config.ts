/**
 * Publisher CMS Configuration
 *
 * Central configuration for the Publisher headless CMS.
 * Modify these values to customize the CMS behavior.
 */
export default {
  /** Application name shown in the admin UI */
  appName: 'Publisher',

  /** Default admin user seeded on first run */
  defaultAdmin: {
    email: 'admin@publisher.local',
    password: 'admin',
    firstName: 'Admin',
    lastName: 'User',
  },

  /**
   * Feature flags for authentication behavior.
   *
   * All authentication methods (magic links, WebAuthn, TOTP) are always
   * available. Per-user auth requirements are controlled by policies.
   */
  features: {
    /** Allow users to configure multiple auth methods simultaneously */
    allowMultipleAuthMethods: true,
  },

  /**
   * Auth settings
   *
   * Core authentication configuration for JWT tokens, cookies,
   * and password hashing. These settings apply to all auth methods.
   *
   * Environment variables:
   *   PUBLISHER_SECRET — JWT signing secret (required in production)
   */
  auth: {
    /** JWT expiry duration (default: 7 days) */
    tokenExpiry: '7d',
    /** Cookie name for session */
    cookieName: 'publisher-session',
    /** PBKDF2 password hashing configuration */
    hashAlgorithm: 'pbkdf2',
    iterations: 100_000,
    digest: 'sha512',
    keyLength: 64,
    saltLength: 32,
  },

  /**
   * TOTP (Authenticator App) Configuration
   *
   * Settings for time-based one-time password authentication.
   * Compatible with Google Authenticator, Authy, 1Password, etc.
   */
  totp: {
    /** Issuer name shown in authenticator apps */
    issuer: process.env.PUBLISHER_TOTP_ISSUER || 'Publisher CMS',
    /** Number of digits in the TOTP code */
    digits: 6,
    /** Time period in seconds for each code */
    period: 30,
    /** Hash algorithm */
    algorithm: 'SHA1',
    /** Time window tolerance: ±1 period (30 seconds before/after) */
    window: 1,
  },

  /**
   * WebAuthn (Passkey) Configuration
   *
   * Settings for passwordless authentication using passkeys.
   * The Relying Party (RP) ID must match the domain where the app is hosted.
   * In development, 'localhost' is used by default.
   *
   * @see https://simplewebauthn.dev/docs/packages/server
   */
  webauthn: {
    /** Human-readable name shown in passkey prompts */
    rpName: process.env.PUBLISHER_RP_NAME || 'Publisher CMS',
    /** Relying Party ID — must match the domain (e.g., 'example.com') */
    rpID: process.env.PUBLISHER_RP_ID || 'localhost',
    /** Full origin URL including protocol and port */
    origin: process.env.PUBLISHER_RP_ORIGIN || 'http://localhost:3000',
  },

  /**
   * Security settings for device tracking and new-device alerts.
   *
   * When enabled, the system fingerprints devices on login and
   * sends email notifications when a new or untrusted device is detected.
   *
   * Environment variables:
   *   PUBLISHER_NOTIFY_NEW_DEVICES  — Send email on new device login (default: true)
   *   PUBLISHER_MAX_DEVICES_PER_USER — Max tracked devices per user (default: 10)
   *   PUBLISHER_DEVICE_TRACKING     — Enable device fingerprinting (default: true)
   */
  security: {
    /** Send email notification when a new device logs in */
    notifyNewDevices: process.env.PUBLISHER_NOTIFY_NEW_DEVICES !== 'false',
    /** Maximum number of tracked devices per user */
    maxDevicesPerUser: parseInt(process.env.PUBLISHER_MAX_DEVICES_PER_USER || '10'),
    /** Enable device fingerprinting and tracking */
    deviceTracking: process.env.PUBLISHER_DEVICE_TRACKING !== 'false',
  },

  /** Upload settings */
  uploads: {
    /** Maximum file size in bytes (default: 10MB) */
    maxFileSize: 10 * 1024 * 1024,
    /** Allowed MIME types */
    allowedMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'video/mp4',
      'audio/mpeg',
    ],
    /** Image variant sizes */
    imageSizes: {
      thumbnail: 245,
      small: 500,
      medium: 750,
      large: 1000,
    },
  },

  /** Pagination defaults */
  pagination: {
    defaultPageSize: 25,
    maxPageSize: 100,
  },

  /** Built-in roles */
  roles: {
    'super-admin': {
      label: 'Super Admin',
      description: 'Full access to everything',
    },
    admin: {
      label: 'Admin',
      description: 'All content CRUD, manage users',
    },
    editor: {
      label: 'Editor',
      description: 'Create/edit own entries, read all',
    },
    viewer: {
      label: 'Viewer',
      description: 'Read-only access',
    },
  },

  /**
   * Storage configuration for media files
   *
   * Supports multiple storage backends (local, Cloudflare R2, S3-compatible).
   * Configure providers below and set defaultProvider to choose the active backend.
   *
   * @see server/utils/publisher/storage/types.ts for full type definitions
   */
  storage: {
    /** Name of the default provider (must match a key in providers) */
    defaultProvider: 'local',

    /** Global upload defaults applied to all providers */
    defaults: {
      /** Cache control for uploaded files (1 year by default) */
      cacheControl: 'public, max-age=31536000',
    },

    /** Available storage providers */
    providers: {
      /**
       * Local filesystem storage
       * Suitable for development and single-server deployments
       */
      local: {
        type: 'local',
        /** Directory where files are stored (relative to project root) */
        basePath: process.env.PUBLISHER_UPLOAD_DIR || './public/uploads',
        /** URL path for serving files via HTTP */
        baseUrl: process.env.PUBLISHER_UPLOAD_URL || '/uploads',
        /** Automatically create directories if they don't exist */
        createDirectories: true,
        /** Mark as the default provider */
        default: true,
      },

      // ═══════════════════════════════════════════════════════════════════════
      // Cloudflare R2 Configuration (uncomment to enable)
      // R2 offers S3-compatible storage with zero egress fees
      // ═══════════════════════════════════════════════════════════════════════
      // r2: {
      //   type: 'r2',
      //   /** Cloudflare account ID (found in R2 dashboard) */
      //   accountId: process.env.PUBLISHER_R2_ACCOUNT_ID!,
      //   /** R2 bucket name */
      //   bucket: process.env.PUBLISHER_R2_BUCKET!,
      //   /** Access key ID from R2 API tokens */
      //   accessKeyId: process.env.PUBLISHER_R2_ACCESS_KEY_ID!,
      //   /** Secret access key from R2 API tokens */
      //   secretAccessKey: process.env.PUBLISHER_R2_SECRET_ACCESS_KEY!,
      //   /** Region (default: 'auto') */
      //   region: process.env.PUBLISHER_R2_REGION || 'auto',
      //   /** Custom domain for public URLs (optional) */
      //   customDomain: process.env.PUBLISHER_R2_CUSTOM_DOMAIN,
      //   /** Whether the bucket is publicly accessible */
      //   public: true,
      // },

      // ═══════════════════════════════════════════════════════════════════════
      // S3-Compatible Storage Configuration (uncomment to enable)
      // Works with AWS S3, MinIO, DigitalOcean Spaces, Backblaze B2, etc.
      // ═══════════════════════════════════════════════════════════════════════

      // ─── AWS S3 Configuration ───────────────────────────────────────────────
      // s3: {
      //   type: 's3',
      //   bucket: process.env.AWS_S3_BUCKET!,
      //   region: process.env.AWS_REGION || 'us-east-1',
      //   // Credentials fallback: config > AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY env vars
      //   accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      //   secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      //   // Optional: Use a CloudFront CDN or custom domain
      //   customDomain: process.env.AWS_S3_CUSTOM_DOMAIN,
      //   public: true,
      // },

      // ─── MinIO Configuration ────────────────────────────────────────────────
      // MinIO requires forcePathStyle: true for path-style URLs
      // s3: {
      //   type: 's3',
      //   bucket: 'publisher-uploads',
      //   region: 'us-east-1', // MinIO ignores this but SDK requires it
      //   accessKeyId: process.env.MINIO_ACCESS_KEY!,
      //   secretAccessKey: process.env.MINIO_SECRET_KEY!,
      //   endpoint: 'http://localhost:9000', // Your MinIO server URL
      //   forcePathStyle: true, // REQUIRED for MinIO
      //   public: true,
      // },

      // ─── DigitalOcean Spaces Configuration ──────────────────────────────────
      // s3: {
      //   type: 's3',
      //   bucket: process.env.DO_SPACES_BUCKET!,
      //   region: process.env.DO_SPACES_REGION || 'nyc3',
      //   accessKeyId: process.env.DO_SPACES_KEY!,
      //   secretAccessKey: process.env.DO_SPACES_SECRET!,
      //   endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
      //   // Optional: Use a custom CDN domain
      //   customDomain: process.env.DO_SPACES_CUSTOM_DOMAIN,
      //   public: true,
      // },
    },

    /**
     * Per-content-type storage assignment (optional)
     * Allows different content types to use different storage providers
     * Uncomment and customize to route specific content to specific providers
     */
    // perContentType: {
    //   // Route media-heavy content types to cloud storage
    //   'blog-posts': 'r2',
    //   'products': 'r2',
    //   'gallery': 'r2',
    //   // Keep other content on local storage
    //   'documents': 'local',
    // },
  },

  /**
   * Email configuration for transactional emails (magic links, notifications)
   *
   * Supports multiple email backends (SMTP, SendGrid, Console).
   * Configure providers below and set defaultProvider to choose the active backend.
   * Email is required for passwordless (magic link) authentication.
   *
   * @see server/utils/publisher/email/types.ts for full type definitions
   */
  email: {
    /** Name of the default provider (must match a key in providers) */
    defaultProvider: process.env.PUBLISHER_EMAIL_PROVIDER || 'console',

    /** Available email providers */
    providers: {
      // ═══════════════════════════════════════════════════════════════════════
      // Console Provider (default for development)
      // Logs emails to console instead of sending them
      // ═══════════════════════════════════════════════════════════════════════
      console: {
        type: 'console' as const,
        from: 'Publisher CMS <dev@localhost>',
      },

      // ═══════════════════════════════════════════════════════════════════════
      // SMTP Configuration (uncomment to enable)
      // Works with any SMTP server: Gmail, Mailgun, Amazon SES, Postmark, etc.
      // ═══════════════════════════════════════════════════════════════════════
      // smtp: {
      //   type: 'smtp',
      //   /** SMTP server hostname */
      //   host: process.env.SMTP_HOST || 'smtp.example.com',
      //   /** SMTP server port (587 for TLS/STARTTLS, 465 for SSL, 25 for unencrypted) */
      //   port: parseInt(process.env.SMTP_PORT || '587'),
      //   /** SMTP authentication username */
      //   user: process.env.SMTP_USER || '',
      //   /** SMTP authentication password */
      //   pass: process.env.SMTP_PASS || '',
      //   /** Use SSL/TLS (true for port 465, false for STARTTLS on 587) */
      //   secure: (process.env.SMTP_PORT || '587') === '465',
      //   /** Default sender address */
      //   from: process.env.PUBLISHER_EMAIL_FROM || 'Publisher CMS <noreply@example.com>',
      //   /** Mark as the default provider */
      //   default: true,
      // },

      // ═══════════════════════════════════════════════════════════════════════
      // SendGrid Configuration (uncomment to enable)
      // Requires a SendGrid account and verified sender address
      // ═══════════════════════════════════════════════════════════════════════
      // sendgrid: {
      //   type: 'sendgrid',
      //   /** SendGrid API key (starts with 'SG.') */
      //   apiKey: process.env.SENDGRID_API_KEY || '',
      //   /** Default sender address (must be verified in SendGrid) */
      //   from: process.env.PUBLISHER_EMAIL_FROM || 'Publisher CMS <noreply@example.com>',
      //   /** Mark as the default provider */
      //   default: true,
      // },
    },
  },

  /**
   * Database configuration
   *
   * Supports SQLite (default, zero-config) and PostgreSQL.
   * Configuration priority: DATABASE_URL env > DB_* env vars > this config > SQLite default
   *
   * @see server/utils/publisher/database/provider.ts for full type definitions
   */
  database: {
    // ═══════════════════════════════════════════════════════════════════════
    // SQLite Configuration (commented out - using PostgreSQL)
    // ═══════════════════════════════════════════════════════════════════════
    // provider: 'sqlite' as const,
    // sqlitePath: '.data/publisher.db',

    // ═══════════════════════════════════════════════════════════════════════
    // PostgreSQL Configuration
    // Recommended for production with high traffic or concurrent users
    // ═══════════════════════════════════════════════════════════════════════
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
