import { describe, it, expect } from 'vitest'
import { defineContentType } from '../../lib/publisher/defineContentType'
import { defineBlockType } from '../../lib/publisher/defineBlockType'
import { definePageType } from '../../lib/publisher/definePageType'
import { defineMenu } from '../../lib/publisher/defineMenu'

describe('defineContentType', () => {
  describe('valid configurations', () => {
    it('returns valid config for correct input', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: {
          title: { type: 'string', required: true },
        },
      })
      expect(config.name).toBe('article')
      expect(config.displayName).toBe('Article')
      expect(config.pluralName).toBe('articles')
      expect(config.fields.title.type).toBe('string')
    })

    it('accepts all valid field types', () => {
      const config = defineContentType({
        name: 'test',
        displayName: 'Test',
        pluralName: 'tests',
        fields: {
          stringField: { type: 'string' },
          textField: { type: 'text' },
          richtextField: { type: 'richtext' },
          numberField: { type: 'number' },
          booleanField: { type: 'boolean' },
          dateField: { type: 'date' },
          datetimeField: { type: 'datetime' },
          emailField: { type: 'email' },
          passwordField: { type: 'password' },
          jsonField: { type: 'json' },
        },
      })
      expect(config.fields.stringField.type).toBe('string')
      expect(config.fields.jsonField.type).toBe('json')
    })

    it('accepts optional icon and description', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        icon: 'i-heroicons-document',
        description: 'A news article',
        fields: {
          title: { type: 'string' },
        },
      })
      expect(config.icon).toBe('i-heroicons-document')
      expect(config.description).toBe('A news article')
    })

    it('accepts content type options', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        options: {
          draftAndPublish: true,
          timestamps: true,
          softDelete: true,
        },
        fields: {
          title: { type: 'string' },
        },
      })
      expect(config.options?.draftAndPublish).toBe(true)
      expect(config.options?.timestamps).toBe(true)
      expect(config.options?.softDelete).toBe(true)
    })

    it('accepts uid field with targetField', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: {
          title: { type: 'string' },
          slug: { type: 'uid', targetField: 'title' },
        },
      })
      expect(config.fields.slug.type).toBe('uid')
    })

    it('accepts enum field with options', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: {
          status: { type: 'enum', options: ['draft', 'published', 'archived'] },
        },
      })
      expect(config.fields.status.type).toBe('enum')
    })

    it('accepts relation field with relationTo and relationType', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: {
          author: { type: 'relation', relationTo: 'authors', relationType: 'manyToOne' },
          categories: { type: 'relation', relationTo: 'categories', relationType: 'manyToMany' },
        },
      })
      expect(config.fields.author.type).toBe('relation')
    })

    it('accepts media field with options', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: {
          featuredImage: { type: 'media', multiple: false, allowedTypes: ['image/jpeg', 'image/png'] },
          gallery: { type: 'media', multiple: true, maxSelection: 10 },
        },
      })
      expect(config.fields.featuredImage.type).toBe('media')
    })

    it('accepts field options like required, unique, label, hint', () => {
      const config = defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: {
          title: { type: 'string', required: true, unique: true, label: 'Title', hint: 'Enter the article title' },
          body: { type: 'text', required: false, private: true },
          count: { type: 'number', min: 0, max: 100, default: 0 },
        },
      })
      expect(config.fields.title.required).toBe(true)
      expect(config.fields.title.unique).toBe(true)
      expect(config.fields.body.private).toBe(true)
      expect(config.fields.count.default).toBe(0)
    })
  })

  describe('validation errors', () => {
    it('throws for missing name', () => {
      expect(() => defineContentType({
        name: '',
        displayName: 'Article',
        pluralName: 'articles',
        fields: { title: { type: 'string' } },
      })).toThrow('Content type must have a name')
    })

    it('throws for missing displayName', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: '',
        pluralName: 'articles',
        fields: { title: { type: 'string' } },
      })).toThrow("Content type 'article' must have a displayName")
    })

    it('throws for missing pluralName', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: '',
        fields: { title: { type: 'string' } },
      })).toThrow("Content type 'article' must have a pluralName")
    })

    it('throws for missing fields', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: {},
      })).toThrow("Content type 'article' must have at least one field")
    })

    it('throws for undefined fields', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: undefined as any,
      })).toThrow()
    })

    it('throws for invalid field type', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: { title: { type: 'invalid-type' as any } },
      })).toThrow("Invalid field type 'invalid-type' for field 'title' in content type 'article'")
    })

    it('throws for relation field without relationTo', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: { author: { type: 'relation' as any } },
      })).toThrow("Relation field 'author' must have a 'relationTo' property")
    })

    it('throws for relation field without relationType', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: { author: { type: 'relation' as any, relationTo: 'authors' } },
      })).toThrow("Relation field 'author' must have a 'relationType' property")
    })

    it('throws for enum field without options', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: { status: { type: 'enum' as any } },
      })).toThrow("Enum field 'status' must have an 'options' array")
    })

    it('throws for enum field with empty options', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: { status: { type: 'enum', options: [] } },
      })).toThrow("Enum field 'status' must have an 'options' array")
    })

    it('throws for uid field without targetField', () => {
      expect(() => defineContentType({
        name: 'article',
        displayName: 'Article',
        pluralName: 'articles',
        fields: { slug: { type: 'uid' as any } },
      })).toThrow("UID field 'slug' must have a 'targetField' property")
    })
  })
})

