import { describe, it, expect } from 'vitest'
import {
  getFeatures,
  isFeatureEnabled,
  assertFeatureEnabled,
  type FeatureFlag,
  type FeatureFlags,
} from '../../server/utils/publisher/features'

describe('Feature Flags - Integration', () => {
  describe('getFeatures', () => {
    it('should return an object with all required feature flags', () => {
      const features = getFeatures()

      // Check all required properties exist
      expect(features).toHaveProperty('enableMagicLinks')
      expect(features).toHaveProperty('enableWebAuthn')
      expect(features).toHaveProperty('enableTOTP')
      expect(features).toHaveProperty('requirePasswordless')
      expect(features).toHaveProperty('allowMultipleAuthMethods')
    })

    it('should return boolean values for all features', () => {
      const features = getFeatures()

      expect(typeof features.enableMagicLinks).toBe('boolean')
      expect(typeof features.enableWebAuthn).toBe('boolean')
      expect(typeof features.enableTOTP).toBe('boolean')
      expect(typeof features.requirePasswordless).toBe('boolean')
      expect(typeof features.allowMultipleAuthMethods).toBe('boolean')
    })

    it('should return consistent results on multiple calls', () => {
      const features1 = getFeatures()
      const features2 = getFeatures()
      const features3 = getFeatures()

      expect(features1).toEqual(features2)
      expect(features2).toEqual(features3)
    })
  })

  describe('isFeatureEnabled', () => {
    it('should be a function', () => {
      expect(typeof isFeatureEnabled).toBe('function')
    })

    it('should accept valid feature flag names', () => {
      // Should not throw for valid feature flags
      expect(() => isFeatureEnabled('magicLinks')).not.toThrow()
      expect(() => isFeatureEnabled('webauthn')).not.toThrow()
      expect(() => isFeatureEnabled('totp')).not.toThrow()
      expect(() => isFeatureEnabled('passwordless')).not.toThrow()
    })

    it('should return a boolean', () => {
      const result = isFeatureEnabled('magicLinks')
      expect(typeof result).toBe('boolean')
    })

    it('should return false for unknown feature', () => {
      expect(isFeatureEnabled('unknownFeature' as FeatureFlag)).toBe(false)
    })

    it('should handle all feature flag types', () => {
      const features: FeatureFlag[] = ['magicLinks', 'webauthn', 'totp', 'passwordless']

      features.forEach(feature => {
        const result = isFeatureEnabled(feature)
        expect(typeof result).toBe('boolean')
      })
    })
  })

  describe('assertFeatureEnabled', () => {
    it('should be a function', () => {
      expect(typeof assertFeatureEnabled).toBe('function')
    })

    it('should not throw when checking known features', () => {
      // These features may or may not be enabled, but the function should handle both cases
      expect(() => {
        try {
          assertFeatureEnabled('magicLinks', 'Magic links')
        } catch (e) {
          // Expected if feature is disabled - check it's a proper error
          if ((e as any).statusCode !== 404) throw e
        }
      }).not.toThrow()
    })

    it('should throw with proper error structure when feature is disabled', () => {
      // First check current state
      const magicLinksEnabled = isFeatureEnabled('magicLinks')

      if (!magicLinksEnabled) {
        // Feature is disabled, should throw
        try {
          assertFeatureEnabled('magicLinks', 'Magic links')
          // Should not reach here
          expect(false).toBe(true)
        } catch (error: any) {
          expect(error.statusCode).toBe(404)
          expect(error.data).toBeDefined()
          expect(error.data.error).toBeDefined()
          expect(error.data.error.code).toBe('FEATURE_DISABLED')
          expect(error.data.error.message).toContain('Magic links')
        }
      } else {
        // Feature is enabled, verify it doesn't throw
        expect(() => assertFeatureEnabled('magicLinks', 'Magic links')).not.toThrow()
      }
    })

    it('should include feature label in error message when disabled', () => {
      const features: Array<{ flag: FeatureFlag; label: string }> = [
        { flag: 'magicLinks', label: 'Magic link authentication' },
        { flag: 'webauthn', label: 'WebAuthn' },
        { flag: 'totp', label: 'TOTP' },
        { flag: 'passwordless', label: 'Passwordless' },
      ]

      features.forEach(({ flag, label }) => {
        try {
          assertFeatureEnabled(flag, label)
          // Feature is enabled, that's fine
        } catch (error: any) {
          // Feature is disabled, check error message
          if (error.statusCode === 404) {
            expect(error.data.error.message).toContain(label)
            expect(error.data.error.message).toContain('not enabled')
          }
        }
      })
    })
  })

  describe('Feature flag values', () => {
    it('should have consistent enabled state across related functions', () => {
      const features = getFeatures()

      expect(isFeatureEnabled('magicLinks')).toBe(features.enableMagicLinks)
      expect(isFeatureEnabled('webauthn')).toBe(features.enableWebAuthn)
      expect(isFeatureEnabled('totp')).toBe(features.enableTOTP)
      expect(isFeatureEnabled('passwordless')).toBe(features.requirePasswordless)
    })
  })
})
