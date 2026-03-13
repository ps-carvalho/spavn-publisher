/**
 * Core Type Seeds
 *
 * Seeds the database with core content types, block types, and page types
 * on first run. These are stored as JSON config records with is_system: true.
 *
 * All type definitions are inlined here to eliminate file-based type directories.
 */
import { count, eq } from 'drizzle-orm'
import { defineContentType } from '../../lib/publisher/defineContentType'
import { defineBlockType } from '../../lib/publisher/defineBlockType'
import { definePageType } from '../../lib/publisher/definePageType'

import type { ContentTypeConfig } from '../../lib/publisher/types'
import type { BlockTypeConfig } from '../../lib/publisher/types'
import type { PageTypeConfig } from '../../lib/publisher/types'

// ═══════════════════════════════════════════════════════════════════════════
// CONTENT TYPES (6 types)
// ═══════════════════════════════════════════════════════════════════════════

const coreContentTypes: ContentTypeConfig[] = [
  // ─── Article ─────────────────────────────────────────────────────────────
  defineContentType({
    name: 'article',
    displayName: 'Article',
    pluralName: 'articles',
    icon: 'i-heroicons-document-text',
    description: 'Blog posts and articles',
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: true,
    },
    fields: {
      title: { type: 'string', required: true, maxLength: 255, label: 'Title' },
      slug: { type: 'uid', targetField: 'title', label: 'Slug' },
      body: { type: 'richtext', label: 'Body' },
      excerpt: { type: 'text', label: 'Excerpt', hint: 'A short summary of the article' },
    },
  }),

  // ─── Author ──────────────────────────────────────────────────────────────
  defineContentType({
    name: 'author',
    displayName: 'Author',
    pluralName: 'authors',
    icon: 'i-heroicons-user',
    description: 'Content authors and contributors',
    options: {
      timestamps: true,
    },
    fields: {
      name: { type: 'string', required: true, label: 'Name' },
      email: { type: 'email', unique: true, label: 'Email' },
      bio: { type: 'text', label: 'Bio', hint: 'Short biography' },
    },
  }),

  // ─── Category ────────────────────────────────────────────────────────────
  defineContentType({
    name: 'category',
    displayName: 'Category',
    pluralName: 'categories',
    icon: 'i-heroicons-folder',
    description: 'Organize content into categories',
    options: {
      timestamps: true,
    },
    fields: {
      name: { type: 'string', required: true, maxLength: 100, label: 'Name' },
      slug: { type: 'uid', targetField: 'name', label: 'Slug' },
      description: { type: 'text', label: 'Description', hint: 'Brief description of this category' },
      color: { type: 'string', maxLength: 7, label: 'Color', hint: 'Hex color code, e.g. #3B82F6' },
    },
  }),

  // ─── Tag ─────────────────────────────────────────────────────────────────
  defineContentType({
    name: 'tag',
    displayName: 'Tag',
    pluralName: 'tags',
    icon: 'i-heroicons-tag',
    description: 'Tags for labelling and filtering content',
    options: {
      timestamps: true,
    },
    fields: {
      name: { type: 'string', required: true, maxLength: 50, label: 'Name' },
      slug: { type: 'uid', targetField: 'name', label: 'Slug' },
    },
  }),

  // ─── FAQ ─────────────────────────────────────────────────────────────────
  defineContentType({
    name: 'faq',
    displayName: 'FAQ',
    pluralName: 'faqs',
    icon: 'i-heroicons-question-mark-circle',
    description: 'Frequently asked questions',
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: true,
    },
    fields: {
      question: { type: 'string', required: true, maxLength: 500, label: 'Question' },
      answer: { type: 'richtext', required: true, label: 'Answer' },
      sortOrder: { type: 'number', label: 'Sort Order', hint: 'Lower numbers appear first', default: 0 },
    },
  }),

  // ─── Testimonial ─────────────────────────────────────────────────────────
  defineContentType({
    name: 'testimonial',
    displayName: 'Testimonial',
    pluralName: 'testimonials',
    icon: 'i-heroicons-chat-bubble-bottom-center-text',
    description: 'Customer testimonials and reviews',
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: true,
    },
    fields: {
      quote: { type: 'text', required: true, label: 'Quote' },
      authorName: { type: 'string', required: true, maxLength: 100, label: 'Author Name' },
      authorTitle: { type: 'string', maxLength: 150, label: 'Author Title', hint: 'e.g. CEO at Acme Inc.' },
      rating: { type: 'number', min: 1, max: 5, label: 'Rating', hint: '1-5 stars' },
      featured: { type: 'boolean', default: false, label: 'Featured', hint: 'Show in featured section' },
    },
  }),
]

