import sharp from 'sharp'
import { extname, basename, join } from 'path'
import { pathToFileURL } from 'url'

// Security: Maximum input image size to prevent decompression bomb attacks
const MAX_INPUT_PIXELS = 100_000_000 // 100 megapixels max (10000x10000)

// Cache for image sizes config (loaded once from publisher.config.ts)
let _cachedSizes: ImageSizes | null = null

/**
 * Image variant produced by the processor.
 */
export interface ImageVariant {
  /** Storage key for this variant */
  key: string
  /** Processed image data */
  data: Buffer
  /** Actual width after resize */
  width: number
  /** Actual height after resize */
  height: number
  /** Output MIME type (always image/webp) */
  mimeType: string
  /** Byte size of the variant */
  size: number
}

/**
 * Result of processing an image.
 */
export interface ImageProcessingResult {
  /** Generated variants */
  variants: ImageVariant[]
  /** Original image width */
  width: number
  /** Original image height */
  height: number
}

/**
 * Image size configuration from publisher.config.ts
 */
export interface ImageSizes {
  [name: string]: number
}

/**
 * Size name to file suffix mapping.
 * Used for generating variant storage keys.
 */
const SIZE_SUFFIX_MAP: Record<string, string> = {
  thumbnail: '.thumb',
  small: '.sm',
  medium: '.md',
  large: '.lg',
}

/**
 * Get the size suffix for a size name.
 * Falls back to `.{firstChar}` for unknown size names.
 */
function getSizeSuffix(sizeName: string): string {
  if (SIZE_SUFFIX_MAP[sizeName]) {
    return SIZE_SUFFIX_MAP[sizeName]!
  }
  // Fallback: first character of size name
  return `.${sizeName.charAt(0)}`
}

/**
 * Extract size name from variant key.
 * Example: "root/abc123.thumb.webp" → "thumbnail"
 */
export function getSizeNameFromKey(key: string): string | null {
  // Check for known suffixes
  for (const [name, suffix] of Object.entries(SIZE_SUFFIX_MAP)) {
    if (key.includes(`${suffix}.webp`)) {
      return name
    }
  }
  return null
}

/**
 * Generate variant storage key from base key and size name.
 * Example: ("root/abc123.jpg", "thumbnail") → "root/abc123.thumb.webp"
 */
function generateVariantKey(baseKey: string, sizeName: string): string {
  const ext = extname(baseKey)
  const base = baseKey.slice(0, -ext.length)
  const suffix = getSizeSuffix(sizeName)
  return `${base}${suffix}.webp`
}

/**
 * Generate all variant keys for a given base key.
 * Used for cleanup when deleting media.
 */
export function generateVariantKeys(baseKey: string, imageSizes: ImageSizes): string[] {
  return Object.keys(imageSizes).map(sizeName => generateVariantKey(baseKey, sizeName))
}

/**
 * Load image sizes from publisher.config.ts.
 * Falls back to defaults if config cannot be loaded.
 * Result is cached at module level to avoid repeated dynamic imports.
 */
async function loadImageSizes(): Promise<ImageSizes> {
  // Return cached config if available
  if (_cachedSizes) return _cachedSizes

  try {
    const cwd = process.cwd()
    const configPath = join(cwd, 'publisher.config.ts')

    try {
      const configUrl = pathToFileURL(configPath).href
      const configModule = await import(configUrl) as { default?: { uploads?: { imageSizes?: ImageSizes } } }
      const config = configModule?.default

      if (config?.uploads?.imageSizes) {
        _cachedSizes = config.uploads.imageSizes
        return _cachedSizes
      }
    } catch {
      // Config file not found or import failed
    }
  } catch {
    // Ignore errors, use defaults
  }

  // Default sizes (also cache these)
  _cachedSizes = {
    thumbnail: 245,
    small: 500,
    medium: 750,
    large: 1000,
  }
  return _cachedSizes
}

/**
 * Process an image and generate variants (thumbnails + WebP conversions).
 *
 * For each size in imageSizes config:
 * - Resize to fit within the max dimension (maintaining aspect ratio)
 * - Convert to WebP format
 * - Only generate variants smaller than the original
 *
 * Naming convention: {baseKey}.{sizeName}.webp
 * Example: root/abc123.jpg → root/abc123.thumb.webp, root/abc123.sm.webp, etc.
 *
 * @param data - Original image buffer
 * @param storageKey - Base storage key (e.g., "root/abc123.jpg")
 * @param mimeType - Original MIME type
 * @returns Processing result with variants and original dimensions
 */
export async function processImage(
  data: Buffer,
  storageKey: string,
  mimeType: string,
): Promise<ImageProcessingResult> {
  // Load image sizes from config (cached)
  const imageSizes = await loadImageSizes()

  // Get original image metadata with security limits
  const image = sharp(data, {
    limitInputPixels: MAX_INPUT_PIXELS,
    sequentialRead: true,
  })
  const metadata = await image.metadata()

  const originalWidth = metadata.width ?? 0
  const originalHeight = metadata.height ?? 0

  // If we couldn't get dimensions, return empty result
  if (!originalWidth || !originalHeight) {
    return {
      variants: [],
      width: originalWidth,
      height: originalHeight,
    }
  }

  const variants: ImageVariant[] = []

  // Process each size
  for (const [sizeName, maxDim] of Object.entries(imageSizes)) {
    // Skip variants larger than original (no upscaling)
    if (maxDim >= Math.max(originalWidth, originalHeight)) {
      continue
    }

    try {
      // Generate variant key
      const variantKey = generateVariantKey(storageKey, sizeName)

      // Process image: resize and convert to WebP with security limits
      // Use resolveWithObject to get dimensions without extra metadata call
      const { data: processedBuffer, info } = await sharp(data, {
        limitInputPixels: MAX_INPUT_PIXELS,
        sequentialRead: true,
      })
        .resize({
          width: maxDim,
          height: maxDim,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer({ resolveWithObject: true })

      variants.push({
        key: variantKey,
        data: processedBuffer,
        width: info.width,
        height: info.height,
        mimeType: 'image/webp',
        size: processedBuffer.length,
      })
    } catch (variantError) {
      // Log but continue with other sizes
      console.warn(`Failed to process ${sizeName} variant for ${storageKey}:`, variantError)
    }
  }

  return {
    variants,
    width: originalWidth,
    height: originalHeight,
  }
}

/**
 * Check if a MIME type should be processed for image variants.
 * Returns false for SVG and GIF images.
 */
export function shouldProcessImage(mimeType: string): boolean {
  // Skip SVG (vector format, no benefit from resizing)
  if (mimeType === 'image/svg+xml') {
    return false
  }
  
  // Skip GIF (would lose animation)
  if (mimeType === 'image/gif') {
    return false
  }
  
  // Only process image types
  return mimeType.startsWith('image/')
}
