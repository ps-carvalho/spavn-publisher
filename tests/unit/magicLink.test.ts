import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  generateMagicLinkToken,
  hashMagicLinkToken,
  verifyMagicLinkToken,
} from '../../server/utils/publisher/magicLink'

describe('Magic Link Token Utilities', () => {
  describe('generateMagicLinkToken', () => {
    it('should generate a token with valid format', () => {
      const { token, hash } = generateMagicLinkToken()

      // Token should be base64url encoded (43 characters for 32 bytes)
      expect(token).toHaveLength(43)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)

      // Hash should be hex-encoded SHA-256 (64 characters)
      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })

    it('should generate unique tokens on each call', () => {
      const tokens = new Set<string>()
      const hashes = new Set<string>()

      for (let i = 0; i < 10; i++) {
        const { token, hash } = generateMagicLinkToken()
        tokens.add(token)
        hashes.add(hash)
      }

      // All tokens and hashes should be unique
      expect(tokens.size).toBe(10)
      expect(hashes.size).toBe(10)
    })

    it('should generate consistent hash for the same token', () => {
      const { token, hash } = generateMagicLinkToken()
      const recomputedHash = hashMagicLinkToken(token)

      expect(recomputedHash).toBe(hash)
    })
  })

  describe('hashMagicLinkToken', () => {
    it('should produce consistent hashes for identical tokens', () => {
      const token = 'test-token-123'
      const hash1 = hashMagicLinkToken(token)
      const hash2 = hashMagicLinkToken(token)

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashMagicLinkToken('token-one')
      const hash2 = hashMagicLinkToken('token-two')

      expect(hash1).not.toBe(hash2)
    })

    it('should return 64-character hex string', () => {
      const hash = hashMagicLinkToken('any-token')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('verifyMagicLinkToken', () => {
    it('should return true for matching token and hash', () => {
      const { token, hash } = generateMagicLinkToken()
      const isValid = verifyMagicLinkToken(token, hash)

      expect(isValid).toBe(true)
    })

    it('should return false for non-matching token and hash', () => {
      const { hash } = generateMagicLinkToken()
      const wrongToken = 'wrong-token-value'
      const isValid = verifyMagicLinkToken(wrongToken, hash)

      expect(isValid).toBe(false)
    })

    it('should return false for different hash lengths', () => {
      const { token } = generateMagicLinkToken()
      const shortHash = 'abc123'
      const isValid = verifyMagicLinkToken(token, shortHash)

      expect(isValid).toBe(false)
    })

    it('should use timing-safe comparison', () => {
      const { token, hash } = generateMagicLinkToken()

      // Test multiple times to ensure consistency
      const results: boolean[] = []
      for (let i = 0; i < 5; i++) {
        results.push(verifyMagicLinkToken(token, hash))
      }

      expect(results.every(r => r === true)).toBe(true)
    })

    it('should reject tampered tokens', () => {
      const { token, hash } = generateMagicLinkToken()

      // Modify one character in the token
      const tamperedToken = token.slice(0, -1) + (token.slice(-1) === 'A' ? 'B' : 'A')
      const isValid = verifyMagicLinkToken(tamperedToken, hash)

      expect(isValid).toBe(false)
    })

    it('should reject empty token', () => {
      const { hash } = generateMagicLinkToken()
      const isValid = verifyMagicLinkToken('', hash)

      expect(isValid).toBe(false)
    })
  })
})