describe('defineBlockType', () => {
  describe('valid configurations', () => {
    it('returns valid config for correct input', () => {
      const config = defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        fields: {
          headline: { type: 'string', required: true },
        },
      })
      expect(config.name).toBe('hero')
      expect(config.displayName).toBe('Hero Section')
      expect(config.fields.headline.type).toBe('string')
    })

    it('accepts optional icon and category', () => {
      const config = defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        icon: 'i-heroicons-sparkles',
        category: 'layout',
        description: 'A full-width hero section',
        fields: {
          headline: { type: 'string' },
        },
      })
      expect(config.icon).toBe('i-heroicons-sparkles')
      expect(config.category).toBe('layout')
      expect(config.description).toBe('A full-width hero section')
    })

    it('accepts all valid field types', () => {
      const config = defineBlockType({
        name: 'test',
        displayName: 'Test Block',
        fields: {
          stringField: { type: 'string' },
          textField: { type: 'text' },
          richtextField: { type: 'richtext' },
          numberField: { type: 'number' },
          booleanField: { type: 'boolean' },
          mediaField: { type: 'media' },
          jsonField: { type: 'json' },
        },
      })
      expect(Object.keys(config.fields).length).toBe(7)
    })

    it('accepts complex field configurations', () => {
      const config = defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        fields: {
          headline: { type: 'string', required: true, maxLength: 100 },
          subtitle: { type: 'text' },
          background: { type: 'media', allowedTypes: ['image/*'] },
          alignment: { type: 'enum', options: ['left', 'center', 'right'] },
        },
      })
      expect(config.fields.headline.maxLength).toBe(100)
    })
  })

  describe('validation errors', () => {
    it('throws for missing name', () => {
      expect(() => defineBlockType({
        name: '',
        displayName: 'Hero Section',
        fields: { headline: { type: 'string' } },
      })).toThrow('Block type must have a non-empty name')
    })

    it('throws for whitespace-only name', () => {
      expect(() => defineBlockType({
        name: '   ',
        displayName: 'Hero Section',
        fields: { headline: { type: 'string' } },
      })).toThrow('Block type must have a non-empty name')
    })

    it('throws for missing displayName', () => {
      expect(() => defineBlockType({
        name: 'hero',
        displayName: '',
        fields: { headline: { type: 'string' } },
      })).toThrow("Block type 'hero' must have a non-empty displayName")
    })

    it('throws for missing fields', () => {
      expect(() => defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        fields: {},
      })).toThrow("Block type 'hero' must have at least one field")
    })

    it('throws for invalid field type', () => {
      expect(() => defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        fields: { headline: { type: 'invalid' as any } },
      })).toThrow("Invalid field type 'invalid' for field 'headline' in block type 'hero'")
    })

    it('throws for relation field without required properties', () => {
      expect(() => defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        fields: { author: { type: 'relation' as any } },
      })).toThrow("must have a 'relationTo' property")
    })

    it('throws for enum field without options', () => {
      expect(() => defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        fields: { alignment: { type: 'enum' as any } },
      })).toThrow("must have an 'options' array")
    })

    it('throws for uid field without targetField', () => {
      expect(() => defineBlockType({
        name: 'hero',
        displayName: 'Hero Section',
        fields: { slug: { type: 'uid' as any } },
      })).toThrow("must have a 'targetField' property")
    })
  })
})

