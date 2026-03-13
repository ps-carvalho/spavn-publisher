import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PublisherClient } from '../../lib/publisher-sdk/client'
import { PublisherApiError } from '../../lib/publisher-sdk/errors'

// Create a mock fetch function
function createMockFetch(response: any, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : status === 404 ? 'Not Found' : status === 403 ? 'Forbidden' : 'Error',
    json: () => Promise.resolve(response),
  })
}

// Create a mock fetch that returns 204 No Content
function createMockNoContentFetch() {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 204,
    statusText: 'No Content',
    json: () => Promise.resolve(null),
  })
}

describe('PublisherClient', () => {
  describe('constructor', () => {
    it('throws if baseUrl is not provided', () => {
      expect(() => new PublisherClient({ baseUrl: '' })).toThrow('baseUrl is required')
    })

    it('accepts valid config without token', () => {
      expect(() => new PublisherClient({ baseUrl: 'http://localhost:3000' })).not.toThrow()
    })

    it('accepts valid config with token', () => {
      expect(() => new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'test-token' })).not.toThrow()
    })
  })

  describe('content resource', () => {
    it('find() calls GET /api/v1/{type}', async () => {
      const mockFetch = createMockFetch({ data: [], pagination: { total: 0, page: 1, pageSize: 25, pageCount: 0 } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'test-token', fetch: mockFetch })
      
      await client.content('articles').find()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('find() passes query parameters', async () => {
      const mockFetch = createMockFetch({ data: [], pagination: {} })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.content('articles').find({ page: 2, pageSize: 10, sort: '-created_at' })
      
      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('page=2')
      expect(calledUrl).toContain('pageSize=10')
      expect(calledUrl).toContain('sort=-created_at')
    })

    it('find() passes filter parameters', async () => {
      const mockFetch = createMockFetch({ data: [], pagination: {} })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.content('articles').find({ filters: { status: 'published', category: 'tech' } })
      
      const calledUrl = mockFetch.mock.calls[0][0]
      expect(calledUrl).toContain('filters%5Bstatus%5D=published')
      expect(calledUrl).toContain('filters%5Bcategory%5D=tech')
    })

    it('findOne() calls GET /api/v1/{type}/{id}', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, title: 'Test' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      const result = await client.content('articles').findOne(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles/1',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.data.title).toBe('Test')
    })

    it('findOne() works with string IDs', async () => {
      const mockFetch = createMockFetch({ data: { id: 'abc-123', title: 'Test' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.content('articles').findOne('abc-123')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles/abc-123',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('create() calls POST with body', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, title: 'New' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.content('articles').create({ title: 'New' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New' }),
        })
      )
    })

    it('update() calls PATCH with body', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, title: 'Updated' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.content('articles').update(1, { title: 'Updated' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ title: 'Updated' }),
        })
      )
    })

    it('delete() calls DELETE', async () => {
      const mockFetch = createMockNoContentFetch()
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.content('articles').delete(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('publish() calls PATCH with status: published', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, status: 'published' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.content('articles').publish(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'published' }),
        })
      )
    })

    it('unpublish() calls PATCH with status: draft', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, status: 'draft' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.content('articles').unpublish(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'draft' }),
        })
      )
    })

    it('sends Authorization header when token is provided', async () => {
      const mockFetch = createMockFetch({ data: [] })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'my-secret-token', fetch: mockFetch })
      
      await client.content('articles').find()
      
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['Authorization']).toBe('Bearer my-secret-token')
    })

    it('does not send Authorization header when token is not provided', async () => {
      const mockFetch = createMockFetch({ data: [] })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.content('articles').find()
      
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['Authorization']).toBeUndefined()
    })

    it('sends Content-Type: application/json header', async () => {
      const mockFetch = createMockFetch({ data: [] })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.content('articles').find()
      
      const headers = mockFetch.mock.calls[0][1].headers
      expect(headers['Content-Type']).toBe('application/json')
    })
  })

  describe('error handling', () => {
    it('throws PublisherApiError on 403', async () => {
      const mockFetch = createMockFetch({ error: { message: 'Insufficient permissions', code: 'FORBIDDEN', requiredScope: 'content:write' } }, 403)
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'limited', fetch: mockFetch })
      
      await expect(client.content('articles').create({ title: 'test' }))
        .rejects
        .toThrow(PublisherApiError)
    })

    it('PublisherApiError contains status and code', async () => {
      const mockFetch = createMockFetch({ error: { message: 'Not found', code: 'NOT_FOUND' } }, 404)
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      try {
        await client.content('articles').findOne(999)
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(PublisherApiError)
        const apiError = err as PublisherApiError
        expect(apiError.status).toBe(404)
        expect(apiError.code).toBe('NOT_FOUND')
      }
    })

    it('PublisherApiError contains error detail', async () => {
      const errorDetail = { field: 'title', message: 'Title is required' }
      const mockFetch = createMockFetch({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', detail: errorDetail } }, 400)
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      try {
        await client.content('articles').create({ title: '' })
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(PublisherApiError)
        const apiError = err as PublisherApiError
        // The detail is the entire error object from the response
        expect(apiError.detail).toEqual({
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          detail: errorDetail,
        })
      }
    })

    it('handles non-JSON error responses', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.reject(new Error('Invalid JSON')),
      })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      try {
        await client.content('articles').find()
        expect.fail('Should have thrown')
      } catch (err) {
        expect(err).toBeInstanceOf(PublisherApiError)
        const apiError = err as PublisherApiError
        expect(apiError.status).toBe(500)
        expect(apiError.code).toBe('UNKNOWN_ERROR')
        expect(apiError.message).toBe('Internal Server Error')
      }
    })

    it('PublisherApiError.isClientError returns true for 4xx', async () => {
      const mockFetch = createMockFetch({ error: { message: 'Bad request', code: 'BAD_REQUEST' } }, 400)
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      try {
        await client.content('articles').create({})
        expect.fail('Should have thrown')
      } catch (err) {
        const apiError = err as PublisherApiError
        expect(apiError.isClientError).toBe(true)
        expect(apiError.isServerError).toBe(false)
      }
    })

    it('PublisherApiError.isServerError returns true for 5xx', async () => {
      const mockFetch = createMockFetch({ error: { message: 'Server error', code: 'INTERNAL_ERROR' } }, 500)
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      try {
        await client.content('articles').find()
        expect.fail('Should have thrown')
      } catch (err) {
        const apiError = err as PublisherApiError
        expect(apiError.isServerError).toBe(true)
        expect(apiError.isClientError).toBe(false)
      }
    })

    it('PublisherApiError.isStatus() checks specific status', async () => {
      const mockFetch = createMockFetch({ error: { message: 'Not found', code: 'NOT_FOUND' } }, 404)
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      try {
        await client.content('articles').findOne(999)
        expect.fail('Should have thrown')
      } catch (err) {
        const apiError = err as PublisherApiError
        expect(apiError.isStatus(404)).toBe(true)
        expect(apiError.isStatus(400)).toBe(false)
      }
    })

    it('PublisherApiError.toString() formats error nicely', async () => {
      const mockFetch = createMockFetch({ error: { message: 'Not found', code: 'NOT_FOUND' } }, 404)
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      try {
        await client.content('articles').findOne(999)
        expect.fail('Should have thrown')
      } catch (err) {
        const apiError = err as PublisherApiError
        expect(apiError.toString()).toBe('PublisherApiError [404 NOT_FOUND]: Not found')
      }
    })
  })

  describe('pages resource', () => {
    it('find() calls GET /api/v1/pages', async () => {
      const mockFetch = createMockFetch({ data: [], pagination: {} })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.pages.find()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('findOne() calls GET /api/v1/pages/{id}', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, title: 'Home', pageType: 'landing-page' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      const result = await client.pages.findOne(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/1',
        expect.objectContaining({ method: 'GET' })
      )
      expect(result.data.title).toBe('Home')
    })

    it('create() calls POST /api/v1/pages', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, title: 'New Page', pageType: 'landing-page' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.create({ title: 'New Page', pageType: 'landing-page' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ title: 'New Page', pageType: 'landing-page' }),
        })
      )
    })

    it('update() calls PATCH /api/v1/pages/{id}', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, title: 'Updated' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.update(1, { title: 'Updated' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/1',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })

    it('delete() calls DELETE /api/v1/pages/{id}', async () => {
      const mockFetch = createMockNoContentFetch()
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.delete(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('publish() calls PATCH with status: published', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, status: 'published' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.publish(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'published' }),
        })
      )
    })

    it('unpublish() calls PATCH with status: draft', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, status: 'draft' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.unpublish(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'draft' }),
        })
      )
    })

    it('blocks() returns scoped resource', async () => {
      const mockFetch = createMockFetch({ data: { main: [] } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.pages.blocks(42).list()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/42/blocks',
        expect.objectContaining({ method: 'GET' })
      )
    })

    it('blocks().add() calls POST', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, blockType: 'hero', area: 'main' } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.blocks(42).add({ blockType: 'hero', area: 'main' })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/42/blocks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ blockType: 'hero', area: 'main' }),
        })
      )
    })

    it('blocks().update() calls PATCH', async () => {
      const mockFetch = createMockFetch({ data: { id: 1, data: { title: 'Updated' } } })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.blocks(42).update(1, { data: { title: 'Updated' } })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/42/blocks/1',
        expect.objectContaining({
          method: 'PATCH',
        })
      )
    })

    it('blocks().delete() calls DELETE', async () => {
      const mockFetch = createMockNoContentFetch()
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.blocks(42).delete(1)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/42/blocks/1',
        expect.objectContaining({ method: 'DELETE' })
      )
    })

    it('blocks().reorder() calls POST /reorder', async () => {
      const mockFetch = createMockFetch({ data: [] })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', token: 'tk', fetch: mockFetch })
      
      await client.pages.blocks(42).reorder({ area: 'main', blockIds: [3, 1, 2] })
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/pages/42/blocks/reorder',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ area: 'main', blockIds: [3, 1, 2] }),
        })
      )
    })
  })

  describe('baseUrl handling', () => {
    it('removes trailing slash from baseUrl', async () => {
      const mockFetch = createMockFetch({ data: [] })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000/', fetch: mockFetch })
      
      await client.content('articles').find()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles',
        expect.any(Object)
      )
    })

    it('handles baseUrl without trailing slash', async () => {
      const mockFetch = createMockFetch({ data: [] })
      const client = new PublisherClient({ baseUrl: 'http://localhost:3000', fetch: mockFetch })
      
      await client.content('articles').find()
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/v1/articles',
        expect.any(Object)
      )
    })
  })
})

