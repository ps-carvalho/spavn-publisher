import { z } from 'zod'
import type { FieldConfig, BlockTypeConfig } from '../../../lib/publisher/types'
import { getBlockType } from './blockRegistry'
import { getPageType } from './pageTypeRegistry'

// ─── Schema cache (block types are immutable after startup) ─────────
const _blockSchemaCache = new Map<string, z.ZodObject<Record<string, z.ZodTypeAny>>>()

/**
 * Build a Zod validation schema for a block's data field.
 * Used by block create/update handlers for request body validation.
 * Results are cached per block type + mode since block types are immutable.
 */
export function buildBlockDataSchema(
  blockType: BlockTypeConfig,
  mode: 'create' | 'update' = 'create',
): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const cacheKey = `${blockType.name}:${mode}`
  const cached = _blockSchemaCache.get(cacheKey)
  if (cached) return cached

  const shape: Record<string, z.ZodTypeAny> = {}

  for (const [fieldName, fieldConfig] of Object.entries(blockType.fields)) {
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
  _blockSchemaCache.set(cacheKey, schema)
  return schema
}

/**
 * Build a Zod schema for creating a block within a page.
 * Validates the structure of the request body for block creation.
 * Note: blockType/area constraints are validated at the route handler level.
 */
export function buildBlockCreateSchema(pageTypeName: string): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const pageType = getPageType(pageTypeName)

  // If page type doesn't exist, still return a basic schema
  // Route handlers will handle the error appropriately
  if (!pageType) {
    return z.object({
      areaName: z.string(),
      blockType: z.string(),
      data: z.record(z.string(), z.unknown()),
      sortOrder: z.number().optional(),
    })
  }

  // Get valid area names from page type
  const areaNames = Object.keys(pageType.areas)

  return z.object({
    areaName: z.enum(areaNames as [string, ...string[]], {
      message: `areaName must be one of: ${areaNames.join(', ')}`,
    }),
    blockType: z.string(),
    data: z.record(z.string(), z.unknown()),
    sortOrder: z.number().optional(),
  })
}

/**
 * Convenience function to validate block data against its block type schema.
 * Looks up the block type from registry, builds the schema, and validates.
 * Returns parsed data on success, ZodError on failure.
 * Throws if block type not found.
 */
export function validateBlockData(
  blockTypeName: string,
  data: unknown,
  mode: 'create' | 'update' = 'create',
): { success: boolean; data?: any; error?: z.ZodError } {
  const blockType = getBlockType(blockTypeName)

  if (!blockType) {
    throw new Error(`[Publisher] Block type '${blockTypeName}' not found in registry.`)
  }

  const schema = buildBlockDataSchema(blockType, mode)
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }
  else {
    return { success: false, error: result.error }
  }
}

// ─── Internal: Field Schema Builder (replicated from zodBuilder) ────

/**
 * Build a Zod schema for a single field.
 * Replicated from zodBuilder.ts to avoid modifying working content CRUD code.
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
      let schema = z.number()
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
      return z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format').optional()

    case 'media':
      if ('multiple' in config && config.multiple) {
        return z.array(z.number().int().positive()).optional()
      }
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
