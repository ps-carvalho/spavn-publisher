import { getDb, getSchema } from '../../../utils/publisher/database'

/**
 * GET /api/publisher/block-types — List all block type definitions from DB
 */
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const category = query.category as string | undefined

  const db = await getDb()
  const { publisherBlockTypeDefs } = await getSchema()

  let rows = await db.select().from(publisherBlockTypeDefs)

  // Filter by category if provided
  if (category) {
    rows = rows.filter(r => r.category === category)
  }

  return {
    data: rows.map(row => {
      const config = row.config as Record<string, any>
      return {
        id: row.id,
        name: row.name,
        displayName: row.displayName,
        icon: config?.icon || null,
        category: row.category || null,
        description: config?.description || null,
        fields: config?.fields || {},
        isSystem: row.isSystem,
        active: row.active,
        createdAt: row.createdAt,
      }
    }),
  }
})
