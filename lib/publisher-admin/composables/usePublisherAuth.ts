interface PublisherUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

interface AuthPreferences {
  authMethod: string
  emailVerified: string | null
  hasPassword: boolean
  hasWebAuthn: boolean
  hasTOTP: boolean
  webauthnCredentials: number
}

interface AuditEntry {
  type: string
  userId: number
  performedBy: number
  timestamp: string
  ipAddress: string
  userAgent: string
  details: Record<string, unknown>
}

interface DeviceEntry {
  id: number
  deviceName: string | null
  ipAddress: string
  isTrusted: boolean
  isCurrent?: boolean
  lastUsedAt: string
  createdAt: string
}

interface IdentifyResponse {
  email: string
  method: 'magic-link'  // Always magic-link first
  hasSecondFactor: boolean
  secondFactorMethods: ('totp' | 'passkey')[]
}

/**
 * Composable for Publisher CMS authentication state.
 * Uses useState for cross-component shared state.
 * Properly forwards cookies during SSR for session persistence.
 */
export function usePublisherAuth() {
  const user = useState<PublisherUser | null>('publisher-user', () => null)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const isLoggedIn = computed(() => !!user.value)

  /**
   * Build headers that forward cookies during SSR.
   * On client, $fetch sends cookies automatically (same-origin).
   * On server (SSR), we must manually forward the incoming request's cookies.
   */
  function _getSSRHeaders(): Record<string, string> {
    if (import.meta.server) {
      const reqHeaders = useRequestHeaders(['cookie'])
      if (reqHeaders.cookie) {
        return { cookie: reqHeaders.cookie }
      }
    }
    return {}
  }

  /**
   * Fetch the current user from the session cookie.
   * Handles SSR cookie forwarding automatically.
   */
  async function refresh(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      const data = await $fetch<{ user: PublisherUser }>('/api/publisher/auth/me', {
        headers: _getSSRHeaders(),
      })
      user.value = data.user
    }
    catch {
      user.value = null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Identify a user by email and return their available auth methods.
   * Used in Step 1 of the two-step login flow.
   */
  async function identifyUser(email: string): Promise<IdentifyResponse> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<IdentifyResponse>('/api/publisher/auth/identify', {
        method: 'POST',
        body: { email },
      })
      return response
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      const message = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to identify account'
      error.value = new Error(message)
      throw error.value
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Request a magic link for passwordless email authentication.
   * Sends a sign-in link to the provided email address.
   */
  async function requestMagicLink(email: string): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      await $fetch('/api/publisher/auth/magic-link/request', {
        method: 'POST',
        body: { email },
      })
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } }; statusCode?: number }
      const message = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to send magic link'
      error.value = new Error(message)
      throw error.value
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Verify a magic link token and establish a session.
   * Called from the magic link landing page with the token from the URL.
   */
  async function verifyMagicLink(token: string): Promise<PublisherUser> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ user: PublisherUser }>('/api/publisher/auth/magic-link/verify', {
        params: { token },
      })

      user.value = response.user
      return response.user
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      const message = err?.data?.data?.error?.message || err?.data?.error?.message || 'Invalid or expired sign-in link'
      error.value = new Error(message)
      throw error.value
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Log out the current user.
   * Clears the session cookie and redirects to login.
   */
  async function logout(): Promise<void> {
    console.log('[PublisherAuth] Logout started')
    try {
      const response = await $fetch('/api/publisher/auth/logout', { method: 'POST' })
      console.log('[PublisherAuth] Logout API response:', response)
    }
    catch (e: any) {
      console.error('[PublisherAuth] Logout API error:', e)
    }
    finally {
      console.log('[PublisherAuth] Clearing user state and navigating')
      user.value = null
      // Hard redirect ensures all client-side state is fully cleared
      if (import.meta.client) {
        window.location.href = '/admin/login'
      }
    }
  }

  /**
   * Fetch the current user's auth preferences and status.
   */
  async function getPreferences(): Promise<AuthPreferences | null> {
    try {
      return await $fetch<AuthPreferences>('/api/publisher/auth/preferences', {
        headers: _getSSRHeaders(),
      })
    }
    catch {
      return null
    }
  }

  /**
   * Update the current user's auth preferences.
   */
  async function updatePreferences(data: {
    preferredAuthMethod?: string
    email?: string
  }): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await $fetch('/api/publisher/auth/preferences', {
        method: 'PUT',
        body: data,
      })
      return true
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      const message = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to update preferences'
      error.value = new Error(message)
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Regenerate TOTP backup codes.
   * Requires a valid TOTP code for verification.
   */
  async function regenerateBackupCodes(token: string): Promise<string[] | null> {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ backupCodes: string[] }>(
        '/api/publisher/auth/backup-codes/regenerate',
        {
          method: 'POST',
          body: { token },
        },
      )
      return response.backupCodes
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      const message = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to regenerate backup codes'
      error.value = new Error(message)
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch audit log entries for the current user or a specific user (admin only).
   */
  async function getAuditLog(userId?: number, limit?: number): Promise<AuditEntry[]> {
    try {
      const params: Record<string, string> = {}
      if (userId) params.userId = String(userId)
      if (limit) params.limit = String(limit)

      const response = await $fetch<{ data: AuditEntry[] }>('/api/publisher/auth/audit-log', {
        params,
        headers: _getSSRHeaders(),
      })
      return response.data
    }
    catch {
      return []
    }
  }

  /**
   * Fetch active sessions/devices for the current user.
   * Returns devices with isCurrent flag for the current device.
   */
  async function getDevices(): Promise<DeviceEntry[]> {
    try {
      const response = await $fetch<{ data: DeviceEntry[] }>('/api/publisher/auth/sessions', {
        headers: _getSSRHeaders(),
      })
      return response.data
    }
    catch {
      return []
    }
  }

  /**
   * Revoke (delete) a tracked device.
   */
  async function revokeDevice(deviceId: number): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await $fetch(`/api/publisher/auth/devices/${deviceId}`, {
        method: 'DELETE',
      })
      return true
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      const message = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to revoke device'
      error.value = new Error(message)
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Update the trust status of a device.
   */
  async function trustDevice(deviceId: number, isTrusted: boolean): Promise<boolean> {
    isLoading.value = true
    error.value = null

    try {
      await $fetch(`/api/publisher/auth/devices/${deviceId}/trust`, {
        method: 'PUT',
        body: { isTrusted },
      })
      return true
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      const message = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to update device trust'
      error.value = new Error(message)
      return false
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    user,
    isLoggedIn,
    isLoading,
    error,
    refresh,
    logout,
    identifyUser,
    requestMagicLink,
    verifyMagicLink,
    getPreferences,
    updatePreferences,
    regenerateBackupCodes,
    getAuditLog,
    getDevices,
    revokeDevice,
    trustDevice,
  }
}
