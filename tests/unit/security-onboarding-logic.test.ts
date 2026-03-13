import { describe, it, expect } from 'vitest'

/**
 * Tests for the security onboarding decision logic.
 *
 * The actual handler at server/api/publisher/auth/security-onboarding.get.ts
 * depends on Nitro runtime globals and the database. Here we extract and test
 * the pure decision logic that determines whether a user needs security
 * onboarding.
 *
 * The logic is:
 *   1. No policy for the user's role -> not required
 *   2. Policy exists but require2FA is false -> not required
 *   3. Policy requires 2FA but user has TOTP -> not required
 *   4. Policy requires 2FA but user has passkey -> not required
 *   5. Policy requires 2FA and user has no 2FA -> required
 */

interface SecurityPolicy {
  role: string
  require2FA: boolean
  allowedMethods: string[]
}

interface OnboardingResult {
  required: boolean
  recommended?: boolean
  dismissed?: boolean
  allowedMethods?: string[]
}

/**
 * Pure function that mirrors the decision logic from the GET handler.
 * This allows us to test the business rules without database or HTTP concerns.
 */
function evaluateSecurityOnboarding(
  policy: SecurityPolicy | null,
  hasTOTP: boolean,
  hasPasskey: boolean,
  dismissed: boolean,
): OnboardingResult {
  // No policy or 2FA not required
  if (!policy || !policy.require2FA) {
    return { required: false, recommended: false }
  }

  // User already has a 2FA method
  const has2FA = hasTOTP || hasPasskey

  if (has2FA) {
    return { required: false, recommended: false }
  }

  // Policy requires 2FA and user has none
  return {
    required: true,
    dismissed,
    allowedMethods: policy.allowedMethods,
  }
}

describe('Security Onboarding Logic', () => {
  describe('when no policy exists for the role', () => {
    it('should not require onboarding', () => {
      const result = evaluateSecurityOnboarding(null, false, false, false)
      expect(result.required).toBe(false)
      expect(result.recommended).toBe(false)
    })

    it('should not require onboarding even if user has 2FA', () => {
      const result = evaluateSecurityOnboarding(null, true, false, false)
      expect(result.required).toBe(false)
    })
  })

  describe('when policy exists but require2FA is false', () => {
    const policy: SecurityPolicy = {
      role: 'editor',
      require2FA: false,
      allowedMethods: ['magic-link', 'totp'],
    }

    it('should not require onboarding', () => {
      const result = evaluateSecurityOnboarding(policy, false, false, false)
      expect(result.required).toBe(false)
      expect(result.recommended).toBe(false)
    })

    it('should not include allowedMethods in response', () => {
      const result = evaluateSecurityOnboarding(policy, false, false, false)
      expect(result.allowedMethods).toBeUndefined()
    })
  })

  describe('when policy requires 2FA and user has TOTP configured', () => {
    const policy: SecurityPolicy = {
      role: 'admin',
      require2FA: true,
      allowedMethods: ['totp', 'passkey'],
    }

    it('should not require onboarding', () => {
      const result = evaluateSecurityOnboarding(policy, true, false, false)
      expect(result.required).toBe(false)
      expect(result.recommended).toBe(false)
    })
  })

  describe('when policy requires 2FA and user has passkey configured', () => {
    const policy: SecurityPolicy = {
      role: 'admin',
      require2FA: true,
      allowedMethods: ['totp', 'passkey'],
    }

    it('should not require onboarding', () => {
      const result = evaluateSecurityOnboarding(policy, false, true, false)
      expect(result.required).toBe(false)
      expect(result.recommended).toBe(false)
    })
  })

  describe('when policy requires 2FA and user has both TOTP and passkey', () => {
    const policy: SecurityPolicy = {
      role: 'admin',
      require2FA: true,
      allowedMethods: ['totp', 'passkey'],
    }

    it('should not require onboarding', () => {
      const result = evaluateSecurityOnboarding(policy, true, true, false)
      expect(result.required).toBe(false)
    })
  })

  describe('when policy requires 2FA and user has no 2FA method', () => {
    const policy: SecurityPolicy = {
      role: 'admin',
      require2FA: true,
      allowedMethods: ['totp', 'passkey'],
    }

    it('should require onboarding', () => {
      const result = evaluateSecurityOnboarding(policy, false, false, false)
      expect(result.required).toBe(true)
    })

    it('should include the allowed methods from the policy', () => {
      const result = evaluateSecurityOnboarding(policy, false, false, false)
      expect(result.allowedMethods).toEqual(['totp', 'passkey'])
    })

    it('should report dismissed as false when not dismissed', () => {
      const result = evaluateSecurityOnboarding(policy, false, false, false)
      expect(result.dismissed).toBe(false)
    })

    it('should report dismissed as true when previously dismissed', () => {
      const result = evaluateSecurityOnboarding(policy, false, false, true)
      expect(result.required).toBe(true)
      expect(result.dismissed).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle a policy with only magic-link as allowed method', () => {
      const policy: SecurityPolicy = {
        role: 'viewer',
        require2FA: true,
        allowedMethods: ['magic-link'],
      }
      // magic-link is not a 2FA method, but if the policy says require2FA
      // and user has no 2FA, onboarding is still required
      const result = evaluateSecurityOnboarding(policy, false, false, false)
      expect(result.required).toBe(true)
      expect(result.allowedMethods).toEqual(['magic-link'])
    })

    it('should handle a policy with all three methods allowed', () => {
      const policy: SecurityPolicy = {
        role: 'super-admin',
        require2FA: true,
        allowedMethods: ['magic-link', 'totp', 'passkey'],
      }
      const result = evaluateSecurityOnboarding(policy, false, false, false)
      expect(result.required).toBe(true)
      expect(result.allowedMethods).toHaveLength(3)
    })
  })
})
