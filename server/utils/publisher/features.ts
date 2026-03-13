import publisherConfig from '../../../publisher.config'

/**
 * Feature flags for Publisher CMS authentication.
 *
 * All authentication methods (magic links, WebAuthn, TOTP) are always
 * available. Per-user auth requirements are controlled by policies.
 *
 * This module retains the `allowMultipleAuthMethods` flag and the
 * `getFeatures()` helper for server-side feature checks.
 */

/**
 * All feature flags with their current values.
 */
export interface FeatureFlags {
  allowMultipleAuthMethods: boolean
}

/**
 * Get all feature flags from the publisher configuration.
 *
 * Reads from `publisher.config.ts` -> `features` section, which in turn
 * reads from environment variables with sensible defaults.
 *
 * @returns All feature flags with their current boolean values
 */
export function getFeatures(): FeatureFlags {
  const features = (publisherConfig as any).features
  if (!features) {
    // Fallback: default values
    return {
      allowMultipleAuthMethods: true,
    }
  }
  return {
    allowMultipleAuthMethods: features.allowMultipleAuthMethods !== false,
  }
}
