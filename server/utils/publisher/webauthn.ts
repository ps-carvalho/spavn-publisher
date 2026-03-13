/**
 * WebAuthn Utilities
 *
 * Server-side WebAuthn helpers using @simplewebauthn/server.
 * Provides registration and authentication flows for passkey support.
 *
 * @see https://simplewebauthn.dev/docs/packages/server
 */
import {
  generateRegistrationOptions as _generateRegistrationOptions,
  verifyRegistrationResponse as _verifyRegistrationResponse,
  generateAuthenticationOptions as _generateAuthenticationOptions,
  verifyAuthenticationResponse as _verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  GenerateRegistrationOptionsOpts,
  VerifiedRegistrationResponse,
  GenerateAuthenticationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server'

// ─── Configuration ──────────────────────────────────────────────────

/**
 * Get WebAuthn Relying Party configuration from environment variables.
 * Falls back to sensible defaults for local development.
 */
export function getWebAuthnConfig() {
  return {
    rpName: process.env.PUBLISHER_RP_NAME || 'Publisher CMS',
    rpID: process.env.PUBLISHER_RP_ID || 'localhost',
    origin: process.env.PUBLISHER_RP_ORIGIN || 'http://localhost:3000',
  }
}

// ─── Types ──────────────────────────────────────────────────────────

/** Existing credential shape for exclude/allow lists */
export interface ExistingCredential {
  id: string
  transports?: string[] | null
}

// ─── Registration ───────────────────────────────────────────────────

/**
 * Generate registration options for a new WebAuthn credential.
 *
 * @param userId - The user's numeric ID
 * @param email - The user's email (used as userName)
 * @param existingCredentials - User's existing credentials (to exclude re-registration)
 * @returns Registration options to send to the client
 */
export async function generateRegistrationOpts(
  userId: number,
  email: string,
  existingCredentials: ExistingCredential[] = [],
) {
  const { rpName, rpID } = getWebAuthnConfig()

  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID: new TextEncoder().encode(userId.toString()),
    userName: email,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map(c => ({
      id: c.id,
      transports: (c.transports || []) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  }

  return _generateRegistrationOptions(opts)
}

/**
 * Verify a registration response from the client.
 *
 * @param response - The registration response from the browser
 * @param expectedChallenge - The challenge that was sent to the client
 * @returns Verification result with credential info
 */
export async function verifyRegistration(
  response: RegistrationResponseJSON,
  expectedChallenge: string,
): Promise<VerifiedRegistrationResponse> {
  const { rpID, origin } = getWebAuthnConfig()

  const opts: VerifyRegistrationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  }

  return _verifyRegistrationResponse(opts)
}

// ─── Authentication ─────────────────────────────────────────────────

/**
 * Generate authentication options for an existing credential.
 *
 * @param allowCredentials - Credentials the user can authenticate with
 * @returns Authentication options to send to the client
 */
export async function generateAuthenticationOpts(
  allowCredentials: ExistingCredential[] = [],
) {
  const { rpID } = getWebAuthnConfig()

  const opts: GenerateAuthenticationOptionsOpts = {
    rpID,
    allowCredentials: allowCredentials.map(c => ({
      id: c.id,
      transports: (c.transports || []) as AuthenticatorTransportFuture[],
    })),
    userVerification: 'preferred',
  }

  return _generateAuthenticationOptions(opts)
}

/**
 * Verify an authentication response from the client.
 *
 * @param response - The authentication response from the browser
 * @param expectedChallenge - The challenge that was sent to the client
 * @param credentialPublicKey - The stored public key (base64url encoded)
 * @param credentialCounter - The stored counter value
 * @param credentialID - The credential ID
 * @returns Verification result
 */
export async function verifyAuthentication(
  response: AuthenticationResponseJSON,
  expectedChallenge: string,
  credentialPublicKey: string,
  credentialCounter: number,
  credentialID: string,
): Promise<VerifiedAuthenticationResponse> {
  const { rpID, origin } = getWebAuthnConfig()

  // Convert base64url public key back to Uint8Array
  const publicKeyBytes = base64urlToUint8Array(credentialPublicKey) as Uint8Array<ArrayBuffer>

  const opts: VerifyAuthenticationResponseOpts = {
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: credentialID,
      publicKey: publicKeyBytes,
      counter: credentialCounter,
    },
  }

  return _verifyAuthenticationResponse(opts)
}

// ─── Encoding Helpers ───────────────────────────────────────────────

/**
 * Convert a Uint8Array to a base64url-encoded string.
 */
export function uint8ArrayToBase64url(bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString('base64')
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Convert a base64url-encoded string to a Uint8Array.
 */
export function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return new Uint8Array(Buffer.from(padded, 'base64'))
}