describe('definePageType', () => {
  describe('valid configurations', () => {
    it('returns valid config with areas', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main Content',
            allowedBlocks: ['hero', 'rich-text'],
          },
        },
      })
      expect(config.name).toBe('landing-page')
      expect(config.areas.main.allowedBlocks).toContain('hero')
    })

    it('accepts multiple areas', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main Content',
            allowedBlocks: ['hero', 'text'],
          },
          sidebar: {
            name: 'sidebar',
            displayName: 'Sidebar',
            allowedBlocks: ['cta', 'text'],
          },
          footer: {
            name: 'footer',
            displayName: 'Footer',
            allowedBlocks: ['text'],
          },
        },
      })
      expect(Object.keys(config.areas).length).toBe(3)
    })

    it('accepts optional icon and description', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        icon: 'i-heroicons-document',
        description: 'A landing page template',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main',
            allowedBlocks: ['hero'],
          },
        },
      })
      expect(config.icon).toBe('i-heroicons-document')
      expect(config.description).toBe('A landing page template')
    })

    it('accepts area constraints (minBlocks, maxBlocks)', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main Content',
            allowedBlocks: ['hero', 'text'],
            minBlocks: 1,
            maxBlocks: 10,
          },
        },
      })
      expect(config.areas.main.minBlocks).toBe(1)
      expect(config.areas.main.maxBlocks).toBe(10)
    })

    it('accepts page type options', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        options: {
          draftAndPublish: true,
          timestamps: true,
          softDelete: false,
          seo: true,
        },
        areas: {
          main: {
            name: 'main',
            displayName: 'Main',
            allowedBlocks: ['hero'],
          },
        },
      })
      expect(config.options?.draftAndPublish).toBe(true)
      expect(config.options?.seo).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('throws for missing name', () => {
      expect(() => definePageType({
        name: '',
        displayName: 'Landing Page',
        areas: {
          main: { name: 'main', displayName: 'Main', allowedBlocks: ['hero'] },
        },
      })).toThrow('Page type must have a non-empty name')
    })

    it('throws for whitespace-only name', () => {
      expect(() => definePageType({
        name: '   ',
        displayName: 'Landing Page',
        areas: {
          main: { name: 'main', displayName: 'Main', allowedBlocks: ['hero'] },
        },
      })).toThrow('Page type must have a non-empty name')
    })

    it('throws for missing displayName', () => {
      expect(() => definePageType({
        name: 'landing-page',
        displayName: '',
        areas: {
          main: { name: 'main', displayName: 'Main', allowedBlocks: ['hero'] },
        },
      })).toThrow("Page type 'landing-page' must have a non-empty displayName")
    })

    it('throws for missing areas', () => {
      expect(() => definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {},
      })).toThrow("Page type 'landing-page' must have at least one area")
    })

    it('throws for area without name', () => {
      expect(() => definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: { name: '', displayName: 'Main', allowedBlocks: ['hero'] },
        },
      })).toThrow("Area 'main' in page type 'landing-page' must have a non-empty name")
    })

    it('throws for area without displayName', () => {
      expect(() => definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: { name: 'main', displayName: '', allowedBlocks: ['hero'] },
        },
      })).toThrow("Area 'main' in page type 'landing-page' must have a non-empty displayName")
    })

    it('throws for area without allowedBlocks', () => {
      expect(() => definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: { name: 'main', displayName: 'Main', allowedBlocks: [] },
        },
      })).toThrow("Area 'main' in page type 'landing-page' must have at least one block type in allowedBlocks")
    })

    it('throws for area with undefined allowedBlocks', () => {
      expect(() => definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: { name: 'main', displayName: 'Main', allowedBlocks: undefined as any },
        },
      })).toThrow("Area 'main' in page type 'landing-page' must have at least one block type in allowedBlocks")
    })

    it('throws when minBlocks > maxBlocks', () => {
      expect(() => definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main',
            allowedBlocks: ['hero'],
            minBlocks: 10,
            maxBlocks: 5,
          },
        },
      })).toThrow("Area 'main' in page type 'landing-page' has minBlocks (10) greater than maxBlocks (5)")
    })

    it('accepts equal minBlocks and maxBlocks', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main',
            allowedBlocks: ['hero'],
            minBlocks: 5,
            maxBlocks: 5,
          },
        },
      })
      expect(config.areas.main.minBlocks).toBe(5)
      expect(config.areas.main.maxBlocks).toBe(5)
    })

    it('accepts only minBlocks without maxBlocks', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main',
            allowedBlocks: ['hero'],
            minBlocks: 1,
          },
        },
      })
      expect(config.areas.main.minBlocks).toBe(1)
      expect(config.areas.main.maxBlocks).toBeUndefined()
    })

    it('accepts only maxBlocks without minBlocks', () => {
      const config = definePageType({
        name: 'landing-page',
        displayName: 'Landing Page',
        areas: {
          main: {
            name: 'main',
            displayName: 'Main',
            allowedBlocks: ['hero'],
            maxBlocks: 10,
          },
        },
      })
      expect(config.areas.main.minBlocks).toBeUndefined()
      expect(config.areas.main.maxBlocks).toBe(10)
    })
  })
})

