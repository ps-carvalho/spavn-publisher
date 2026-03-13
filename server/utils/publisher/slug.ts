import { getTableName } from './schemaCompiler'
import { existsWhere } from './database/queries'

/**
 * Generate a URL-friendly slug from a string.
 */
export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Trim leading/trailing hyphens
}

/**
 * Generate a unique slug for a content type entry.
 * Appends -2, -3, etc. if the slug already exists.
 */
export async function generateUniqueSlug(
  pluralName: string,
  fieldName: string,
  value: string,
  excludeId?: number,
): Promise<string> {
  const tableName = getTableName(pluralName)
  const colName = toSnakeCase(fieldName)
  const baseSlug = slugify(value)

  let slug = baseSlug
  let counter = 1

  while (true) {
    const exists = await existsWhere(tableName, colName, slug, excludeId)

    if (!exists) break

    counter++
    slug = `${baseSlug}-${counter}`
  }

  return slug
}

function toSnakeCase(str: string): string {
  return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '')
}
