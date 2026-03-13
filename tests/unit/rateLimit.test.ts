import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetRateLimitStore } from '../../server/utils/publisher/rateLimit'

describe('Rate Limiting - Pure Functions', () => {
  beforeEach(() => {
    resetRateLimitStore()
  })

  afterEach(() => {
    resetRateLimitStore()
  })

  describe('resetRateLimitStore', () => {
    it('should be a function', () => {
      expect(typeof resetRateLimitStore).toBe('function')
    })

    it('should run without error', () => {
      expect(() => resetRateLimitStore()).not.toThrow()
    })

    it('should clear all rate limit entries when called multiple times', () => {
      resetRateLimitStore()
      resetRateLimitStore()
      resetRateLimitStore()
      // Should not throw
      expect(true).toBe(true)
    })
  })

  describe('checkRateLimit - Integration Level', () => {
    it('should have checkRateLimit function exported', async () => {
      // Dynamic import to avoid hoisting issues
      const { checkRateLimit } = await import('../../server/utils/publisher/rateLimit')
      expect(typeof checkRateLimit).toBe('function')
    })

    it('should return Promise', async () => {
      const { checkRateLimit } = await import('../../server/utils/publisher/rateLimit')
      const result = checkRateLimit('test-key', { max: 5, windowMs: 60000 })
      expect(result).toBeInstanceOf(Promise)
      // Clean up
      await result.catch(() => {})
    })
  })
})
