import { describe, it, expect } from 'vitest'
import {
  hashFingerprint,
  type DeviceInfo,
} from '../../server/utils/publisher/deviceFingerprint'

describe('Device Fingerprinting - Pure Functions', () => {
  describe('hashFingerprint', () => {
    it('should produce consistent hashes for same input', () => {
      const input = 'test-fingerprint-data'
      const hash1 = hashFingerprint(input)
      const hash2 = hashFingerprint(input)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different inputs', () => {
      const hash1 = hashFingerprint('input-one')
      const hash2 = hashFingerprint('input-two')
      const hash3 = hashFingerprint('input-three')

      expect(hash1).not.toBe(hash2)
      expect(hash2).not.toBe(hash3)
      expect(hash1).not.toBe(hash3)
    })

    it('should return 32-character hex string', () => {
      const hash = hashFingerprint('any-input')

      expect(hash).toHaveLength(32)
      expect(hash).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should handle empty string', () => {
      const hash = hashFingerprint('')

      expect(hash).toHaveLength(32)
      expect(hash).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should handle long strings', () => {
      const longInput = 'a'.repeat(10000)
      const hash = hashFingerprint(longInput)

      expect(hash).toHaveLength(32)
      expect(hash).toMatch(/^[a-f0-9]{32}$/)
    })

    it('should handle special characters', () => {
      const hash1 = hashFingerprint('special!@#$%^&*()')
      const hash2 = hashFingerprint('unicode:日本語')
      const hash3 = hashFingerprint('emoji:🎉🚀')

      expect(hash1).toHaveLength(32)
      expect(hash2).toHaveLength(32)
      expect(hash3).toHaveLength(32)
    })

    it('should be deterministic across multiple calls', () => {
      const input = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/91.0|en-US|text/html|192.168.1.1'
      const hashes = Array(10).fill(null).map(() => hashFingerprint(input))

      expect(new Set(hashes).size).toBe(1)
    })
  })

  describe('DeviceInfo type', () => {
    it('should have correct type structure', () => {
      const deviceInfo: DeviceInfo = {
        deviceName: 'Chrome on macOS',
        browser: 'Chrome',
        os: 'macOS',
      }

      expect(deviceInfo.deviceName).toBe('Chrome on macOS')
      expect(deviceInfo.browser).toBe('Chrome')
      expect(deviceInfo.os).toBe('macOS')
    })
  })
})
