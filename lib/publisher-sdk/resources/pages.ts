import type {
  PublisherConfig,
  FindOptions,
  PaginatedResponse,
  PublisherResponse,
  PageCreateData,
  PageUpdateData,
} from '../types'
import { request, buildQueryString } from '../utils'
import { BlocksResource } from './blocks'

/**
 * A page in the Publisher CMS
 */
export interface Page {
  id: number
  title: string
  slug: string
  pageType: string
  status: 'draft' | 'published'
  meta?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
  publishedAt?: string | null
}

/**
 * Resource for interacting with pages in the Publisher CMS.
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
 * const blocks = client.pages.blocks(pageId)
 * await blocks.add({ blockType: 'hero', area: 'main' })
 * ```
 */
export class PagesResource {
  constructor(private config: PublisherConfig) {}

  /**
   * List pages with optional filters, sort, and pagination
   */
  async find(options?: FindOptions): Promise<PaginatedResponse<Page>> {
    const qs = buildQueryString(options)
    return request<PaginatedResponse<Page>>(this.config, 'GET', `/api/v1/pages${qs}`)
  }

  /**
   * Get a single page by ID
   */
  async findOne(id: number | string): Promise<PublisherResponse<Page>> {
    return request<PublisherResponse<Page>>(this.config, 'GET', `/api/v1/pages/${id}`)
  }

  /**
   * Create a new page
   */
  async create(data: PageCreateData): Promise<PublisherResponse<Page>> {
    return request<PublisherResponse<Page>>(this.config, 'POST', `/api/v1/pages`, data)
  }

  /**
   * Update a page
   */
  async update(id: number | string, data: PageUpdateData): Promise<PublisherResponse<Page>> {
    return request<PublisherResponse<Page>>(
      this.config,
      'PATCH',
      `/api/v1/pages/${id}`,
      data,
    )
  }

  /**
   * Delete a page
   */
  async delete(id: number | string): Promise<void> {
    await request<void>(this.config, 'DELETE', `/api/v1/pages/${id}`)
  }

  /**
   * Publish a page (set status to 'published')
   */
  async publish(id: number | string): Promise<PublisherResponse<Page>> {
    return request<PublisherResponse<Page>>(
      this.config,
      'PATCH',
      `/api/v1/pages/${id}`,
      { status: 'published' },
    )
  }

  /**
   * Unpublish a page (set status to 'draft')
   */
  async unpublish(id: number | string): Promise<PublisherResponse<Page>> {
    return request<PublisherResponse<Page>>(
      this.config,
      'PATCH',
      `/api/v1/pages/${id}`,
      { status: 'draft' },
    )
  }

  /**
   * Get a blocks resource scoped to a specific page
   */
  blocks(pageId: number | string): BlocksResource {
    return new BlocksResource(this.config, pageId)
  }
}
