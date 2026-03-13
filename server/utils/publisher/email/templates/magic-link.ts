/**
 * Magic Link Email Template
 *
 * Generates a professional, mobile-responsive HTML email for passwordless
 * authentication. Includes a prominent sign-in button, expiry notice,
 * and security warning.
 *
 * @example
 * ```typescript
 * const { html, text } = generateMagicLinkEmail(
 *   'https://example.com/auth/verify?token=abc123',
 *   'Publisher CMS'
 * )
 * ```
 */

/**
 * Result of generating a magic link email.
 */
export interface MagicLinkEmailContent {
  /** HTML email body */
  html: string
  /** Plain text email body (fallback) */
  text: string
}

/**
 * Options for customizing the magic link email template.
 */
export interface MagicLinkEmailOptions {
  /** Magic link URL the user clicks to sign in */
  magicLinkUrl: string

  /** Application name displayed in the email (e.g., 'Publisher CMS') */
  appName: string

  /** Link expiry time in minutes (default: 15) */
  expiryMinutes?: number
}

/**
 * Generates a magic link email with HTML and plain text versions.
 *
 * The HTML template is:
 * - Mobile-responsive (max-width container, fluid padding)
 * - Dark mode compatible (uses both light and dark color schemes)
 * - Accessible (semantic HTML, sufficient color contrast, alt text)
 * - Professional with Publisher CMS branding
 *
 * @param magicLinkUrl - The full URL for the magic link
 * @param appName - The application name to display
 * @param expiryMinutes - Link expiry time in minutes (default: 15)
 * @returns Object with html and text properties
 */
export function generateMagicLinkEmail(
  magicLinkUrl: string,
  appName: string,
  expiryMinutes: number = 15,
): MagicLinkEmailContent {
  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Sign in to ${escapeHtml(appName)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    :root {
      color-scheme: light dark;
      supported-color-schemes: light dark;
    }

    body {
      margin: 0;
      padding: 0;
      width: 100%;
      background-color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .email-wrapper {
      width: 100%;
      background-color: #f4f4f5;
      padding: 40px 0;
    }

    .email-container {
      max-width: 480px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .email-header {
      background-color: #18181b;
      padding: 32px 40px;
      text-align: center;
    }

    .email-header h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #ffffff;
      letter-spacing: -0.025em;
    }

    .email-body {
      padding: 40px;
    }

    .email-body p {
      margin: 0 0 16px;
      font-size: 15px;
      line-height: 1.6;
      color: #3f3f46;
    }

    .email-body p:last-child {
      margin-bottom: 0;
    }

    .cta-wrapper {
      text-align: center;
      padding: 8px 0 24px;
    }

    .cta-button {
      display: inline-block;
      background-color: #18181b;
      color: #ffffff !important;
      text-decoration: none;
      font-size: 15px;
      font-weight: 600;
      padding: 14px 32px;
      border-radius: 8px;
      letter-spacing: -0.01em;
      mso-padding-alt: 0;
    }

    /*[if mso]>
    .cta-button {
      padding: 14px 32px;
    }
    <![endif]*/

    .cta-button:hover {
      background-color: #27272a;
    }

    .divider {
      border: none;
      border-top: 1px solid #e4e4e7;
      margin: 24px 0;
    }

    .link-fallback {
      word-break: break-all;
      font-size: 13px;
      color: #71717a;
      line-height: 1.5;
    }

    .link-fallback a {
      color: #3b82f6;
      text-decoration: underline;
    }

    .notice {
      font-size: 13px !important;
      color: #a1a1aa !important;
      line-height: 1.5 !important;
    }

    .email-footer {
      padding: 24px 40px;
      background-color: #fafafa;
      border-top: 1px solid #f4f4f5;
      text-align: center;
    }

    .email-footer p {
      margin: 0;
      font-size: 12px;
      color: #a1a1aa;
      line-height: 1.5;
    }

    /* Dark mode styles */
    @media (prefers-color-scheme: dark) {
      body, .email-wrapper {
        background-color: #09090b !important;
      }
      .email-container {
        background-color: #18181b !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3) !important;
      }
      .email-header {
        background-color: #09090b !important;
      }
      .email-body p {
        color: #d4d4d8 !important;
      }
      .cta-button {
        background-color: #ffffff !important;
        color: #18181b !important;
      }
      .divider {
        border-top-color: #27272a !important;
      }
      .link-fallback {
        color: #71717a !important;
      }
      .link-fallback a {
        color: #60a5fa !important;
      }
      .notice {
        color: #52525b !important;
      }
      .email-footer {
        background-color: #09090b !important;
        border-top-color: #27272a !important;
      }
      .email-footer p {
        color: #52525b !important;
      }
    }

    /* Mobile responsive */
    @media only screen and (max-width: 520px) {
      .email-wrapper {
        padding: 20px 16px !important;
      }
      .email-container {
        border-radius: 8px !important;
      }
      .email-header {
        padding: 24px 24px !important;
      }
      .email-body {
        padding: 28px 24px !important;
      }
      .email-footer {
        padding: 20px 24px !important;
      }
    }
  </style>
</head>
<body>
  <div class="email-wrapper" role="article" aria-roledescription="email" aria-label="Sign in to ${escapeHtml(appName)}">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1>${escapeHtml(appName)}</h1>
      </div>

      <!-- Body -->
      <div class="email-body">
        <p>A sign-in link was requested for your account. Click the button below to securely sign in:</p>

        <!-- CTA Button -->
        <div class="cta-wrapper">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(magicLinkUrl)}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" stroke="f" fillcolor="#18181b">
            <w:anchorlock/>
            <center>
              <![endif]-->
              <a href="${escapeHtml(magicLinkUrl)}" class="cta-button" target="_blank" rel="noopener noreferrer">
                Sign In
              </a>
              <!--[if mso]>
            </center>
          </v:roundrect>
          <![endif]-->
        </div>

        <p class="notice">This link will expire in <strong>${expiryMinutes} minutes</strong>.</p>

        <hr class="divider">

        <!-- Link fallback -->
        <p class="link-fallback">
          If the button above doesn't work, copy and paste this URL into your browser:<br>
          <a href="${escapeHtml(magicLinkUrl)}">${escapeHtml(magicLinkUrl)}</a>
        </p>

        <hr class="divider">

        <!-- Security notice -->
        <p class="notice">If you didn't request this email, you can safely ignore it. No action is needed and your account remains secure.</p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p>Sent by ${escapeHtml(appName)}</p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `Sign in to ${appName}
${'='.repeat(40)}

A sign-in link was requested for your account.

Click the link below to securely sign in:
${magicLinkUrl}

This link will expire in ${expiryMinutes} minutes.

If you didn't request this email, you can safely ignore it.
No action is needed and your account remains secure.

---
Sent by ${appName}`

  return { html, text }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Escapes HTML special characters to prevent XSS in email templates.
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML insertion
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
