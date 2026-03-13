import publisherConfig from '../../../publisher.config'

/**
 * Feature flags for Publisher CMS passwordless authentication.
 *
 * Each flag controls whether a specific authentication method is available
 * to users. Flags default to enabled (true) for backward compatibility.
 *
 * Feature flags are read from environment variables at startup and can be
 * used on both the server (via this module) and the client (via runtimeConfig).
 */

/**
 * Available feature flag names.
 *
 * - `magicLinks`    — Email-based passwordless sign-in via magic links
 * - `webauthn`      — Passkey/WebAuthn-based passwordless sign-in
 * - `totp`          — TOTP authenticator app sign-in
 * - `passwordless`  — When true, password login is hidden and passwordless is required
 */
export type FeatureFlag = 'magicLinks' | 'webauthn' | 'totp' | 'passwordless'

/**
 * All feature flags with their current values.
 */
export interface FeatureFlags {
  enableMagicLinks: boolean
  enableWebAuthn: boolean
  enableTOTP: boolean
  requirePasswordless: boolean
  allowMultipleAuthMethods: boolean
}

/**
 * Get all feature flags from the publisher configuration.
 *
 * Reads from `publisher.config.ts` → `features` section, which in turn
 * reads from environment variables with sensible defaults.
 *
 * @returns All feature flags with their current boolean values
 */
export function getFeatures(): FeatureFlags {
  const features = (publisherConfig as any).features
  if (!features) {
    // Fallback: all features enabled by default
    return {
      enableMagicLinks: true,
      enableWebAuthn: true,
      enableTOTP: true,
      requirePasswordless: false,
      allowMultipleAuthMethods: true,
    }
  }
  return {
    enableMagicLinks: features.enableMagicLinks !== false,
    enableWebAuthn: features.enableWebAuthn !== false,
    enableTOTP: features.enableTOTP !== false,
    requirePasswordless: features.requirePasswordless === true,
    allowMultipleAuthMethods: features.allowMultipleAuthMethods !== false,
  }
}

/**
 * Check if a specific feature is enabled.
 *
 * @param feature - The feature flag to check
 * @returns `true` if the feature is enabled, `false` otherwise
 *
 * @example
 * ```ts
 * if (!isFeatureEnabled('magicLinks')) {
 *   throw createError({ statusCode: 404, data: { error: { message: 'Magic links are not enabled' } } })
 * }
 * ```
 */
export function isFeatureEnabled(feature: FeatureFlag): boolean {
  const features = getFeatures()
  switch (feature) {
    case 'magicLinks':
      return features.enableMagicLinks
    case 'webauthn':
      return features.enableWebAuthn
    case 'totp':
      return features.enableTOTP
    case 'passwordless':
      return features.requirePasswordless
    default:
      return false
  }
}

/**
 * Assert that a feature is enabled, or throw a 404 error.
 *
 * Use this as a guard at the top of API endpoints to enforce feature flags.
 *
 * @param feature - The feature flag to check
 * @param featureLabel - Human-readable label for error messages (e.g., "Magic links")
 * @throws {H3Error} 404 error if the feature is disabled
 *
 * @example
 * ```ts
 * export default defineEventHandler(async (event) => {
 *   assertFeatureEnabled('magicLinks', 'Magic links')
 *   // ... rest of handler
 * })
 * ```
 */
export function assertFeatureEnabled(feature: FeatureFlag, featureLabel: string): void {
  if (!isFeatureEnabled(feature)) {
    throw createError({
      statusCode: 404,
      data: {
        error: {
          message: `${featureLabel} authentication is not enabled on this server`,
          code: 'FEATURE_DISABLED',
        },
      },
    })
  }
}
