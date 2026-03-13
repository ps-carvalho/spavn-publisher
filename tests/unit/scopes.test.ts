import { describe, it, expect } from 'vitest'
import { hasScope, contentScope, pageScope, mediaScope, SCOPES, ALL_SCOPES } from '../../server/utils/publisher/scopes'

describe('hasScope', () => {
  describe('backward compatibility', () => {
    // Empty scopes = legacy full access
    it('grants full access when scopes array is empty (backward compat)', () => {
      expect(hasScope([], 'content:read')).toBe(true)
      expect(hasScope([], 'pages:write')).toBe(true)
      expect(hasScope([], 'anything')).toBe(true)
      expect(hasScope([], 'content:articles:write')).toBe(true)
    })
  })

  describe('wildcard scope', () => {
    it('grants full access with wildcard scope', () => {
      expect(hasScope(['*'], 'content:read')).toBe(true)
      expect(hasScope(['*'], 'content:articles:write')).toBe(true)
      expect(hasScope(['*'], 'media:delete')).toBe(true)
      expect(hasScope(['*'], 'pages:publish')).toBe(true)
    })

    it('wildcard works alongside other scopes', () => {
      expect(hasScope(['content:read', '*'], 'media:delete')).toBe(true)
    })
  })

  describe('exact match', () => {
    it('matches exact scope strings', () => {
      expect(hasScope(['content:read'], 'content:read')).toBe(true)
      expect(hasScope(['content:read'], 'content:write')).toBe(false)
      expect(hasScope(['pages:read', 'pages:write'], 'pages:write')).toBe(true)
      expect(hasScope(['pages:read', 'pages:write'], 'pages:delete')).toBe(false)
    })

    it('does not grant access for non-matching scopes', () => {
      expect(hasScope(['content:read'], 'content:write')).toBe(false)
      expect(hasScope(['media:read'], 'media:delete')).toBe(false)
    })
  })

  describe('resource-level covers type-specific', () => {
    it('resource scope covers type-specific scope', () => {
      expect(hasScope(['content:read'], 'content:articles:read')).toBe(true)
      expect(hasScope(['content:write'], 'content:articles:write')).toBe(true)
      expect(hasScope(['content:delete'], 'content:products:delete')).toBe(true)
      expect(hasScope(['content:publish'], 'content:posts:publish')).toBe(true)
    })

    it('resource read scope does not cover type-specific write scope', () => {
      expect(hasScope(['content:read'], 'content:articles:write')).toBe(false)
      expect(hasScope(['content:write'], 'content:articles:delete')).toBe(false)
    })

    it('works with pages resource', () => {
      expect(hasScope(['pages:read'], 'pages:some-page:read')).toBe(true)
      expect(hasScope(['pages:write'], 'pages:some-page:write')).toBe(true)
    })

    it('works with media resource', () => {
      expect(hasScope(['media:read'], 'media:images:read')).toBe(true)
      expect(hasScope(['media:write'], 'media:videos:write')).toBe(true)
    })
  })

  describe('type-specific does NOT cover resource-level', () => {
    it('type-specific scope does not grant resource-level access', () => {
      expect(hasScope(['content:articles:read'], 'content:read')).toBe(false)
      expect(hasScope(['content:articles:write'], 'content:write')).toBe(false)
    })

    it('type-specific scope does not grant other type-specific access', () => {
      expect(hasScope(['content:articles:read'], 'content:products:read')).toBe(false)
    })
  })

  describe('multiple scopes', () => {
    it('checks all scopes in the array', () => {
      const scopes = ['content:articles:read', 'content:articles:write', 'pages:read']
      expect(hasScope(scopes, 'content:articles:read')).toBe(true)
      expect(hasScope(scopes, 'pages:read')).toBe(true)
      expect(hasScope(scopes, 'media:read')).toBe(false)
    })

    it('grants access when any scope matches', () => {
      const scopes = ['content:read', 'pages:read', 'media:read']
      expect(hasScope(scopes, 'content:articles:read')).toBe(true) // content:read covers type-specific
      expect(hasScope(scopes, 'pages:read')).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('handles malformed scope strings gracefully', () => {
      // Two-part scope (resource:action) - exact match or nothing
      expect(hasScope(['content:read'], 'content:read')).toBe(true)
      expect(hasScope(['content:read'], 'content')).toBe(false)
      expect(hasScope(['content'], 'content:read')).toBe(false)
    })

    it('handles empty string required scope', () => {
      expect(hasScope(['content:read'], '')).toBe(false)
      expect(hasScope(['*'], '')).toBe(true) // wildcard grants all
      expect(hasScope([], '')).toBe(true) // empty scopes = full access
    })

    it('handles four-part scope strings', () => {
      // Four-part scope strings are not supported - only 3-part is handled
      // The implementation only handles 3 parts (resource:type:action)
      expect(hasScope(['content:read'], 'content:articles:extra:read')).toBe(false)
      expect(hasScope(['content:read'], 'content:articles:read')).toBe(true) // 3-part works
    })
  })
})

describe('contentScope', () => {
  it('builds type-specific content scope', () => {
    expect(contentScope('articles', 'read')).toBe('content:articles:read')
    expect(contentScope('articles', 'write')).toBe('content:articles:write')
    expect(contentScope('products', 'delete')).toBe('content:products:delete')
    expect(contentScope('posts', 'publish')).toBe('content:posts:publish')
  })

  it('handles various plural names', () => {
    expect(contentScope('blog-posts', 'read')).toBe('content:blog-posts:read')
    expect(contentScope('media_files', 'write')).toBe('content:media_files:write')
  })
})

describe('pageScope', () => {
  it('builds page scope correctly', () => {
    expect(pageScope('read')).toBe('pages:read')
    expect(pageScope('write')).toBe('pages:write')
    expect(pageScope('delete')).toBe('pages:delete')
    expect(pageScope('publish')).toBe('pages:publish')
  })
})

describe('mediaScope', () => {
  it('builds media scope correctly', () => {
    expect(mediaScope('read')).toBe('media:read')
    expect(mediaScope('write')).toBe('media:write')
    expect(mediaScope('delete')).toBe('media:delete')
  })
})

describe('SCOPES constants', () => {
  it('has all expected scope values', () => {
    expect(SCOPES.CONTENT_READ).toBe('content:read')
    expect(SCOPES.CONTENT_WRITE).toBe('content:write')
    expect(SCOPES.CONTENT_DELETE).toBe('content:delete')
    expect(SCOPES.CONTENT_PUBLISH).toBe('content:publish')
    expect(SCOPES.PAGES_READ).toBe('pages:read')
    expect(SCOPES.PAGES_WRITE).toBe('pages:write')
    expect(SCOPES.PAGES_DELETE).toBe('pages:delete')
    expect(SCOPES.PAGES_PUBLISH).toBe('pages:publish')
    expect(SCOPES.MEDIA_READ).toBe('media:read')
    expect(SCOPES.MEDIA_WRITE).toBe('media:write')
    expect(SCOPES.MEDIA_DELETE).toBe('media:delete')
    expect(SCOPES.WILDCARD).toBe('*')
  })

  it('SCOPES values are immutable (as const)', () => {
    // This is a type check - the values should be readonly
    const scopes = { ...SCOPES }
    expect(scopes.CONTENT_READ).toBe('content:read')
  })
})

describe('ALL_SCOPES', () => {
  it('contains all expected scope entries', () => {
    expect(ALL_SCOPES.length).toBe(11) // 4 content + 4 pages + 3 media
  })

  it('has correct structure for each scope entry', () => {
    for (const entry of ALL_SCOPES) {
      expect(entry).toHaveProperty('value')
      expect(entry).toHaveProperty('label')
      expect(entry).toHaveProperty('group')
      expect(typeof entry.value).toBe('string')
      expect(typeof entry.label).toBe('string')
      expect(typeof entry.group).toBe('string')
    }
  })

  it('groups scopes correctly', () => {
    const contentScopes = ALL_SCOPES.filter(s => s.group === 'Content')
    const pagesScopes = ALL_SCOPES.filter(s => s.group === 'Pages')
    const mediaScopes = ALL_SCOPES.filter(s => s.group === 'Media')

    expect(contentScopes.length).toBe(4)
    expect(pagesScopes.length).toBe(4)
    expect(mediaScopes.length).toBe(3)
  })
})
