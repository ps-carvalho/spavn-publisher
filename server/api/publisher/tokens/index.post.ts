import { z } from 'zod'
import { getDb, getSchema } from '../../../utils/publisher/database'
import { generateApiToken } from '../../../utils/publisher/auth'

const createTokenSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  scopes: z.array(z.string()).default([]),
  expiresAt: z.string().optional(), // ISO date string
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  const parsed = createTokenSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: parsed.error.issues } },
    })
  }

  const { name, scopes, expiresAt } = parsed.data
  const userId = event.context.publisherUser?.id

  // Generate token
  const { token, hash, prefix } = generateApiToken()

  const db = await getDb()
  const { publisherApiTokens } = await getSchema()

  await db.insert(publisherApiTokens).values({
    name,
    tokenHash: hash,
    tokenPrefix: prefix,
    scopes,
    userId,
    expiresAt: expiresAt || null,
  })

  setResponseStatus(event, 201)

  // Return full token ONCE — it cannot be retrieved again
  return {
    data: {
      token, // Full token shown only this time!
      prefix,
      name,
      scopes,
      expiresAt,
    },
    warning: 'Save this token now. It will not be shown again.',
  }
})