describe('defineMenu', () => {
  describe('valid configurations', () => {
    it('returns valid config for correct input', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
      })
      expect(config.name).toBe('main-navigation')
      expect(config.displayName).toBe('Main Navigation')
      expect(config.slug).toBe('main-nav')
    })

    it('accepts optional description and location', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        description: 'Primary site navigation',
        location: 'header',
      })
      expect(config.description).toBe('Primary site navigation')
      expect(config.location).toBe('header')
    })

    it('accepts menu items with page type', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'Home', type: 'page', pageId: 1 },
          { label: 'About', type: 'page', pageId: 2 },
        ],
      })
      expect(config.items).toHaveLength(2)
      expect(config.items![0].type).toBe('page')
      expect(config.items![0].pageId).toBe(1)
    })

    it('accepts menu items with external type', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'External Link', type: 'external', url: 'https://example.com', target: '_blank' },
        ],
      })
      expect(config.items![0].type).toBe('external')
      expect(config.items![0].url).toBe('https://example.com')
      expect(config.items![0].target).toBe('_blank')
    })

    it('accepts menu items with label type', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'Section Header', type: 'label' },
        ],
      })
      expect(config.items![0].type).toBe('label')
    })

    it('accepts nested menu items', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          {
            label: 'About',
            type: 'page',
            pageId: 1,
            children: [
              { label: 'Our Team', type: 'page', pageId: 2 },
              { label: 'History', type: 'page', pageId: 3 },
            ],
          },
        ],
      })
      expect(config.items![0].children).toHaveLength(2)
    })

    it('accepts deeply nested menu items', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          {
            label: 'Services',
            type: 'page',
            pageId: 1,
            children: [
              {
                label: 'Consulting',
                type: 'page',
                pageId: 2,
                children: [
                  { label: 'Strategy', type: 'page', pageId: 3 },
                  { label: 'Implementation', type: 'page', pageId: 4 },
                ],
              },
            ],
          },
        ],
      })
      expect(config.items![0].children![0].children).toHaveLength(2)
    })

    it('accepts menu items with all optional fields', () => {
      const config = defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          {
            label: 'Home',
            type: 'page',
            pageId: 1,
            icon: 'i-heroicons-home',
            cssClass: 'nav-home',
            visible: true,
            metadata: { custom: 'value' },
          },
        ],
      })
      expect(config.items![0].icon).toBe('i-heroicons-home')
      expect(config.items![0].cssClass).toBe('nav-home')
      expect(config.items![0].visible).toBe(true)
      expect(config.items![0].metadata).toEqual({ custom: 'value' })
    })

    it('accepts valid slug formats', () => {
      const configs = [
        defineMenu({ name: 'test', displayName: 'Test', slug: 'main' }),
        defineMenu({ name: 'test', displayName: 'Test', slug: 'main-nav' }),
        defineMenu({ name: 'test', displayName: 'Test', slug: 'header-menu' }),
        defineMenu({ name: 'test', displayName: 'Test', slug: 'menu123' }),
        defineMenu({ name: 'test', displayName: 'Test', slug: 'footer-nav-2024' }),
      ]
      expect(configs.every(c => c.slug.match(/^[a-z0-9]+(?:-[a-z0-9]+)*$/))).toBe(true)
    })
  })

  describe('validation errors', () => {
    it('throws for missing name', () => {
      expect(() => defineMenu({
        name: '',
        displayName: 'Main Navigation',
        slug: 'main-nav',
      })).toThrow('Menu must have a non-empty name')
    })

    it('throws for whitespace-only name', () => {
      expect(() => defineMenu({
        name: '   ',
        displayName: 'Main Navigation',
        slug: 'main-nav',
      })).toThrow('Menu must have a non-empty name')
    })

    it('throws for missing displayName', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: '',
        slug: 'main-nav',
      })).toThrow("Menu 'main-navigation' must have a non-empty displayName")
    })

    it('throws for missing slug', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: '',
      })).toThrow("Menu 'main-navigation' must have a non-empty slug")
    })

    it('throws for invalid slug with uppercase letters', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'Main-Nav',
      })).toThrow("Menu 'main-navigation' has invalid slug 'Main-Nav'")
    })

    it('throws for invalid slug with spaces', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main nav',
      })).toThrow("Menu 'main-navigation' has invalid slug 'main nav'")
    })

    it('throws for invalid slug with underscores', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main_nav',
      })).toThrow("Menu 'main-navigation' has invalid slug 'main_nav'")
    })

    it('throws for invalid slug starting with hyphen', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: '-main-nav',
      })).toThrow("Menu 'main-navigation' has invalid slug '-main-nav'")
    })

    it('throws for invalid slug ending with hyphen', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav-',
      })).toThrow("Menu 'main-navigation' has invalid slug 'main-nav-'")
    })

    it('throws for invalid slug with consecutive hyphens', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main--nav',
      })).toThrow("Menu 'main-navigation' has invalid slug 'main--nav'")
    })

    it('throws for menu item with missing label', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: '', type: 'page', pageId: 1 } as any,
        ],
      })).toThrow('must have a non-empty label')
    })

    it('throws for menu item with invalid type', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'Home', type: 'invalid' as any },
        ],
      })).toThrow("has invalid type 'invalid'")
    })

    it('throws for page item without pageId', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'Home', type: 'page' } as any,
        ],
      })).toThrow("with type 'page' must have a valid positive pageId")
    })

    it('throws for page item with zero pageId', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'Home', type: 'page', pageId: 0 },
        ],
      })).toThrow("with type 'page' must have a valid positive pageId")
    })

    it('throws for page item with negative pageId', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'Home', type: 'page', pageId: -1 },
        ],
      })).toThrow("with type 'page' must have a valid positive pageId")
    })

    it('throws for external item without url', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'External', type: 'external' } as any,
        ],
      })).toThrow("with type 'external' must have a non-empty url")
    })

    it('throws for external item with empty url', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'External', type: 'external', url: '' },
        ],
      })).toThrow("with type 'external' must have a non-empty url")
    })

    it('throws for menu item with invalid target', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          { label: 'Home', type: 'page', pageId: 1, target: '_new' as any },
        ],
      })).toThrow("has invalid target '_new'")
    })

    it('throws for invalid child menu item', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          {
            label: 'About',
            type: 'page',
            pageId: 1,
            children: [
              { label: '', type: 'page', pageId: 2 } as any,
            ],
          },
        ],
      })).toThrow('must have a non-empty label')
    })

    it('throws for invalid deeply nested menu item', () => {
      expect(() => defineMenu({
        name: 'main-navigation',
        displayName: 'Main Navigation',
        slug: 'main-nav',
        items: [
          {
            label: 'Services',
            type: 'page',
            pageId: 1,
            children: [
              {
                label: 'Consulting',
                type: 'page',
                pageId: 2,
                children: [
                  { label: 'Strategy', type: 'page' } as any,
                ],
              },
            ],
          },
        ],
      })).toThrow("with type 'page' must have a valid positive pageId")
    })
  })
})

