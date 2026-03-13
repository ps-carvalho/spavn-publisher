/**
 * POST /api/publisher/auth/login
 *
 * @deprecated Password-based login has been deprecated.
 * Use passwordless authentication methods instead:
 * - Magic link: POST /api/publisher/auth/magic-link
 * - Passkey: POST /api/publisher/auth/webauthn/authenticate
 * - TOTP: POST /api/publisher/auth/totp/verify
 *
 * This endpoint returns 410 Gone to inform clients to use passwordless methods.
 */
export default defineEventHandler(() => {
  throw createError({
    statusCode: 410,
    data: {
      error: {
        message: 'Password login has been deprecated. Please use passwordless authentication (magic link, passkey, or authenticator).',
        code: 'PASSWORD_DEPRECATED',
      },
    },
  })
})