describe('PublisherApiError class', () => {
  it('creates error with all properties', () => {
    const detail = { field: 'title' }
    const error = new PublisherApiError(400, 'VALIDATION_ERROR', 'Validation failed', detail)
    
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Validation failed')
    expect(error.detail).toEqual(detail)
    expect(error.name).toBe('PublisherApiError')
  })

  it('creates error without detail', () => {
    const error = new PublisherApiError(404, 'NOT_FOUND', 'Resource not found')
    
    expect(error.detail).toBeUndefined()
  })

  it('isClientError returns correct value', () => {
    expect(new PublisherApiError(400, 'ERR', 'msg').isClientError).toBe(true)
    expect(new PublisherApiError(403, 'ERR', 'msg').isClientError).toBe(true)
    expect(new PublisherApiError(499, 'ERR', 'msg').isClientError).toBe(true)
    expect(new PublisherApiError(500, 'ERR', 'msg').isClientError).toBe(false)
  })

  it('isServerError returns correct value', () => {
    expect(new PublisherApiError(500, 'ERR', 'msg').isServerError).toBe(true)
    expect(new PublisherApiError(503, 'ERR', 'msg').isServerError).toBe(true)
    expect(new PublisherApiError(499, 'ERR', 'msg').isServerError).toBe(false)
  })

  it('isStatus checks specific status', () => {
    const error = new PublisherApiError(404, 'NOT_FOUND', 'Not found')
    expect(error.isStatus(404)).toBe(true)
    expect(error.isStatus(400)).toBe(false)
  })
})
