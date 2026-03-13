import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../../utils/publisher/database'
import { logAuthMethodChange } from '../../../../utils/publisher/audit'

const updateAuthMethodSchema = z.object({
  authMethod: z.enum(['password', 'magic-link', 'passkey', 'totp']),
  removePassword: z.boolean().optional(),
})

/**
 * PUT /api/publisher/users/:id/auth-method
 *
 * Admin endpoint to force a user's authentication method.
 * Allows admins to set a user's preferred auth method and
 * optionally remove their password (forcing passwordless-only).
 *
 * Requires super-admin or admin role.
 */
export default defineEventHandler(async (event) => {
  // Require authentication
  const admin = event.context.publisherUser
  if (!admin) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Require admin or super-admin role
  if (admin.role !== 'super-admin' && admin.role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: {
        error: {
          message: 'Only admins can change user auth methods.',
          code: 'FORBIDDEN',
        },
      },
    })
  }

  const targetId = Number(getRouterParam(event, 'id'))
  if (isNaN(targetId)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid user ID', code: 'INVALID_ID' } },
    })
  }

  const body = await readBody(event)
  const parsed = updateAuthMethodSchema.safeParse(body)

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

  const { authMethod, removePassword } = parsed.data

  const db = await getDb() as any
  const { publisherUsers } = await getSchema()

  // Fetch the target user
  const [targetUser] = await db
    .select()
    .from(publisherUsers)
    .where(eq(publisherUsers.id, targetId))
    .limit(1)

  if (!targetUser) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'User not found', code: 'NOT_FOUND' } },
    })
  }

  // Prevent non-super-admins from modifying super-admin accounts
  if (targetUser.role === 'super-admin' && admin.role !== 'super-admin') {
    throw createError({
      statusCode: 403,
      data: {
        error: {
          message: 'Only super-admins can modify super-admin accounts.',
          code: 'FORBIDDEN',
        },
      },
    })
  }

  const oldMethod = targetUser.authMethod || 'password'
  const updateData: Record<string, unknown> = {
    authMethod,
    updatedAt: new Date().toISOString(),
  }

  // Optionally remove password to force passwordless
  if (removePassword) {
    updateData.password = null
  }

  await db
    .update(publisherUsers)
    .set(updateData)
    .where(eq(publisherUsers.id, targetId))

  // Log the admin action
  await logAuthMethodChange(event, admin.id, targetId, oldMethod, authMethod)

  // Fetch updated user
  const [updated] = await db
    .select({
      id: publisherUsers.id,
      email: publisherUsers.email,
      firstName: publisherUsers.firstName,
      lastName: publisherUsers.lastName,
      role: publisherUsers.role,
      authMethod: publisherUsers.authMethod,
      isActive: publisherUsers.isActive,
    })
    .from(publisherUsers)
    .where(eq(publisherUsers.id, targetId))
    .limit(1)

  return {
    success: true,
    data: updated,
    message: `Auth method for ${updated.email} changed from ${oldMethod} to ${authMethod}.`,
  }
})
