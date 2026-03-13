import { eq } from 'drizzle-orm'
import { getDb, getSchema } from '../../../utils/publisher/database'

export default defineEventHandler(async (event) => {
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Only super-admins can delete users
  if (event.context.publisherUser.role !== 'super-admin') {
    throw createError({
      statusCode: 403,
      data: { error: { message: 'Only super-admins can delete users', code: 'FORBIDDEN' } },
    })
  }

  const id = getRouterParam(event, 'id')
  const db = await getDb()
  const { publisherUsers } = await getSchema()

  const [user] = await db.select().from(publisherUsers).where(eq(publisherUsers.id, Number(id))).limit(1)
  if (!user) {
    throw createError({ statusCode: 404, data: { error: { message: 'User not found', code: 'NOT_FOUND' } } })
  }

  // Don't allow deleting yourself
  if (event.context.publisherUser?.id === Number(id)) {
    throw createError({ statusCode: 400, data: { error: { message: 'Cannot delete your own account', code: 'SELF_DELETE' } } })
  }

  await db.delete(publisherUsers).where(eq(publisherUsers.id, Number(id)))
  return { data: null }
})
