import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { logAuthEvent } from '../../../utils/publisher/audit'

const updatePreferencesSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
})

/**
 * PUT /api/publisher/auth/preferences
 *
 * Update the current user's authentication preferences.
 * Allows changing the email address.
 *
 * Requires authentication.
 */
export default defineEventHandler(async (event) => {
  const user = event.context.publisherUser
  if (!user) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  const body = await readBody(event)
  const parsed = updatePreferencesSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: parsed.error.issues,
        },
      },
    })
  }

  const { email } = parsed.data

  const db = await getDb() as any
  const { publisherUsers } = await getSchema()

  // Fetch current user state
  const [currentUser] = await db
    .select()
    .from(publisherUsers)
    .where(eq(publisherUsers.id, user.id))
    .limit(1)

  if (!currentUser) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'User not found', code: 'NOT_FOUND' } },
    })
  }

  const updateData: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  // Handle email update
  if (email && email !== currentUser.email) {
    // Check if email is already taken
    const [existing] = await db
      .select({ id: publisherUsers.id })
      .from(publisherUsers)
      .where(eq(publisherUsers.email, email))
      .limit(1)

    if (existing) {
      throw createError({
        statusCode: 409,
        data: {
          error: {
            message: 'This email address is already in use.',
            code: 'EMAIL_TAKEN',
          },
        },
      })
    }

    updateData.email = email
    // Reset email verification when email changes
    updateData.emailVerified = null

    await logAuthEvent(event, user.id, 'preference_updated', {
      field: 'email',
      oldValue: currentUser.email,
      newValue: email,
    })
  }

  // Apply updates
  await db
    .update(publisherUsers)
    .set(updateData)
    .where(eq(publisherUsers.id, user.id))

  // Fetch updated user
  const [updated] = await db
    .select({
      id: publisherUsers.id,
      email: publisherUsers.email,
      emailVerified: publisherUsers.emailVerified,
    })
    .from(publisherUsers)
    .where(eq(publisherUsers.id, user.id))
    .limit(1)

  return {
    success: true,
    preferences: {
      email: updated.email,
      emailVerified: updated.emailVerified,
    },
  }
})