describe('type safety', () => {
  it('defineContentType returns the same type as input', () => {
    const input = {
      name: 'article',
      displayName: 'Article',
      pluralName: 'articles',
      fields: {
        title: { type: 'string' as const },
      },
    }
    const result = defineContentType(input)
    // Type assertion to ensure the return type matches
    expect(result.name).toBe(input.name)
    expect(result.fields.title.type).toBe(input.fields.title.type)
  })

  it('defineBlockType returns the same type as input', () => {
    const input = {
      name: 'hero',
      displayName: 'Hero Section',
      fields: {
        headline: { type: 'string' as const, required: true },
      },
    }
    const result = defineBlockType(input)
    expect(result.name).toBe(input.name)
    expect(result.fields.headline.required).toBe(input.fields.headline.required)
  })

  it('definePageType returns the same type as input', () => {
    const input = {
      name: 'landing-page',
      displayName: 'Landing Page',
      areas: {
        main: {
          name: 'main',
          displayName: 'Main Content',
          allowedBlocks: ['hero', 'text'],
        },
      },
    }
    const result = definePageType(input)
    expect(result.name).toBe(input.name)
    expect(result.areas.main.allowedBlocks).toEqual(input.areas.main.allowedBlocks)
  })

  it('defineMenu returns the same type as input', () => {
    const input = {
      name: 'main-navigation',
      displayName: 'Main Navigation',
      slug: 'main-nav',
      description: 'Primary navigation',
      location: 'header' as const,
      items: [
        { label: 'Home', type: 'page' as const, pageId: 1 },
        { label: 'External', type: 'external' as const, url: 'https://example.com' },
      ],
    }
    const result = defineMenu(input)
    expect(result.name).toBe(input.name)
    expect(result.slug).toBe(input.slug)
    expect(result.items).toHaveLength(2)
  })
})
