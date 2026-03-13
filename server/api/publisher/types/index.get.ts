import { getDb, getSchema } from '../../../utils/publisher/database'

/**
 * GET /api/publisher/types — List all content type definitions from DB
 */
export default defineEventHandler(async () => {
  const db = await getDb()
  const { publisherContentTypeDefs } = await getSchema()

  const rows = await db.select().from(publisherContentTypeDefs)

  return {
    data: rows.map(row => {
      const config = row.config as Record<string, any>
      return {
        id: row.id,
        name: row.name,
        displayName: config?.displayName || row.displayName,
        pluralName: row.pluralName,
        icon: config?.icon || null,
        description: config?.description || null,
        fields: config?.fields || {},
        options: config?.options || {},
        fieldCount: config?.fields ? Object.keys(config.fields).length : 0,
        isSystem: row.isSystem,
        active: row.active,
        createdAt: row.createdAt,
      }
    }),
  }
})
