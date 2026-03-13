/**
 * PUT /api/publisher/settings/security-policies
 *
 * Upserts security policies (one per role).
 * Only accessible to admin and super-admin users.
 * Validates input with Zod and upserts each policy by role.
 */
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'

const policySchema = z.object({
  role: z.enum(['super-admin', 'admin', 'editor', 'viewer']),
  require2FA: z.boolean(),
  allowedMethods: z.array(z.enum(['magic-link', 'passkey', 'totp'])).min(1),
})

const updateSchema = z.object({
  policies: z.array(policySchema),
})

export default defineEventHandler(async (event) => {
  // Authentication check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Authorization check - only admins and super-admins
  const role = event.context.publisherUser.role
  if (role !== 'super-admin' && role !== 'admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Insufficient permissions', code: 'FORBIDDEN' } },
    })
  }

  // Read and validate request body
  const body = await readBody(event)
  const validationResult = updateSchema.safeParse(body)
  if (!validationResult.success) {
    throw createError({
      statusCode: 400,
      data: {
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten().fieldErrors,
        },
      },
    })
  }

  // Prevent admins from modifying super-admin policies
  if (role === 'admin') {
    const hasSuperAdminPolicy = validationResult.data.policies.some(p => p.role === 'super-admin')
    if (hasSuperAdminPolicy) {
      throw createError({
        statusCode: 403,
        data: { error: { message: 'Admins cannot modify super-admin security policies', code: 'FORBIDDEN' } },
      })
    }
  }

  const db = await getDb() as any
  const { publisherSecurityPolicies } = await getSchema()

  const now = new Date().toISOString()

  // Upsert each policy by role
  for (const policy of validationResult.data.policies) {
    const existing = await db
      .select()
      .from(publisherSecurityPolicies)
      .where(eq(publisherSecurityPolicies.role, policy.role))
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(publisherSecurityPolicies)
        .set({
          require2FA: policy.require2FA,
          allowedMethods: policy.allowedMethods,
          updatedAt: now,
        })
        .where(eq(publisherSecurityPolicies.role, policy.role))
    } else {
      await db.insert(publisherSecurityPolicies).values({
        role: policy.role,
        require2FA: policy.require2FA,
        allowedMethods: policy.allowedMethods,
      })
    }
  }

  // Return updated policies
  const policies = await db.select().from(publisherSecurityPolicies)

  return {
    success: true,
    message: 'Security policies updated',
    policies,
  }
})
