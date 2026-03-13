/**
 * Publisher CMS Client SDK
 *
 * A typed TypeScript client for the Publisher CMS REST API.
 * Uses native `fetch` with zero external dependencies.
 *
 * @example
 * ```ts
 * import { PublisherClient, PublisherApiError } from '@cortex/publisher-sdk'
 *
 * const client = new PublisherClient({
 *   baseUrl: 'https://my-site.com',
 *   token: 'my-api-token',
 * })
 *
 * // Work with content types
 * interface Article {
 *   id: number
 *   title: string
 *   content: string
 * }
 * const articles = client.content<Article>('articles')
 * const { data, pagination } = await articles.find()
 *
 * // Handle errors
 * try {
 *   await articles.create({ title: 'New Article' })
 * } catch (error) {
 *   if (error instanceof PublisherApiError) {
 *     console.error(`API Error [${error.status}]: ${error.message}`)
 *   }
 * }
 * ```
 *
 * @module @cortex/publisher-sdk
 */

// Main client
export { PublisherClient } from './client'

// Error handling
export { PublisherApiError } from './errors'

// Types
export type {
  PublisherConfig,
  PaginatedResponse,
  PaginationInfo,
  PublisherResponse,
  FindOptions,
  PageCreateData,
  PageUpdateData,
  BlockAddData,
  BlockUpdateData,
  BlockReorderData,
  MediaListOptions,
  MediaUploadOptions,
} from './types'

// Resource types (for consumers who want typed responses)
export type { Page, PagesResource } from './resources/pages'
export type { PageBlock, BlocksResource } from './resources/blocks'
export type { Media, MediaResource } from './resources/media'
export type { ContentResource } from './resources/content'
