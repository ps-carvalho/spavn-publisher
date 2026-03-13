import type {
  PublisherConfig,
  FindOptions,
  PaginatedResponse,
  PublisherResponse,
} from '../types'
import { request, buildQueryString } from '../utils'

/**
 * Resource for interacting with content types in the Publisher CMS.
 * Generic type T represents the shape of the content type's data.
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
export class ContentResource<T = Record<string, unknown>> {
  constructor(
    private config: PublisherConfig,
    private pluralName: string,
  ) {}

  /**
   * List entries with optional filters, sort, and pagination
   */
  async find(options?: FindOptions): Promise<PaginatedResponse<T>> {
    const qs = buildQueryString(options)
    return request<PaginatedResponse<T>>(
      this.config,
      'GET',
      `/api/v1/${this.pluralName}${qs}`,
    )
  }

  /**
   * Get a single entry by ID
   */
  async findOne(id: number | string): Promise<PublisherResponse<T>> {
    return request<PublisherResponse<T>>(
      this.config,
      'GET',
      `/api/v1/${this.pluralName}/${id}`,
    )
  }

  /**
   * Create a new entry
   */
  async create(data: Partial<T>): Promise<PublisherResponse<T>> {
    return request<PublisherResponse<T>>(
      this.config,
      'POST',
      `/api/v1/${this.pluralName}`,
      data,
    )
  }

  /**
   * Update an entry (partial update)
   */
  async update(id: number | string, data: Partial<T>): Promise<PublisherResponse<T>> {
    return request<PublisherResponse<T>>(
      this.config,
      'PATCH',
      `/api/v1/${this.pluralName}/${id}`,
      data,
    )
  }

  /**
   * Delete an entry
   */
  async delete(id: number | string): Promise<void> {
    await request<void>(this.config, 'DELETE', `/api/v1/${this.pluralName}/${id}`)
  }

  /**
   * Publish an entry (set status to 'published')
   */
  async publish(id: number | string): Promise<PublisherResponse<T>> {
    return request<PublisherResponse<T>>(
      this.config,
      'PATCH',
      `/api/v1/${this.pluralName}/${id}`,
      { status: 'published' },
    )
  }

  /**
   * Unpublish an entry (set status to 'draft')
   */
  async unpublish(id: number | string): Promise<PublisherResponse<T>> {
    return request<PublisherResponse<T>>(
      this.config,
      'PATCH',
      `/api/v1/${this.pluralName}/${id}`,
      { status: 'draft' },
    )
  }
}
