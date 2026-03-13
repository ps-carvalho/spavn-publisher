import type {
  PublisherConfig,
  PublisherResponse,
  BlockAddData,
  BlockUpdateData,
  BlockReorderData,
} from '../types'
import { request } from '../utils'

/**
 * A block instance on a page
 */
export interface PageBlock {
  id: number
  pageId: number
  blockType: string
  area: string
  sortOrder: number
  data: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

/**
 * Resource for interacting with blocks on a specific page.
 * This resource is scoped to a single page and is obtained via `client.pages.blocks(pageId)`.
 *
 * @example
 * ```ts
 * const blocks = client.pages.blocks(123)
 *
 * // List all blocks on the page
 * const { data: pageBlocks } = await blocks.list()
 *
 * // Add a new block
 * await blocks.add({
 *   blockType: 'hero',
 *   area: 'main',
 *   data: { title: 'Hello World' },
 * })
 *
 * // Reorder blocks in an area
 * await blocks.reorder({
 *   area: 'main',
 *   blockIds: [3, 1, 2],
 * })
 * ```
 */
export class BlocksResource {
  constructor(
    private config: PublisherConfig,
    private pageId: number | string,
  ) {}

  /**
   * Base path for all block operations
   */
  private get basePath(): string {
    return `/api/v1/pages/${this.pageId}/blocks`
  }

  /**
   * List all blocks on the page, grouped by area
   */
  async list(): Promise<PublisherResponse<Record<string, PageBlock[]>>> {
    return request<PublisherResponse<Record<string, PageBlock[]>>>(
      this.config,
      'GET',
      this.basePath,
    )
  }

  /**
   * Add a new block to the page
   */
  async add(data: BlockAddData): Promise<PublisherResponse<PageBlock>> {
    return request<PublisherResponse<PageBlock>>(this.config, 'POST', this.basePath, data)
  }

  /**
   * Update a block's data
   */
  async update(
    blockId: number | string,
    data: BlockUpdateData,
  ): Promise<PublisherResponse<PageBlock>> {
    return request<PublisherResponse<PageBlock>>(
      this.config,
      'PATCH',
      `${this.basePath}/${blockId}`,
      data,
    )
  }

  /**
   * Delete a block from the page
   */
  async delete(blockId: number | string): Promise<void> {
    await request<void>(this.config, 'DELETE', `${this.basePath}/${blockId}`)
  }

  /**
   * Reorder blocks within an area
   */
  async reorder(data: BlockReorderData): Promise<PublisherResponse<PageBlock[]>> {
    return request<PublisherResponse<PageBlock[]>>(
      this.config,
      'POST',
      `${this.basePath}/reorder`,
      data,
    )
  }
}
