import { describe, it, expect } from 'vitest'
import {
  getFeatures,
  type FeatureFlags,
} from '../../server/utils/publisher/features'

describe('Feature Flags - Integration', () => {
  describe('getFeatures', () => {
    it('should return an object with all required feature flags', () => {
      const features = getFeatures()

      // Check all required properties exist
      expect(features).toHaveProperty('allowMultipleAuthMethods')
    })

    it('should return boolean values for all features', () => {
      const features = getFeatures()

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

  describe('Feature flag values', () => {
    it('should have allowMultipleAuthMethods enabled by default', () => {
      const features = getFeatures()
      expect(features.allowMultipleAuthMethods).toBe(true)
    })
  })
})