// ═══════════════════════════════════════════════════════════════════════════
// BLOCK TYPES (16 types)
// ═══════════════════════════════════════════════════════════════════════════

const coreBlockTypes: BlockTypeConfig[] = [
  // ─── Accordion ───────────────────────────────────────────────────────────
  defineBlockType({
    name: 'accordion',
    displayName: 'Accordion',
    icon: 'i-heroicons-chevron-down',
    category: 'layout',
    description: 'Expandable accordion sections with optional heading',
    fields: {
      heading: { type: 'string', label: 'Section Heading' },
      items: {
        type: 'json',
        required: true,
        label: 'Accordion Items',
        hint: 'Array of objects with title and content',
      },
    },
  }),

  // ─── Button Group ────────────────────────────────────────────────────────
  defineBlockType({
    name: 'button-group',
    displayName: 'Button Group',
    icon: 'i-heroicons-cursor-arrow-ripple',
    category: 'cta',
    description: 'Group of buttons with customizable styles and alignment',
    fields: {
      buttons: {
        type: 'json',
        required: true,
        label: 'Buttons',
        hint: 'Array of objects with text, url, variant, and icon',
      },
      alignment: {
        type: 'enum',
        options: ['left', 'center', 'right'],
        default: 'left',
        label: 'Alignment',
      },
    },
  }),

  // ─── Card Grid ───────────────────────────────────────────────────────────
  defineBlockType({
    name: 'card-grid',
    displayName: 'Card Grid',
    icon: 'i-heroicons-rectangle-group',
    category: 'data',
    description: 'Grid of cards with images, titles, text, and optional links',
    fields: {
      cards: {
        type: 'json',
        required: true,
        label: 'Cards',
        hint: 'Array of objects with image, title, text, and url',
      },
      columns: {
        type: 'enum',
        options: ['2', '3', '4'],
        default: '3',
        label: 'Columns',
      },
    },
  }),

  // ─── Code Block ──────────────────────────────────────────────────────────
  defineBlockType({
    name: 'code',
    displayName: 'Code Block',
    icon: 'i-heroicons-code-bracket',
    category: 'embed',
    description: 'Syntax-highlighted code block with language selection',
    fields: {
      code: { type: 'text', required: true, label: 'Code' },
      language: {
        type: 'enum',
        options: ['js', 'ts', 'html', 'css', 'python', 'bash', 'json', 'other'],
        default: 'js',
        label: 'Language',
      },
      filename: { type: 'string', label: 'Filename', hint: 'Optional filename displayed above code block' },
      showLineNumbers: { type: 'boolean', default: true, label: 'Show Line Numbers' },
    },
  }),

  // ─── Call to Action ──────────────────────────────────────────────────────
  defineBlockType({
    name: 'cta',
    displayName: 'Call to Action',
    icon: 'i-heroicons-megaphone',
    category: 'cta',
    description: 'Call-to-action section with heading, text, and primary/secondary buttons',
    fields: {
      heading: { type: 'string', required: true, label: 'Heading' },
      text: { type: 'text', label: 'Description' },
      primaryButtonText: { type: 'string', label: 'Primary Button Text' },
      primaryButtonUrl: { type: 'string', label: 'Primary Button URL' },
      secondaryButtonText: { type: 'string', label: 'Secondary Button Text' },
      secondaryButtonUrl: { type: 'string', label: 'Secondary Button URL' },
      variant: {
        type: 'enum',
        options: ['default', 'highlight', 'minimal'],
        default: 'default',
        label: 'Style Variant',
      },
    },
  }),

  // ─── Feature Grid ────────────────────────────────────────────────────────
  defineBlockType({
    name: 'feature-grid',
    displayName: 'Feature Grid',
    icon: 'i-heroicons-squares-plus',
    category: 'hero',
    description: 'Grid of feature items with icons, titles, and descriptions',
    fields: {
      heading: { type: 'string', label: 'Section Heading' },
      features: {
        type: 'json',
        required: true,
        label: 'Features',
        hint: 'Array of objects with icon, title, and description',
      },
      columns: {
        type: 'enum',
        options: ['2', '3', '4'],
        default: '3',
        label: 'Columns',
      },
    },
  }),

  // ─── Heading ─────────────────────────────────────────────────────────────
  defineBlockType({
    name: 'heading',
    displayName: 'Heading',
    icon: 'i-heroicons-bars-3-bottom-left',
    category: 'text',
    description: 'Section heading with configurable level and optional subtitle',
    fields: {
      text: { type: 'string', required: true, label: 'Heading Text' },
      level: {
        type: 'enum',
        options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        default: 'h2',
        label: 'Heading Level',
      },
      subtitle: { type: 'string', label: 'Subtitle' },
    },
  }),

  // ─── Hero Banner ─────────────────────────────────────────────────────────
  defineBlockType({
    name: 'hero',
    displayName: 'Hero Banner',
    icon: 'i-heroicons-star',
    category: 'hero',
    description: 'Full-width hero banner with headline, subtitle, and CTA',
    fields: {
      headline: { type: 'string', required: true, label: 'Headline' },
      subtitle: { type: 'string', label: 'Subtitle' },
      backgroundImage: { type: 'media', label: 'Background Image' },
      ctaText: { type: 'string', label: 'CTA Button Text' },
      ctaUrl: { type: 'string', label: 'CTA Button URL' },
      ctaVariant: {
        type: 'enum',
        options: ['solid', 'outline'],
        default: 'solid',
        label: 'CTA Button Style',
      },
      alignment: {
        type: 'enum',
        options: ['left', 'center', 'right'],
        default: 'center',
        label: 'Text Alignment',
      },
      overlay: { type: 'boolean', default: true, label: 'Dark Overlay', hint: 'Improves text readability on background images' },
    },
  }),

  // ─── HTML Embed ──────────────────────────────────────────────────────────
  defineBlockType({
    name: 'html',
    displayName: 'HTML Embed',
    icon: 'i-heroicons-code-bracket-square',
    category: 'embed',
    description: 'Custom HTML embed with optional sandboxing for security',
    fields: {
      html: { type: 'text', required: true, label: 'HTML Code' },
      sandboxed: { type: 'boolean', default: true, label: 'Sandboxed', hint: 'Enables security sandbox to restrict scripts and forms' },
    },
  }),

  // ─── Image ───────────────────────────────────────────────────────────────
  defineBlockType({
    name: 'image',
    displayName: 'Image',
    icon: 'i-heroicons-photo',
    category: 'media',
    description: 'Single image with optional caption, alt text, and size control',
    fields: {
      media: { type: 'media', required: true, label: 'Image' },
      caption: { type: 'string', label: 'Caption' },
      altText: { type: 'string', label: 'Alt Text', hint: 'Accessibility description for screen readers' },
      size: {
        type: 'enum',
        options: ['full', 'medium', 'small'],
        default: 'full',
        label: 'Size',
      },
    },
  }),

  // ─── Image Gallery ───────────────────────────────────────────────────────
  defineBlockType({
    name: 'image-gallery',
    displayName: 'Image Gallery',
    icon: 'i-heroicons-squares-2x2',
    category: 'media',
    description: 'Grid gallery of multiple images with customizable layout',
    fields: {
      images: {
        type: 'media',
        required: true,
        multiple: true,
        allowFolderSelection: true,
        allowedTypes: ['image/*'],
        maxSelection: 50,
        label: 'Images',
        hint: 'Select individual images or choose an entire folder',
      },
      columns: {
        type: 'enum',
        options: ['2', '3', '4'],
        default: '3',
        label: 'Columns',
      },
      gap: {
        type: 'enum',
        options: ['sm', 'md', 'lg'],
        default: 'md',
        label: 'Gap Size',
      },
    },
  }),

  // ─── Logo Grid ───────────────────────────────────────────────────────────
  defineBlockType({
    name: 'logo-grid',
    displayName: 'Logo Grid',
    icon: 'i-heroicons-building-office-2',
    category: 'data',
    description: 'Grid of logos with grayscale option',
    fields: {
      logos: {
        type: 'json',
        required: true,
        label: 'Logos',
        hint: 'Array of media IDs for logo images',
      },
      columns: {
        type: 'enum',
        options: ['4', '5', '6'],
        default: '4',
        label: 'Columns',
      },
      grayscale: { type: 'boolean', default: true, label: 'Grayscale', hint: 'Display logos in grayscale for consistency' },
    },
  }),

  // ─── Quote ───────────────────────────────────────────────────────────────
  defineBlockType({
    name: 'quote',
    displayName: 'Quote',
    icon: 'i-heroicons-chat-bubble-bottom-center-text',
    category: 'text',
    description: 'Blockquote with optional attribution and role',
    fields: {
      text: { type: 'text', required: true, label: 'Quote Text' },
      attribution: { type: 'string', label: 'Attribution' },
      role: { type: 'string', label: 'Role/Title' },
    },
  }),

  // ─── Rich Text ───────────────────────────────────────────────────────────
  defineBlockType({
    name: 'rich-text',
    displayName: 'Rich Text',
    icon: 'i-heroicons-document-text',
    category: 'text',
    description: 'Formatted text content with full rich text editing',
    fields: {
      content: { type: 'richtext', label: 'Content' },
    },
  }),

  // ─── Statistics ──────────────────────────────────────────────────────────
  defineBlockType({
    name: 'stats',
    displayName: 'Statistics',
    icon: 'i-heroicons-chart-bar',
    category: 'data',
    description: 'Display statistics with values, labels, and optional prefixes/suffixes',
    fields: {
      stats: {
        type: 'json',
        required: true,
        label: 'Statistics',
        hint: 'Array of objects with value, label, prefix, and suffix',
      },
      columns: {
        type: 'enum',
        options: ['2', '3', '4'],
        default: '3',
        label: 'Columns',
      },
    },
  }),

  // ─── Video ───────────────────────────────────────────────────────────────
  defineBlockType({
    name: 'video',
    displayName: 'Video',
    icon: 'i-heroicons-video-camera',
    category: 'media',
    description: 'Embedded video with optional poster image and autoplay settings',
    fields: {
      url: { type: 'string', required: true, label: 'Video URL' },
      caption: { type: 'string', label: 'Caption' },
      autoplay: { type: 'boolean', default: false, label: 'Autoplay' },
      poster: { type: 'media', label: 'Poster Image', hint: 'Thumbnail shown before video plays' },
    },
  }),
]

