import { z } from 'zod'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { hashPassword } from '../../../utils/publisher/auth'
import { eq } from 'drizzle-orm'

const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['super-admin', 'admin', 'editor', 'viewer']).default('editor'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export default defineEventHandler(async (event) => {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Only super-admins can create users
  if (event.context.publisherUser.role !== 'super-admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Only super-admins can create users', code: 'FORBIDDEN' } },
    })
  }

  const body = await readBody(event)
  const parsed = createUserSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues } },
    })
  }

  const db = await getDb()
  const { publisherUsers } = await getSchema()

  // Check if email exists
  const [existing] = await db.select().from(publisherUsers).where(eq(publisherUsers.email, parsed.data.email)).limit(1)
  if (existing) {
    throw createError({
      statusCode: 409,
      data: { error: { message: 'A user with this email already exists', code: 'DUPLICATE_EMAIL' } },
    })
  }

  const hashedPassword = await hashPassword(parsed.data.password)

  const [user] = await db.insert(publisherUsers).values({
    email: parsed.data.email,
    password: hashedPassword,
    firstName: parsed.data.firstName || null,
    lastName: parsed.data.lastName || null,
    role: parsed.data.role,
    isActive: true,
  }).returning({
    id: publisherUsers.id,
    email: publisherUsers.email,
    firstName: publisherUsers.firstName,
    lastName: publisherUsers.lastName,
    role: publisherUsers.role,
  })

  setResponseStatus(event, 201)
  return { data: user }
})
