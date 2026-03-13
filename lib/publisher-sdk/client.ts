import type { PublisherConfig } from './types'
import { ContentResource } from './resources/content'
import { PagesResource } from './resources/pages'
import { MediaResource } from './resources/media'

/**
 * Main client for interacting with the Publisher CMS API.
 *
 * @example
 * ```ts
 * import { PublisherClient } from '@cortex/publisher-sdk'
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
 * const { data } = await articles.find()
 *
 * // Work with pages
 * const pages = await client.pages.find()
 *
 * // Upload media
 * const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
 * const media = await client.media.upload(file)
 * ```
 */
export class PublisherClient {
  private config: PublisherConfig

  constructor(config: PublisherConfig) {
    if (!config.baseUrl) {
      throw new Error('PublisherClient: baseUrl is required')
    }
    this.config = config
  }

  /**
   * Get a typed content resource for a specific content type.
   * The generic type T allows you to specify the shape of your content type.
   *
   * @param pluralName - The plural name of the content type (e.g., 'articles', 'products')
   * @returns A ContentResource instance typed with your content shape
   *
   * @example
   * ```ts
   * interface Article {
   *   id: number
   *   title: string
   *   content: string
   *   status: 'draft' | 'published'
   * }
   *
   * const articles = client.content<Article>('articles')
   * const { data } = await articles.find({ filters: { status: 'published' } })
   * ```
   */
  content<T = Record<string, unknown>>(pluralName: string): ContentResource<T> {
    return new ContentResource<T>(this.config, pluralName)
  }

  /**
   * Pages resource for managing pages in the page builder.
   *
   * @example
   * ```ts
   * // List all pages
   * const { data: pages } = await client.pages.find()
   *
   * // Create a new page
   * const { data: page } = await client.pages.create({
   *   title: 'My Page',
   *   pageType: 'landing-page',
   * })
   *
   * // Work with blocks on a page
   * const blocks = client.pages.blocks(page.id)
   * await blocks.add({ blockType: 'hero', area: 'main' })
   * ```
   */
  get pages(): PagesResource {
    return new PagesResource(this.config)
  }

  /**
   * Media resource for managing files in the media library.
   *
   * @example
   * ```ts
   * // List media files
   * const { data: files } = await client.media.list()
   *
   * // Upload a file
   * const file = new File(['hello'], 'hello.txt', { type: 'text/plain' })
   * const media = await client.media.upload(file, { folder: '/documents' })
   *
   * // Delete a file
   * await client.media.delete(123)
   * ```
   */
  get media(): MediaResource {
    return new MediaResource(this.config)
  }
}