// ═══════════════════════════════════════════════════════════════════════════
// PAGE TYPES (3 types)
// ═══════════════════════════════════════════════════════════════════════════

const corePageTypes: PageTypeConfig[] = [
  // ─── Blog Page ───────────────────────────────────────────────────────────
  definePageType({
    name: 'blog-page',
    displayName: 'Blog Post Page',
    icon: 'i-heroicons-pencil-square',
    description: 'A blog post layout with header, body content, and sidebar',
    areas: {
      header: {
        name: 'header',
        displayName: 'Header Area',
        allowedBlocks: ['hero', 'image'],
        maxBlocks: 1,
      },
      body: {
        name: 'body',
        displayName: 'Body Content',
        allowedBlocks: [
          'rich-text',
          'heading',
          'image',
          'image-gallery',
          'video',
          'code',
          'quote',
          'accordion',
        ],
      },
      sidebar: {
        name: 'sidebar',
        displayName: 'Sidebar',
        allowedBlocks: ['cta', 'card-grid', 'button-group'],
        maxBlocks: 3,
      },
    },
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: true,
      seo: true,
    },
  }),

  // ─── Landing Page ────────────────────────────────────────────────────────
  definePageType({
    name: 'landing-page',
    displayName: 'Landing Page',
    icon: 'i-heroicons-home',
    description: 'A versatile landing page with hero, content, and call-to-action areas',
    areas: {
      hero: {
        name: 'hero',
        displayName: 'Hero Area',
        allowedBlocks: ['hero', 'image', 'video'],
        maxBlocks: 1,
      },
      content: {
        name: 'content',
        displayName: 'Content Area',
        allowedBlocks: [
          'rich-text',
          'heading',
          'feature-grid',
          'cta',
          'image',
          'image-gallery',
          'quote',
          'stats',
          'card-grid',
          'accordion',
        ],
      },
      cta: {
        name: 'cta',
        displayName: 'Call to Action',
        allowedBlocks: ['cta', 'button-group'],
        maxBlocks: 1,
      },
    },
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: true,
      seo: true,
    },
  }),

  // ─── Marketing Page ──────────────────────────────────────────────────────
  definePageType({
    name: 'marketing-page',
    displayName: 'Marketing Page',
    icon: 'i-heroicons-rocket-launch',
    description: 'A marketing page with hero, features, content, and footer CTA',
    areas: {
      hero: {
        name: 'hero',
        displayName: 'Hero Area',
        allowedBlocks: ['hero'],
        maxBlocks: 1,
      },
      features: {
        name: 'features',
        displayName: 'Features Area',
        allowedBlocks: [
          'feature-grid',
          'stats',
          'card-grid',
          'image-gallery',
          'logo-grid',
        ],
      },
      content: {
        name: 'content',
        displayName: 'Content Area',
        allowedBlocks: [
          'rich-text',
          'heading',
          'image',
          'quote',
          'cta',
          'accordion',
        ],
      },
      'footer-cta': {
        name: 'footer-cta',
        displayName: 'Footer CTA',
        allowedBlocks: ['cta'],
        maxBlocks: 1,
      },
    },
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: true,
      seo: true,
    },
  }),
]

