import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  firstName: z.string().max(100).optional(),
  lastName: z.string().max(100).optional(),
  role: z.enum(['super-admin', 'admin', 'editor', 'viewer']).optional(),
  isActive: z.boolean().optional(),
})

export default defineEventHandler(async (event) => {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Only super-admins can update users
  if (event.context.publisherUser.role !== 'super-admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Only super-admins can update users', code: 'FORBIDDEN' } },
    })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody(event)
  const parsed = updateUserSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues } },
    })
  }

  const db = await getDb()
  const { publisherUsers } = await getSchema()

  const [existing] = await db.select().from(publisherUsers).where(eq(publisherUsers.id, Number(id))).limit(1)
  if (!existing) {
    throw createError({ statusCode: 404, data: { error: { message: 'User not found', code: 'NOT_FOUND' } } })
  }

  const updateData: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (parsed.data.email !== undefined) updateData.email = parsed.data.email
  if (parsed.data.firstName !== undefined) updateData.firstName = parsed.data.firstName
  if (parsed.data.lastName !== undefined) updateData.lastName = parsed.data.lastName
  if (parsed.data.role !== undefined) updateData.role = parsed.data.role
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive

  await db.update(publisherUsers).set(updateData).where(eq(publisherUsers.id, Number(id)))

  const [updated] = await db.select({
    id: publisherUsers.id,
    email: publisherUsers.email,
    firstName: publisherUsers.firstName,
    lastName: publisherUsers.lastName,
    role: publisherUsers.role,
    isActive: publisherUsers.isActive,
  }).from(publisherUsers).where(eq(publisherUsers.id, Number(id)))

  return { data: updated }
})
