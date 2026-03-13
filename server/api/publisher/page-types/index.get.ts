import { getDb, getSchema } from '../../../utils/publisher/database'

/**
 * GET /api/publisher/page-types — List all page type definitions from DB
 */
export default defineEventHandler(async () => {
  const db = await getDb()
  const { publisherPageTypeDefs } = await getSchema()

  const rows = await db.select().from(publisherPageTypeDefs)

  return {
    data: rows.map(row => {
      const config = row.config as Record<string, any>
      return {
        id: row.id,
        name: row.name,
        displayName: row.displayName,
        icon: config?.icon || null,
        description: config?.description || null,
        areas: config?.areas || {},
        options: config?.options || {},
        isSystem: row.isSystem,
        active: row.active,
        createdAt: row.createdAt,
      }
    }),
  }
})
