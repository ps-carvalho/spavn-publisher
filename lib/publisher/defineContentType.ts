import type { ContentTypeConfig } from './types'

/**
 * Define a content type for the Publisher CMS.
 *
 * This is a purely declarative function — it returns the config typed.
 * The Nitro server plugin will scan content-types/ and register each one
 * at startup, creating the corresponding database tables automatically.
 *
 * @example
 * ```ts
 * export default defineContentType({
 *   name: 'article',
 *   displayName: 'Article',
 *   pluralName: 'articles',
 *   icon: 'i-heroicons-document-text',
 *   options: { draftAndPublish: true, timestamps: true, softDelete: true },
 *   fields: {
 *     title: { type: 'string', required: true, maxLength: 255 },
 *     slug:  { type: 'uid', targetField: 'title' },
 *     body:  { type: 'richtext' },
 *   }
 * })
 * ```
 */
export function defineContentType(config: ContentTypeConfig): ContentTypeConfig {
  // Validate required fields
  if (!config.name) throw new Error('Content type must have a name')
  if (!config.displayName) throw new Error(`Content type '${config.name}' must have a displayName`)
  if (!config.pluralName) throw new Error(`Content type '${config.name}' must have a pluralName`)
  if (!config.fields || Object.keys(config.fields).length === 0) {
    throw new Error(`Content type '${config.name}' must have at least one field`)
  }

  // Validate field types
  const validTypes = [
    'string', 'text', 'richtext', 'number', 'boolean',
    'date', 'datetime', 'uid', 'media', 'relation',
    'enum', 'json', 'email', 'password',
  ]

  for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
    if (!validTypes.includes(fieldConfig.type)) {
      throw new Error(`Invalid field type '${fieldConfig.type}' for field '${fieldName}' in content type '${config.name}'`)
    }

    // Validate relation fields
    if (fieldConfig.type === 'relation') {
      if (!('relationTo' in fieldConfig) || !fieldConfig.relationTo) {
        throw new Error(`Relation field '${fieldName}' must have a 'relationTo' property`)
      }
      if (!('relationType' in fieldConfig) || !fieldConfig.relationType) {
        throw new Error(`Relation field '${fieldName}' must have a 'relationType' property`)
      }
    }

    // Validate enum fields
    if (fieldConfig.type === 'enum') {
      if (!('options' in fieldConfig) || !fieldConfig.options?.length) {
        throw new Error(`Enum field '${fieldName}' must have an 'options' array`)
      }
    }

    // Validate uid fields
    if (fieldConfig.type === 'uid') {
      if (!('targetField' in fieldConfig) || !fieldConfig.targetField) {
        throw new Error(`UID field '${fieldName}' must have a 'targetField' property`)
      }
    }
  }

  return config
}
