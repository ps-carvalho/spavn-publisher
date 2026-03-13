import { z } from 'zod'
import type { ContentTypeConfig, FieldConfig } from '../../../lib/publisher/types'

// ─── Schema cache (content types are immutable after startup) ────
const _schemaCache = new Map<string, z.ZodObject<Record<string, z.ZodTypeAny>>>()

/**
 * Build a Zod validation schema from a content type config.
 * Used by POST/PUT/PATCH handlers for request body validation.
 * Results are cached per content type + mode since content types are immutable.
 */
export function buildZodSchema(
  contentType: ContentTypeConfig,
  mode: 'create' | 'update' = 'create',
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const cacheKey = `${contentType.name}:${mode}`
  const cached = _schemaCache.get(cacheKey)
  if (cached) return cached

  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [fieldName, fieldConfig] of Object.entries(contentType.fields)) {
    let fieldSchema = buildFieldSchema(fieldConfig)

    // In update mode, all fields are optional
    if (mode === 'update') {
      fieldSchema = fieldSchema.optional()
    }
    else if (!fieldConfig.required) {
      fieldSchema = fieldSchema.optional().nullable()
    }

    shape[fieldName] = fieldSchema
  }

  const schema = z.object(shape)
  _schemaCache.set(cacheKey, schema)
  return schema
}

/**
 * Build a Zod schema for a single field.
 */
function buildFieldSchema(config: FieldConfig): z.ZodTypeAny {
  switch (config.type) {
    case 'string':
      return buildStringSchema(config)

    case 'email':
      return z.string().email('Invalid email address')

    case 'password':
      return z.string().min(1, 'Password is required')

    case 'text':
    case 'richtext':
      return z.string()

    case 'number': {
      let schema = z.coerce.number()
      if ('min' in config && config.min !== undefined) schema = schema.min(config.min)
      if ('max' in config && config.max !== undefined) schema = schema.max(config.max)
      return schema
    }

    case 'boolean':
      return z.boolean()

    case 'date':
    case 'datetime':
      return z.string() // ISO date string

    case 'uid':
      // Preprocess: HTML forms send "" for empty inputs — convert to undefined
      // so .optional() allows it and UID auto-generation kicks in
      return z.preprocess(
        (val) => (val === '' ? undefined : val),
        z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format').optional(),
      )

    case 'media':
      return z.number().int().positive().optional() // Media ID

    case 'relation':
      if ('relationType' in config) {
        if (config.relationType === 'oneToMany' || config.relationType === 'manyToMany') {
          return z.array(z.number().int().positive()).optional()
        }
      }
      return z.number().int().positive().optional()

    case 'enum':
      if ('options' in config && config.options?.length) {
        return z.enum(config.options as [string, ...string[]])
      }
      return z.string()

    case 'json':
      return z.any() // Accept any JSON

    default:
      return z.any()
  }
}

/**
 * Build a string schema with length constraints.
 */
function buildStringSchema(config: FieldConfig): z.ZodString {
  let schema = z.string()
  if ('maxLength' in config && config.maxLength) {
    schema = schema.max(config.maxLength)
  }
  if ('minLength' in config && config.minLength) {
    schema = schema.min(config.minLength)
  }
  return schema
}
