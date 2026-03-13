/**
 * New Device Alert Email Template
 *
 * Generates a professional, mobile-responsive HTML email to notify
 * users when a new or unrecognized device signs in to their account.
 * Includes device details, location info, and a link to security settings.
 *
 * @example
 * ```typescript
 * const { html, text } = generateNewDeviceEmail({
 *   deviceName: 'Chrome on macOS',
 *   ipAddress: '192.168.x.x',
 *   timestamp: '2026-03-01T12:00:00Z',
 *   securitySettingsUrl: 'https://example.com/admin/settings/security',
 *   appName: 'Publisher CMS',
 * })
 * ```
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface NewDeviceEmailContent {
  /** HTML email body */
  html: string
  /** Plain text email body (fallback) */
  text: string
}

export interface NewDeviceEmailOptions {
  /** Human-readable device name (e.g., "Chrome on macOS") */
  deviceName: string
  /** Client IP address (should be masked for display) */
  ipAddress: string
  /** ISO timestamp of the login */
  timestamp: string
  /** Full URL to the security settings page */
  securitySettingsUrl: string
  /** Application name displayed in the email */
  appName: string
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Generates a new device alert email with HTML and plain text versions.
 *
 * The HTML template is:
 * - Mobile-responsive (max-width container, fluid padding)
 * - Dark mode compatible (uses both light and dark color schemes)
 * - Accessible (semantic HTML, sufficient color contrast)
 * - Professional with Publisher CMS branding
 */
export function generateNewDeviceEmail(options: NewDeviceEmailOptions): NewDeviceEmailContent {
  const { deviceName, ipAddress, timestamp, securitySettingsUrl, appName } = options

  const formattedTime = formatTimestamp(timestamp)

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>New device sign-in — ${escapeHtml(appName)}</title>
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

    .alert-banner {
      background-color: #fef3c7;
      border: 1px solid #fde68a;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
      text-align: center;
    }

    .alert-banner p {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
    }

    .device-details {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
    }

    .device-details table {
      width: 100%;
      border-collapse: collapse;
    }

    .device-details td {
      padding: 6px 0;
      font-size: 14px;
      line-height: 1.5;
    }

    .device-details .label {
      color: #6b7280;
      font-weight: 500;
      width: 100px;
      vertical-align: top;
    }

    .device-details .value {
      color: #1f2937;
      font-weight: 600;
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
    }

    .cta-button:hover {
      background-color: #27272a;
    }

    .divider {
      border: none;
      border-top: 1px solid #e4e4e7;
      margin: 24px 0;
    }

    .warning-section {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 8px;
      padding: 16px;
      margin-top: 24px;
    }

    .warning-section p {
      margin: 0;
      font-size: 13px;
      color: #991b1b;
      line-height: 1.5;
    }

    .warning-section strong {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
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
      .alert-banner {
        background-color: #451a03 !important;
        border-color: #78350f !important;
      }
      .alert-banner p {
        color: #fde68a !important;
      }
      .device-details {
        background-color: #27272a !important;
        border-color: #3f3f46 !important;
      }
      .device-details .label {
        color: #a1a1aa !important;
      }
      .device-details .value {
        color: #f4f4f5 !important;
      }
      .cta-button {
        background-color: #ffffff !important;
        color: #18181b !important;
      }
      .divider {
        border-top-color: #27272a !important;
      }
      .warning-section {
        background-color: #450a0a !important;
        border-color: #7f1d1d !important;
      }
      .warning-section p {
        color: #fca5a5 !important;
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
  <div class="email-wrapper" role="article" aria-roledescription="email" aria-label="New device sign-in alert">
    <div class="email-container">
      <!-- Header -->
      <div class="email-header">
        <h1>${escapeHtml(appName)}</h1>
      </div>

      <!-- Body -->
      <div class="email-body">
        <div class="alert-banner">
          <p>&#x1F6A8; New device sign-in detected</p>
        </div>

        <p>Your account was just signed in to from a new device. If this was you, no action is needed.</p>

        <!-- Device Details -->
        <div class="device-details">
          <table>
            <tr>
              <td class="label">Device</td>
              <td class="value">${escapeHtml(deviceName)}</td>
            </tr>
            <tr>
              <td class="label">IP Address</td>
              <td class="value">${escapeHtml(ipAddress)}</td>
            </tr>
            <tr>
              <td class="label">Time</td>
              <td class="value">${escapeHtml(formattedTime)}</td>
            </tr>
          </table>
        </div>

        <p>You can review your active devices and manage trusted devices in your security settings.</p>

        <!-- CTA Button -->
        <div class="cta-wrapper">
          <!--[if mso]>
          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${escapeHtml(securitySettingsUrl)}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="17%" stroke="f" fillcolor="#18181b">
            <w:anchorlock/>
            <center>
              <![endif]-->
              <a href="${escapeHtml(securitySettingsUrl)}" class="cta-button" target="_blank" rel="noopener noreferrer">
                Review Security Settings
              </a>
              <!--[if mso]>
            </center>
          </v:roundrect>
          <![endif]-->
        </div>

        <!-- Warning Section -->
        <div class="warning-section">
          <p>
            <strong>Wasn't you?</strong>
            If you don't recognize this sign-in, your account may be compromised.
            Visit your <a href="${escapeHtml(securitySettingsUrl)}" style="color: #dc2626; text-decoration: underline;">security settings</a>
            immediately to revoke the device and change your authentication method.
          </p>
        </div>

        <hr class="divider">

        <p class="notice">
          You're receiving this email because a new device signed in to your ${escapeHtml(appName)} account.
          You can disable these notifications in your security settings.
        </p>
      </div>

      <!-- Footer -->
      <div class="email-footer">
        <p>Sent by ${escapeHtml(appName)}</p>
      </div>
    </div>
  </div>
</body>
</html>`

  const text = `New Device Sign-in — ${appName}
${'='.repeat(40)}

Your account was just signed in to from a new device.

Device: ${deviceName}
IP Address: ${ipAddress}
Time: ${formattedTime}

If this was you, no action is needed.

Review your security settings:
${securitySettingsUrl}

---

Wasn't you?
If you don't recognize this sign-in, your account may be compromised.
Visit your security settings immediately to revoke the device
and change your authentication method.

---
Sent by ${appName}`

  return { html, text }
}

// ─── Utility Functions ────────────────────────────────────────────────────────

/**
 * Escapes HTML special characters to prevent XSS in email templates.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Format an ISO timestamp into a human-readable string.
 */
function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso)
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
  }
  catch {
    return iso
  }
}
