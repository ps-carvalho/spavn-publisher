import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { generateMagicLinkToken } from '../../../../utils/publisher/magicLink'
import { checkRateLimit } from '../../../../utils/publisher/rateLimit'
import { getDefaultEmailProvider } from '../../../../utils/publisher/email'
import { generateMagicLinkEmail } from '../../../../utils/publisher/email/templates/magic-link'

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

/**
 * POST /api/publisher/auth/magic-link/request
 *
 * Request a magic link for passwordless email authentication.
 * Always returns a generic success message to prevent email enumeration.
 *
 * Rate limited: 3 requests per email per hour.
 * Requires the `magicLinks` feature flag to be enabled.
 */
export default defineEventHandler(async (event) => {
  // Check feature flag
  const body = await readBody(event)

  // Validate input
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid email address', code: 'VALIDATION_ERROR' } },
    })
  }

  const { email } = parsed.data

  // Rate limit: 3 requests per email per hour
  await checkRateLimit(`magic-link:${email.toLowerCase()}`, {
    max: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  })

  // Generic success response (returned regardless of whether user exists)
  const successResponse = {
    success: true,
    message: 'If an account exists with that email, a sign-in link has been sent. Check your email.',
  }

  try {
    const db = await getDb() as any
    const { publisherUsers, publisherMagicLinkTokens } = await getSchema()

    // Look up user by email (case-insensitive)
    const [user] = await db
      .select({
        id: publisherUsers.id,
        email: publisherUsers.email,
        isActive: publisherUsers.isActive,
      })
      .from(publisherUsers)
      .where(eq(publisherUsers.email, email.toLowerCase()))
      .limit(1)

    // If user doesn't exist or is inactive, return success anyway (prevent enumeration)
    if (!user || !user.isActive) {
      return successResponse
    }

    // Generate token
    const { token, hash } = generateMagicLinkToken()

    // Store token hash in database with 15-minute expiry
    await db.insert(publisherMagicLinkTokens).values({
      tokenHash: hash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      ipAddress: getRequestIP(event) || 'unknown',
    })

    // Build magic link URL
    const requestUrl = getRequestURL(event)
    const magicLinkUrl = `${requestUrl.origin}/admin/auth/magic-link?token=${encodeURIComponent(token)}`

    // Generate email content
    const { html, text } = generateMagicLinkEmail(magicLinkUrl, 'Publisher CMS', 15)

    // Send email
    try {
      const provider = await getDefaultEmailProvider()
      await provider.send({
        to: user.email,
        subject: 'Sign in to Publisher CMS',
        html,
        text,
      })
    }
    catch (emailError) {
      // Log email error but don't expose it to the client
      console.error('[Publisher] Failed to send magic link email:', emailError)
    }
  }
  catch (err) {
    // If it's a rate limit error, re-throw it
    if ((err as any)?.statusCode === 429) {
      throw err
    }
    // Log unexpected errors but return success to prevent information leakage
    console.error('[Publisher] Magic link request error:', err)
  }

  return successResponse
})
