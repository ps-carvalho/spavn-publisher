interface PublisherUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

interface TOTPSetupResponse {
  secret: string
  qrCodeUrl: string
  backupCodes: string[]
}

/**
 * Composable for TOTP (Authenticator App) operations.
 *
 * Provides setup, verification, login, and disable flows
 * for time-based one-time password authentication.
 *
 * @example
 * ```typescript
 * const { setupTOTP, verifyTOTPSetup, loginWithTOTP, disableTOTP } = useTOTP()
 *
 * // Set up TOTP (user must be logged in)
 * const setup = await setupTOTP()
 * // Show setup.qrCodeUrl and setup.backupCodes to user
 *
 * // Verify setup with a code from the authenticator app
 * await verifyTOTPSetup('123456')
 *
 * // Login with TOTP
 * const user = await loginWithTOTP('user@example.com', '123456')
 * ```
 */
export function useTOTP() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Temporary storage for setup data during the verification flow */
  const setupData = ref<TOTPSetupResponse | null>(null)

  /**
   * Start TOTP setup for the current user.
   * Returns the secret, QR code data URL, and backup codes.
   *
   * @returns Setup data including QR code and backup codes, or null on failure
   */
  async function setupTOTP(): Promise<TOTPSetupResponse | null> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<TOTPSetupResponse>('/api/publisher/auth/totp/setup', {
        method: 'POST',
      })

      setupData.value = response
      return response
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      error.value = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to start TOTP setup'
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Complete TOTP setup by verifying a code from the authenticator app.
   *
   * @param token - The 6-digit TOTP code
   * @returns true if setup was completed successfully
   */
  async function verifyTOTPSetup(token: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await $fetch('/api/publisher/auth/totp/verify', {
        method: 'POST',
        body: { token },
      })

      setupData.value = null
      return true
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      error.value = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to verify TOTP code'
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Login with email and TOTP code (or backup code).
   *
   * @param email - The user's email address
   * @param token - The 6-digit TOTP code or backup code
   * @returns The authenticated user, or null on failure
   */
  async function loginWithTOTP(email: string, token: string): Promise<PublisherUser | null> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ user: PublisherUser }>('/api/publisher/auth/totp/login', {
        method: 'POST',
        body: { email, token },
      })

      return response.user
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      error.value = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to authenticate with TOTP'
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Disable TOTP for the current user.
   * Requires a valid TOTP code for confirmation.
   *
   * @param token - The 6-digit TOTP code
   * @returns true if TOTP was disabled successfully
   */
  async function disableTOTP(token: string): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await $fetch('/api/publisher/auth/totp/disable', {
        method: 'POST',
        body: { token },
      })

      return true
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      error.value = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to disable TOTP'
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    error,
    setupData,
    setupTOTP,
    verifyTOTPSetup,
    loginWithTOTP,
    disableTOTP,
  }
}
