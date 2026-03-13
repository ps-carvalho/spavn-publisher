import type { BlockTypeConfig } from './types'

/**
 * Define a reusable block type for the Page Builder.
 *
 * This is a purely declarative function — it returns the config typed.
 * The Nitro server plugin will scan block-types/ and register each one
 * at startup, making them available for use in page areas.
 *
 * @example
 * ```ts
 * export default defineBlockType({
 *   name: 'hero',
 *   displayName: 'Hero Section',
 *   icon: 'i-heroicons-sparkles',
 *   category: 'layout',
 *   fields: {
 *     title:    { type: 'string', required: true, maxLength: 255 },
 *     subtitle: { type: 'text' },
 *     image:    { type: 'media' },
 *   }
 * })
 * ```
 */
export function defineBlockType(config: BlockTypeConfig): BlockTypeConfig {
  // Validate required fields
  if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
    throw new Error('Block type must have a non-empty name')
  }
  if (!config.displayName || typeof config.displayName !== 'string' || config.displayName.trim() === '') {
    throw new Error(`Block type '${config.name}' must have a non-empty displayName`)
  }
  if (!config.fields || Object.keys(config.fields).length === 0) {
    throw new Error(`Block type '${config.name}' must have at least one field`)
  }

  // Validate field types
  const validTypes = [
    'string', 'text', 'richtext', 'number', 'boolean',
    'date', 'datetime', 'uid', 'media', 'relation',
    'enum', 'json', 'email', 'password',
  ]

  for (const [fieldName, fieldConfig] of Object.entries(config.fields)) {
    if (!validTypes.includes(fieldConfig.type)) {
      throw new Error(`Invalid field type '${fieldConfig.type}' for field '${fieldName}' in block type '${config.name}'`)
    }

    // Validate relation fields
    if (fieldConfig.type === 'relation') {
      if (!('relationTo' in fieldConfig) || !fieldConfig.relationTo) {
        throw new Error(`Relation field '${fieldName}' in block type '${config.name}' must have a 'relationTo' property`)
      }
      if (!('relationType' in fieldConfig) || !fieldConfig.relationType) {
        throw new Error(`Relation field '${fieldName}' in block type '${config.name}' must have a 'relationType' property`)
      }
    }

    // Validate enum fields
    if (fieldConfig.type === 'enum') {
      if (!('options' in fieldConfig) || !fieldConfig.options?.length) {
        throw new Error(`Enum field '${fieldName}' in block type '${config.name}' must have an 'options' array`)
      }
    }

    // Validate uid fields
    if (fieldConfig.type === 'uid') {
      if (!('targetField' in fieldConfig) || !fieldConfig.targetField) {
        throw new Error(`UID field '${fieldName}' in block type '${config.name}' must have a 'targetField' property`)
      }
    }
  }

  return config
}
