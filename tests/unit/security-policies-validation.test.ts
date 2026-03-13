import { describe, it, expect } from 'vitest'
import { z } from 'zod'

/**
 * These schemas are duplicated from the handler for unit testing purposes.
 * The source of truth is server/api/publisher/settings/security-policies.put.ts.
 *
 * We test the Zod validation logic in isolation, without requiring the Nitro runtime.
 */
const policySchema = z.object({
  role: z.string().min(1),
  require2FA: z.boolean(),
  allowedMethods: z.array(z.enum(['magic-link', 'passkey', 'totp'])).min(1),
})

const updateSchema = z.object({
  policies: z.array(policySchema),
})

describe('Security Policies Validation', () => {
  describe('policySchema', () => {
    it('should accept a valid policy with all fields', () => {
      const input = {
        role: 'editor',
        require2FA: true,
        allowedMethods: ['totp', 'passkey'],
      }
      const result = policySchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(input)
      }
    })

    it('should accept a policy with a single allowed method', () => {
      const result = policySchema.safeParse({
        role: 'viewer',
        require2FA: false,
        allowedMethods: ['magic-link'],
      })
      expect(result.success).toBe(true)
    })

    it('should accept all three valid auth methods', () => {
      const result = policySchema.safeParse({
        role: 'admin',
        require2FA: true,
        allowedMethods: ['magic-link', 'passkey', 'totp'],
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.allowedMethods).toHaveLength(3)
      }
    })

    it('should reject an empty role string', () => {
      const result = policySchema.safeParse({
        role: '',
        require2FA: true,
        allowedMethods: ['totp'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject when role is missing', () => {
      const result = policySchema.safeParse({
        require2FA: true,
        allowedMethods: ['totp'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject when require2FA is missing', () => {
      const result = policySchema.safeParse({
        role: 'editor',
        allowedMethods: ['totp'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject when allowedMethods is missing', () => {
      const result = policySchema.safeParse({
        role: 'editor',
        require2FA: true,
      })
      expect(result.success).toBe(false)
    })

    it('should reject an empty allowedMethods array', () => {
      const result = policySchema.safeParse({
        role: 'editor',
        require2FA: true,
        allowedMethods: [],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const issues = result.error.issues
        expect(issues.some((i) => i.code === 'too_small')).toBe(true)
      }
    })

    it('should reject an invalid auth method name', () => {
      const result = policySchema.safeParse({
        role: 'editor',
        require2FA: true,
        allowedMethods: ['password'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject a mix of valid and invalid auth methods', () => {
      const result = policySchema.safeParse({
        role: 'editor',
        require2FA: true,
        allowedMethods: ['totp', 'sms'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject when require2FA is a string instead of boolean', () => {
      const result = policySchema.safeParse({
        role: 'editor',
        require2FA: 'true',
        allowedMethods: ['totp'],
      })
      expect(result.success).toBe(false)
    })

    it('should reject when role is a number instead of string', () => {
      const result = policySchema.safeParse({
        role: 123,
        require2FA: true,
        allowedMethods: ['totp'],
      })
      expect(result.success).toBe(false)
    })

    it('should strip unknown properties', () => {
      const result = policySchema.safeParse({
        role: 'editor',
        require2FA: true,
        allowedMethods: ['totp'],
        extraField: 'should be ignored',
      })
      // z.object strips unknown keys by default in strict mode,
      // but in default (strip) mode it passes and extra keys are removed
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).not.toHaveProperty('extraField')
      }
    })
  })

  describe('updateSchema', () => {
    it('should accept a valid update with multiple policies', () => {
      const input = {
        policies: [
          { role: 'admin', require2FA: true, allowedMethods: ['totp', 'passkey'] },
          { role: 'editor', require2FA: false, allowedMethods: ['magic-link'] },
        ],
      }
      const result = updateSchema.safeParse(input)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.policies).toHaveLength(2)
      }
    })

    it('should accept an empty policies array', () => {
      const result = updateSchema.safeParse({ policies: [] })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.policies).toHaveLength(0)
      }
    })

    it('should reject when policies key is missing', () => {
      const result = updateSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it('should reject when policies is not an array', () => {
      const result = updateSchema.safeParse({ policies: 'not-an-array' })
      expect(result.success).toBe(false)
    })

    it('should reject if any single policy in the array is invalid', () => {
      const result = updateSchema.safeParse({
        policies: [
          { role: 'admin', require2FA: true, allowedMethods: ['totp'] },
          { role: '', require2FA: true, allowedMethods: ['totp'] }, // invalid role
        ],
      })
      expect(result.success).toBe(false)
    })

    it('should collect errors from multiple invalid policies', () => {
      const result = updateSchema.safeParse({
        policies: [
          { role: '', require2FA: true, allowedMethods: [] },
        ],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        // Should have at least 2 issues: empty role and empty allowedMethods
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2)
      }
    })
  })
})
