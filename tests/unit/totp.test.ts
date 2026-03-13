import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateTOTPSecret,
  verifyTOTP,
  generateQRCode,
  generateBackupCodes,
  hashBackupCode,
  verifyBackupCode,
} from '../../server/utils/publisher/totp'

// Mock QRCode module
vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mocked'),
  },
}))

describe('TOTP Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('generateTOTPSecret', () => {
    it('should generate a valid TOTP secret with required fields', () => {
      const result = generateTOTPSecret(1, 'test@example.com')

      expect(result).toHaveProperty('secret')
      expect(result).toHaveProperty('otpauthUrl')
      expect(result).toHaveProperty('backupCodes')

      // Secret should be base32 encoded
      expect(result.secret).toMatch(/^[A-Z2-7]+$/)
      expect(result.secret.length).toBeGreaterThanOrEqual(32)

      // OTPAuth URL should be properly formatted
      expect(result.otpauthUrl).toMatch(/^otpauth:\/\/totp\//)
      // Email is URL-encoded in the otpauth URL
      expect(result.otpauthUrl).toContain(encodeURIComponent('test@example.com'))
    })

    it('should generate 10 backup codes by default', () => {
      const result = generateTOTPSecret(1, 'test@example.com')

      expect(result.backupCodes).toHaveLength(10)
    })

    it('should generate unique secrets for different users', () => {
      const result1 = generateTOTPSecret(1, 'user1@example.com')
      const result2 = generateTOTPSecret(2, 'user2@example.com')

      expect(result1.secret).not.toBe(result2.secret)
    })

    it('should generate unique backup codes for each call', () => {
      const result = generateTOTPSecret(1, 'test@example.com')
      const uniqueCodes = new Set(result.backupCodes)

      expect(uniqueCodes.size).toBe(result.backupCodes.length)
    })

    it('should include issuer in otpauth URL', () => {
      const result = generateTOTPSecret(1, 'test@example.com')

      expect(result.otpauthUrl).toContain('Publisher%20CMS') // URL encoded
    })
  })

  describe('verifyTOTP', () => {
    it('should verify a valid TOTP token', () => {
      const { secret } = generateTOTPSecret(1, 'test@example.com')

      // Generate a valid token using the secret
      const { TOTP, Secret } = require('otpauth')
      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        digits: 6,
        period: 30,
      })
      const validToken = totp.generate()

      expect(verifyTOTP(validToken, secret)).toBe(true)
    })

    it('should reject an invalid TOTP token', () => {
      const { secret } = generateTOTPSecret(1, 'test@example.com')

      expect(verifyTOTP('000000', secret)).toBe(false)
      expect(verifyTOTP('999999', secret)).toBe(false)
    })

    it('should accept tokens within time window tolerance', () => {
      const { secret } = generateTOTPSecret(1, 'test@example.com')
      const { TOTP, Secret } = require('otpauth')

      // Get current timestamp
      const now = Date.now()

      // Generate token for previous time window (30 seconds ago)
      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        digits: 6,
        period: 30,
      })

      const prevWindow = Math.floor(now / 30000) - 1
      const token = totp.generate({ timestamp: prevWindow * 30000 })

      // Should still verify due to window tolerance
      expect(verifyTOTP(token, secret)).toBe(true)
    })

    it('should reject tokens outside time window', () => {
      const { secret } = generateTOTPSecret(1, 'test@example.com')
      const { TOTP, Secret } = require('otpauth')

      // Generate token for 5 minutes ago (outside ±1 window)
      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        digits: 6,
        period: 30,
      })

      const now = Date.now()
      const oldWindow = Math.floor(now / 30000) - 10 // 5 minutes ago
      const oldToken = totp.generate({ timestamp: oldWindow * 30000 })

      expect(verifyTOTP(oldToken, secret)).toBe(false)
    })

    it('should handle non-numeric tokens', () => {
      const { secret } = generateTOTPSecret(1, 'test@example.com')

      expect(verifyTOTP('abcdef', secret)).toBe(false)
      expect(verifyTOTP('12-345', secret)).toBe(false)
    })

    it('should handle wrong length tokens', () => {
      const { secret } = generateTOTPSecret(1, 'test@example.com')

      expect(verifyTOTP('12345', secret)).toBe(false)
      expect(verifyTOTP('1234567', secret)).toBe(false)
    })

    it('should be case insensitive for secret', () => {
      const { secret } = generateTOTPSecret(1, 'test@example.com')
      const { TOTP, Secret } = require('otpauth')

      const totp = new TOTP({
        secret: Secret.fromBase32(secret),
        digits: 6,
        period: 30,
      })
      const token = totp.generate()

      // Verify with lowercase secret
      expect(verifyTOTP(token, secret.toLowerCase())).toBe(true)
    })
  })

  describe('generateQRCode', () => {
    it('should generate a data URL for valid otpauth URL', async () => {
      const otpauthUrl = 'otpauth://totp/test?secret=JBSWY3DPEHPK3PXP'
      const result = await generateQRCode(otpauthUrl)

      expect(result).toMatch(/^data:image\/png;base64,/)
    })

    it('should return mocked data URL', async () => {
      const result = await generateQRCode('any-url')

      expect(result).toBe('data:image/png;base64,mocked')
    })
  })

  describe('generateBackupCodes', () => {
    it('should generate codes in XXXX-XXXX format', () => {
      const codes = generateBackupCodes(5)

      codes.forEach(code => {
        expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)
      })
    })

    it('should not contain confusing characters (0, O, I, 1, L)', () => {
      const codes = generateBackupCodes(20)
      const allChars = codes.join('').replace(/-/g, '')

      expect(allChars).not.toMatch(/[0OIL1]/)
    })

    it('should generate specified number of codes', () => {
      expect(generateBackupCodes(5)).toHaveLength(5)
      expect(generateBackupCodes(10)).toHaveLength(10)
      expect(generateBackupCodes(1)).toHaveLength(1)
    })

    it('should generate unique codes', () => {
      const codes = generateBackupCodes(100)
      const uniqueCodes = new Set(codes)

      expect(uniqueCodes.size).toBe(codes.length)
    })
  })

  describe('hashBackupCode', () => {
    it('should produce consistent hashes for identical codes', () => {
      const code = 'ABCD-EFGH'
      const hash1 = hashBackupCode(code)
      const hash2 = hashBackupCode(code)

      expect(hash1).toBe(hash2)
    })

    it('should normalize code before hashing (uppercase, no hyphens)', () => {
      const hash1 = hashBackupCode('abcd-efgh')
      const hash2 = hashBackupCode('ABCD-EFGH')
      const hash3 = hashBackupCode('ABCDEFGH')

      expect(hash1).toBe(hash2)
      expect(hash2).toBe(hash3)
    })

    it('should produce different hashes for different codes', () => {
      const hash1 = hashBackupCode('ABCD-EFGH')
      const hash2 = hashBackupCode('WXYZ-1234')

      expect(hash1).not.toBe(hash2)
    })

    it('should return 64-character hex string', () => {
      const hash = hashBackupCode('TEST-CODE')

      expect(hash).toHaveLength(64)
      expect(hash).toMatch(/^[a-f0-9]{64}$/)
    })
  })

  describe('verifyBackupCode', () => {
    it('should return index of matching code', () => {
      const code1 = 'ABCD-EFGH'
      const code2 = 'WXYZ-1234'
      const hashedCodes = [hashBackupCode(code1), hashBackupCode(code2)]

      expect(verifyBackupCode(code1, hashedCodes)).toBe(0)
      expect(verifyBackupCode(code2, hashedCodes)).toBe(1)
    })

    it('should handle case-insensitive input', () => {
      const code = 'ABCD-EFGH'
      const hashedCodes = [hashBackupCode(code)]

      expect(verifyBackupCode('abcd-efgh', hashedCodes)).toBe(0)
      expect(verifyBackupCode('AbCd-EfGh', hashedCodes)).toBe(0)
    })

    it('should handle different formats (with/without hyphen)', () => {
      const code = 'ABCD-EFGH'
      const hashedCodes = [hashBackupCode(code)]

      expect(verifyBackupCode('ABCD-EFGH', hashedCodes)).toBe(0)
      expect(verifyBackupCode('ABCDEFGH', hashedCodes)).toBe(0)
    })

    it('should return -1 for non-matching code', () => {
      const hashedCodes = [hashBackupCode('ABCD-EFGH')]

      expect(verifyBackupCode('ZZZZ-ZZZZ', hashedCodes)).toBe(-1)
    })

    it('should return -1 for empty code list', () => {
      expect(verifyBackupCode('ABCD-EFGH', [])).toBe(-1)
    })

    it('should find first match if duplicates exist', () => {
      const code = 'ABCD-EFGH'
      const hash = hashBackupCode(code)
      const hashedCodes = [hash, hash, hash]

      expect(verifyBackupCode(code, hashedCodes)).toBe(0)
    })
  })
})