// ═══════════════════════════════════════════════════════════════════════════
// SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seeds core types into the database if not already present.
 *
 * This function checks if the content type definitions table is empty,
 * and if so, inserts all core content types, block types, and page types
 * as system records (isSystem: true, active: true).
 *
 * @param db - The Drizzle database instance
 * @param schema - The loaded schema object with table definitions
 */
export async function seedCoreTypes(db: any, schema: any): Promise<void> {
  // Check if already seeded (check content types table)
  const [contentCount] = await db.select({ value: count() }).from(schema.publisherContentTypeDefs)
  if (contentCount.value > 0) {
    console.log('[Publisher] Core types already seeded, skipping.')
    return
  }

  console.log('[Publisher] Seeding core types...')

  // Seed content types
  for (const ct of coreContentTypes as ContentTypeConfig[]) {
    await db.insert(schema.publisherContentTypeDefs).values({
      name: ct.name,
      displayName: ct.displayName,
      pluralName: ct.pluralName,
      icon: ct.icon || null,
      description: ct.description || null,
      config: ct as unknown as Record<string, unknown>,
      isSystem: true,
      active: true,
    })
  }
  console.log(`[Publisher] Seeded ${coreContentTypes.length} core content types`)

  // Seed block types
  for (const bt of coreBlockTypes as BlockTypeConfig[]) {
    await db.insert(schema.publisherBlockTypeDefs).values({
      name: bt.name,
      displayName: bt.displayName,
      category: bt.category || null,
      icon: bt.icon || null,
      description: bt.description || null,
      config: bt as unknown as Record<string, unknown>,
      isSystem: true,
      active: true,
    })
  }
  console.log(`[Publisher] Seeded ${coreBlockTypes.length} core block types`)

  // Seed page types
  for (const pt of corePageTypes as PageTypeConfig[]) {
    await db.insert(schema.publisherPageTypeDefs).values({
      name: pt.name,
      displayName: pt.displayName,
      icon: pt.icon || null,
      description: pt.description || null,
      config: pt as unknown as Record<string, unknown>,
      isSystem: true,
      active: true,
    })
  }
  console.log(`[Publisher] Seeded ${corePageTypes.length} core page types`)
}

