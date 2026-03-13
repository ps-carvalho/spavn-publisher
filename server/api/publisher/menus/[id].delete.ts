import { getDb, getSchema } from '../../../utils/publisher/database'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  // Auth check
  if (!event.context.publisherUser) {
    throw createError({
      statusCode: 401,
      data: { error: { message: 'Authentication required', code: 'UNAUTHORIZED' } },
    })
  }

  // Validate ID parameter
  const id = Number(getRouterParam(event, 'id'))
  if (!id || isNaN(id)) {
    throw createError({
      statusCode: 400,
      data: { error: { message: 'Invalid menu ID', code: 'INVALID_PARAM' } },
    })
  }

  const db = await getDb()
  const { publisherMenus } = await getSchema()

  // Check if menu exists
  const [existingMenu] = await db
    .select()
    .from(publisherMenus)
    .where(eq(publisherMenus.id, id))

  if (!existingMenu) {
    throw createError({
      statusCode: 404,
      data: { error: { message: 'Menu not found', code: 'NOT_FOUND' } },
    })
  }

  // Delete the menu
  // Note: Menu items will be automatically deleted via FK cascade (onDelete: 'cascade')
  await db.delete(publisherMenus).where(eq(publisherMenus.id, id))

  return { data: null }
})
