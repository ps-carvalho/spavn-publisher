import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser'

interface PublisherUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

interface WebAuthnCredential {
  id: string
  deviceName: string | null
  createdAt: string
  lastUsedAt: string | null
}

/**
 * Composable for WebAuthn (Passkey) operations.
 *
 * Provides registration and authentication flows using the
 * Web Authentication API via @simplewebauthn/browser.
 *
 * @example
 * ```typescript
 * const { registerPasskey, authenticateWithPasskey, isSupported } = useWebAuthn()
 *
 * // Register a new passkey (user must be logged in)
 * await registerPasskey('My Laptop')
 *
 * // Authenticate with a passkey
 * const user = await authenticateWithPasskey('user@example.com')
 * ```
 */
export function useWebAuthn() {
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /** Whether the browser supports WebAuthn */
  const isSupported = computed(() => {
    if (import.meta.server) return false
    return browserSupportsWebAuthn()
  })

  /**
   * Register a new passkey for the currently authenticated user.
   *
   * @param deviceName - Optional friendly name for the passkey
   * @returns The registered credential info, or null on failure
   */
  async function registerPasskey(deviceName?: string): Promise<WebAuthnCredential | null> {
    if (!isSupported.value) {
      error.value = 'Your browser does not support passkeys'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      // Step 1: Get registration options from the server
      const options = await $fetch('/api/publisher/auth/webauthn/register/options', {
        method: 'POST',
      })

      // Step 2: Start the WebAuthn registration ceremony in the browser
      let attestation
      try {
        attestation = await startRegistration({ optionsJSON: options as any })
      }
      catch (err: any) {
        // User cancelled or browser error
        if (err.name === 'NotAllowedError') {
          error.value = 'Passkey registration was cancelled'
          return null
        }
        throw err
      }

      // Step 3: Send the attestation to the server for verification
      const result = await $fetch<{ success: boolean; credential: WebAuthnCredential }>(
        '/api/publisher/auth/webauthn/register/verify',
        {
          method: 'POST',
          body: {
            response: attestation,
            deviceName,
          },
        },
      )

      return result.credential
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      error.value = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to register passkey'
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Authenticate with a passkey.
   *
   * @param email - The user's email address
   * @returns The authenticated user, or null on failure
   */
  async function authenticateWithPasskey(email: string): Promise<PublisherUser | null> {
    if (!isSupported.value) {
      error.value = 'Your browser does not support passkeys'
      return null
    }

    isLoading.value = true
    error.value = null

    try {
      // Step 1: Get authentication options from the server
      const options = await $fetch('/api/publisher/auth/webauthn/authenticate/options', {
        method: 'POST',
        body: { email },
      })

      // Step 2: Start the WebAuthn authentication ceremony in the browser
      let assertion
      try {
        assertion = await startAuthentication({ optionsJSON: options as any })
      }
      catch (err: any) {
        // User cancelled or browser error
        if (err.name === 'NotAllowedError') {
          error.value = 'Passkey authentication was cancelled'
          return null
        }
        throw err
      }

      // Step 3: Send the assertion to the server for verification
      const result = await $fetch<{ user: PublisherUser }>(
        '/api/publisher/auth/webauthn/authenticate/verify',
        {
          method: 'POST',
          body: {
            response: assertion,
            email,
          },
        },
      )

      return result.user
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      error.value = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to authenticate with passkey'
      return null
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Fetch the list of registered passkeys for the current user.
   */
  async function listCredentials(): Promise<WebAuthnCredential[]> {
    try {
      const result = await $fetch<{ credentials: WebAuthnCredential[] }>(
        '/api/publisher/auth/webauthn/credentials',
      )
      return result.credentials
    }
    catch {
      return []
    }
  }

  /**
   * Delete a registered passkey by ID.
   */
  async function deleteCredential(credentialId: string): Promise<boolean> {
    try {
      await $fetch(`/api/publisher/auth/webauthn/credentials/${encodeURIComponent(credentialId)}`, {
        method: 'DELETE',
      })
      return true
    }
    catch (e: unknown) {
      const err = e as { data?: { data?: { error?: { message?: string } }; error?: { message?: string } } }
      error.value = err?.data?.data?.error?.message || err?.data?.error?.message || 'Failed to delete passkey'
      return false
    }
  }

  return {
    isSupported,
    isLoading,
    error,
    registerPasskey,
    authenticateWithPasskey,
    listCredentials,
    deleteCredential,
  }
}