// ═══════════════════════════════════════════════════════════════════════════
// MENU SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seeds a default "Main Navigation" menu with sample items.
 *
 * This function creates a hierarchical menu structure demonstrating:
 * - Top-level items (Home, Products, About, Contact)
 * - Nested sub-menus (Products → Features, Pricing)
 * - Different link types (page, external, label)
 *
 * The seed is idempotent - it checks if the menu already exists before creating.
 *
 * @param db - The Drizzle database instance
 * @param schema - The loaded schema object with table definitions
 */
export async function seedMenus(db: any, schema: any): Promise<void> {
  // Check if menu already exists
  const [existingMenu] = await db
    .select()
    .from(schema.publisherMenus)
    .where(eq(schema.publisherMenus.slug, 'main-nav'))

  if (existingMenu) {
    console.log('[Publisher] Main Navigation menu already seeded, skipping.')
    return
  }

  console.log('[Publisher] Seeding Main Navigation menu...')

  // Get existing pages for linking
  const pages = await db.select().from(schema.publisherPages)
  const pageMap: Map<string, number> = new Map(pages.map((p: any) => [p.slug, p.id]))

  // Helper to get page ID by slug, returns null if not found
  const getPageId = (slug: string): number | null => {
    const id = pageMap.get(slug)
    return id !== undefined ? id : null
  }

  // Create the menu
  const [menu] = await db
    .insert(schema.publisherMenus)
    .values({
      name: 'Main Navigation',
      slug: 'main-nav',
      description: 'Primary site navigation displayed in the header',
      location: 'header',
    })
    .returning()

  // Helper type for menu item data
  type MenuItemSeed = {
    label: string
    type: string
    sortOrder: number
    metadata: Record<string, any>
    visible: boolean
    url?: string
    target?: string
    children?: MenuItemSeed[]
  }

  // Define menu items with their children
  const menuItemsData: MenuItemSeed[] = [
    {
      label: 'Home',
      type: 'page',
      sortOrder: 0,
      metadata: { pageId: getPageId('home') },
      visible: true,
      children: [],
    },
    {
      label: 'Products',
      type: 'label',
      sortOrder: 1,
      metadata: {},
      visible: true,
      children: [
        {
          label: 'Features',
          type: 'page',
          sortOrder: 0,
          metadata: { pageId: getPageId('features') },
          visible: true,
        },
        {
          label: 'Pricing',
          type: 'page',
          sortOrder: 1,
          metadata: { pageId: getPageId('pricing') },
          visible: true,
        },
      ],
    },
    {
      label: 'About',
      type: 'page',
      sortOrder: 2,
      metadata: { pageId: getPageId('about') },
      visible: true,
      children: [],
    },
    {
      label: 'Contact',
      type: 'external',
      sortOrder: 3,
      url: 'https://support.example.com',
      target: '_blank',
      metadata: {},
      visible: true,
      children: [],
    },
  ]

  // Insert parent items first, then their children
  let totalItems = 0
  for (const itemData of menuItemsData) {
    const { children, ...parentData } = itemData

    // Insert parent item
    const [parentItem] = await db
      .insert(schema.publisherMenuItems)
      .values({
        menuId: menu.id,
        parentId: null,
        sortOrder: parentData.sortOrder,
        label: parentData.label,
        type: parentData.type,
        url: parentData.url ?? null,
        target: parentData.target ?? null,
        visible: parentData.visible,
        metadata: parentData.metadata,
      })
      .returning()

    totalItems++

    // Insert children if any
    if (children && children.length > 0) {
      for (const childData of children) {
        await db.insert(schema.publisherMenuItems).values({
          menuId: menu.id,
          parentId: parentItem.id,
          sortOrder: childData.sortOrder,
          label: childData.label,
          type: childData.type,
          url: childData.url ?? null,
          target: childData.target ?? null,
          visible: childData.visible,
          metadata: childData.metadata,
        })
        totalItems++
      }
    }
  }

  console.log(`[Publisher] Seeded Main Navigation menu with ${totalItems} items`)
}
