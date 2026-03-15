<script setup lang="ts">
import { Image, ChevronDown, Code, Copy, Sparkles, Box } from 'lucide-vue-next'

const props = defineProps<{
  block: { blockType: string; data: Record<string, unknown> }
}>()

// Helper to safely get string values
function getString(key: string, fallback = ''): string {
  const value = props.block.data[key]
  return typeof value === 'string' ? value : fallback
}

// Helper to get number values
function getNumber(key: string, fallback = 0): number {
  const value = props.block.data[key]
  return typeof value === 'number' ? value : fallback
}

// Helper to get array values
function getArray<T>(key: string): T[] {
  const value = props.block.data[key]
  return Array.isArray(value) ? value : []
}

// Helper to get boolean values
function getBoolean(key: string, fallback = false): boolean {
  const value = props.block.data[key]
  return typeof value === 'boolean' ? value : fallback
}

// Helper to strip HTML tags for safe display in admin preview
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

// Get heading level for heading block
const headingLevel = computed(() => {
  const raw = getString('level', 'h2')
  const match = raw.match(/^h(\d)$/)
  return match ? Number(match[1]) : 2
})

// Get button variant style
function getButtonVariant(variant: string): string {
  switch (variant) {
    case 'outline': return 'border-2 border-current bg-transparent'
    case 'ghost': return 'bg-transparent'
    default: return 'bg-current text-white'
  }
}
</script>

<template>
  <!-- Hero Block -->
  <div
    v-if="block.blockType === 'hero'"
    class="relative bg-gradient-to-br from-[hsl(var(--foreground))] to-[hsl(var(--foreground))]/80 text-white rounded-lg overflow-hidden"
  >
    <div class="px-8 py-12 text-center">
      <h1
        v-if="getString('headline')"
        class="text-3xl font-bold mb-4"
      >
        {{ getString('headline') }}
      </h1>
      <p
        v-if="getString('subtitle')"
        class="text-lg text-white/70 mb-6 max-w-2xl mx-auto"
      >
        {{ getString('subtitle') }}
      </p>
      <button
        v-if="getString('ctaText')"
        class="px-6 py-3 bg-white text-[hsl(var(--foreground))] font-semibold rounded-lg hover:bg-white/90 transition-colors"
      >
        {{ getString('ctaText') }}
      </button>
    </div>
  </div>

  <!-- Rich Text Block -->
  <div
    v-else-if="block.blockType === 'rich-text'"
    class="prose prose-stone dark:prose-invert max-w-none p-6 bg-[hsl(var(--card))] rounded-lg"
  >
    <div
      v-if="getString('content')"
      class="prose prose-sm dark:prose-invert max-w-none text-[hsl(var(--foreground))] whitespace-pre-wrap"
      v-text="stripHtml(getString('content'))"
    />
    <p v-else class="text-[hsl(var(--muted-foreground))] italic">No content</p>
  </div>

  <!-- Heading Block -->
  <div
    v-else-if="block.blockType === 'heading'"
    class="p-4 bg-[hsl(var(--card))] rounded-lg"
  >
    <component
      :is="`h${headingLevel}`"
      class="font-bold text-[hsl(var(--foreground))]"
      :class="{
        'text-4xl': headingLevel === 1,
        'text-3xl': headingLevel === 2,
        'text-2xl': headingLevel === 3,
        'text-xl': headingLevel === 4,
        'text-lg': headingLevel === 5,
        'text-base': headingLevel === 6,
      }"
    >
      {{ getString('text', 'Heading') }}
    </component>
    <p
      v-if="getString('subtitle')"
      class="text-[hsl(var(--muted-foreground))] mt-2"
    >
      {{ getString('subtitle') }}
    </p>
  </div>

  <!-- Quote Block -->
  <div
    v-else-if="block.blockType === 'quote'"
    class="p-6 bg-[hsl(var(--muted))] rounded-lg border-l-4 border-[hsl(var(--border))]"
  >
    <blockquote class="text-lg italic text-[hsl(var(--foreground))]">
      "{{ getString('text', 'Quote text') }}"
    </blockquote>
    <p
      v-if="getString('attribution')"
      class="text-sm text-[hsl(var(--muted-foreground))] mt-3"
    >
      — {{ getString('attribution') }}
    </p>
  </div>

  <!-- Image Block -->
  <div
    v-else-if="block.blockType === 'image'"
    class="p-4 bg-[hsl(var(--card))] rounded-lg"
  >
    <div class="aspect-video bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center">
      <div class="text-center">
        <Image class="w-10 h-10 text-[hsl(var(--muted-foreground))] mx-auto" />
        <p
          v-if="getString('mediaId') || getString('src')"
          class="text-xs text-[hsl(var(--muted-foreground))] mt-2"
        >
          {{ getString('mediaId') || getString('src') }}
        </p>
      </div>
    </div>
    <p
      v-if="getString('caption')"
      class="text-sm text-[hsl(var(--muted-foreground))] mt-3 text-center"
    >
      {{ getString('caption') }}
    </p>
  </div>

  <!-- Image Gallery Block -->
  <div
    v-else-if="block.blockType === 'image-gallery'"
    class="p-4 bg-[hsl(var(--card))] rounded-lg"
  >
    <div
      class="grid gap-2"
      :class="{
        'grid-cols-2': getNumber('columns', 3) === 2,
        'grid-cols-3': getNumber('columns', 3) === 3,
        'grid-cols-4': getNumber('columns', 3) === 4,
      }"
    >
      <div
        v-for="(item, index) in getArray<unknown>('images').slice(0, 4)"
        :key="index"
        class="aspect-square bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center"
      >
        <Image class="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
      </div>
      <!-- Placeholder slots if no images -->
      <template v-if="getArray('images').length === 0">
        <div
          v-for="i in Math.min(getNumber('columns', 3), 4)"
          :key="`placeholder-${i}`"
          class="aspect-square bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center"
        >
          <Image class="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
        </div>
      </template>
    </div>
  </div>

  <!-- Video Block -->
  <div
    v-else-if="block.blockType === 'video'"
    class="p-4 bg-[hsl(var(--card))] rounded-lg"
  >
    <div class="aspect-video bg-[hsl(var(--foreground))] rounded-lg flex items-center justify-center relative">
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
          <span class="text-2xl text-[hsl(var(--foreground))] ml-1">&#9654;</span>
        </div>
      </div>
      <p
        v-if="getString('url')"
        class="absolute bottom-3 left-3 text-xs text-white/70"
      >
        {{ getString('url') }}
      </p>
    </div>
  </div>

  <!-- Feature Grid Block -->
  <div
    v-else-if="block.blockType === 'feature-grid'"
    class="p-6 bg-[hsl(var(--card))] rounded-lg"
  >
    <div
      class="grid gap-6"
      :class="{
        'grid-cols-1 md:grid-cols-2': getNumber('columns', 3) <= 2,
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': getNumber('columns', 3) === 3,
        'grid-cols-2 md:grid-cols-4': getNumber('columns', 3) >= 4,
      }"
    >
      <div
        v-for="(feature, index) in getArray<{icon?: string; title?: string; description?: string}>('features').slice(0, 4)"
        :key="index"
        class="text-center"
      >
        <div class="w-12 h-12 mx-auto mb-3 rounded-lg bg-[hsl(var(--muted))] flex items-center justify-center">
          <Sparkles class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </div>
        <h4 class="font-semibold text-[hsl(var(--foreground))]">{{ feature.title || 'Feature' }}</h4>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">{{ feature.description }}</p>
      </div>
    </div>
  </div>

  <!-- CTA Block -->
  <div
    v-else-if="block.blockType === 'cta'"
    class="p-8 bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--primary))]/80 text-[hsl(var(--primary-foreground))] rounded-lg text-center"
  >
    <h3
      v-if="getString('headline')"
      class="text-2xl font-bold mb-2"
    >
      {{ getString('headline') }}
    </h3>
    <p
      v-if="getString('description')"
      class="text-[hsl(var(--primary-foreground))]/80 mb-6"
    >
      {{ getString('description') }}
    </p>
    <div class="flex justify-center gap-3">
      <button
        v-if="getString('primaryButtonText')"
        class="px-6 py-2 bg-[hsl(var(--card))] text-[hsl(var(--primary))] font-semibold rounded-lg"
      >
        {{ getString('primaryButtonText') }}
      </button>
      <button
        v-if="getString('secondaryButtonText')"
        class="px-6 py-2 border-2 border-[hsl(var(--primary-foreground))] text-[hsl(var(--primary-foreground))] font-semibold rounded-lg"
      >
        {{ getString('secondaryButtonText') }}
      </button>
    </div>
  </div>

  <!-- Button Group Block -->
  <div
    v-else-if="block.blockType === 'button-group'"
    class="p-4 bg-[hsl(var(--card))] rounded-lg"
  >
    <div class="flex flex-wrap gap-3">
      <template v-if="getArray('buttons').length > 0">
        <button
          v-for="(btn, index) in getArray<{text?: string; variant?: string; url?: string}>('buttons')"
          :key="index"
          class="px-4 py-2 rounded-lg font-medium transition-colors"
          :class="getButtonVariant(btn.variant || 'solid')"
        >
          {{ btn.text || 'Button' }}
        </button>
      </template>
      <template v-else>
        <button class="px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] rounded-lg font-medium">
          Button 1
        </button>
        <button class="px-4 py-2 border-2 border-[hsl(var(--foreground))] rounded-lg font-medium">
          Button 2
        </button>
      </template>
    </div>
  </div>

  <!-- Accordion Block -->
  <div
    v-else-if="block.blockType === 'accordion'"
    class="bg-[hsl(var(--card))] rounded-lg overflow-hidden"
  >
    <div
      v-for="(item, index) in getArray<{title?: string; content?: string}>('items').slice(0, 3)"
      :key="index"
      class="border-b border-[hsl(var(--border))] last:border-b-0"
    >
      <div class="px-4 py-3 flex items-center justify-between">
        <span class="font-medium text-[hsl(var(--foreground))]">{{ item.title || 'Item' }}</span>
        <ChevronDown class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      </div>
    </div>
    <div
      v-if="getArray('items').length === 0"
      class="px-4 py-3 text-[hsl(var(--muted-foreground))] text-sm"
    >
      No accordion items
    </div>
  </div>

  <!-- Card Grid Block -->
  <div
    v-else-if="block.blockType === 'card-grid'"
    class="p-4 bg-[hsl(var(--card))] rounded-lg"
  >
    <div
      class="grid gap-4"
      :class="{
        'grid-cols-1 md:grid-cols-2': getNumber('columns', 3) <= 2,
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3': getNumber('columns', 3) === 3,
        'grid-cols-2 md:grid-cols-4': getNumber('columns', 3) >= 4,
      }"
    >
      <div
        v-for="(card, index) in getArray<{title?: string; description?: string; image?: string}>('cards').slice(0, 3)"
        :key="index"
        class="border border-[hsl(var(--border))] rounded-lg overflow-hidden"
      >
        <div class="aspect-video bg-[hsl(var(--muted))]" />
        <div class="p-4">
          <h4 class="font-semibold text-[hsl(var(--foreground))]">{{ card.title || 'Card' }}</h4>
          <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">{{ card.description }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats Block -->
  <div
    v-else-if="block.blockType === 'stats'"
    class="p-6 bg-[hsl(var(--card))] rounded-lg"
  >
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div
        v-for="(stat, index) in getArray<{value?: string; label?: string}>('stats').slice(0, 4)"
        :key="index"
        class="text-center"
      >
        <div class="text-3xl font-bold text-[hsl(var(--foreground))]">{{ stat.value || '0' }}</div>
        <div class="text-sm text-[hsl(var(--muted-foreground))] mt-1">{{ stat.label || 'Stat' }}</div>
      </div>
    </div>
  </div>

  <!-- Logo Grid Block -->
  <div
    v-else-if="block.blockType === 'logo-grid'"
    class="p-6 bg-[hsl(var(--card))] rounded-lg"
  >
    <p
      v-if="getString('title')"
      class="text-center text-sm font-medium text-[hsl(var(--muted-foreground))] mb-4"
    >
      {{ getString('title') }}
    </p>
    <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
      <div
        v-for="(logo, index) in getArray<unknown>('logos').slice(0, 6)"
        :key="index"
        class="aspect-[2/1] bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center"
      >
        <Box class="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
      </div>
      <template v-if="getArray('logos').length === 0">
        <div
          v-for="i in 6"
          :key="`placeholder-${i}`"
          class="aspect-[2/1] bg-[hsl(var(--muted))] rounded-lg flex items-center justify-center"
        >
          <Box class="w-6 h-6 text-[hsl(var(--muted-foreground))]" />
        </div>
      </template>
    </div>
  </div>

  <!-- Code Block -->
  <div
    v-else-if="block.blockType === 'code'"
    class="bg-[hsl(var(--foreground))] rounded-lg overflow-hidden"
  >
    <div class="px-4 py-2 bg-[hsl(var(--foreground))]/90 text-xs text-[hsl(var(--muted-foreground))] flex items-center justify-between">
      <span>{{ getString('language', 'code') }}</span>
      <Copy class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
    </div>
    <pre class="p-4 text-sm text-[hsl(var(--background))] font-mono overflow-x-auto"><code>{{ getString('code', '// No code provided') }}</code></pre>
  </div>

  <!-- HTML Block -->
  <div
    v-else-if="block.blockType === 'html'"
    class="p-4 bg-[hsl(var(--accent))] border border-[hsl(var(--border))] rounded-lg"
  >
    <div class="flex items-center gap-2 text-[hsl(var(--primary))] mb-2">
      <Code class="w-4 h-4" />
      <span class="text-sm font-medium">Custom HTML</span>
    </div>
    <p class="text-xs text-[hsl(var(--muted-foreground))]">
      Custom HTML content is rendered on the frontend. Preview not available in admin.
    </p>
    <pre
      v-if="getString('html')"
      class="mt-3 p-2 bg-[hsl(var(--muted))] rounded text-xs text-[hsl(var(--foreground))] font-mono overflow-x-auto max-h-24"
    >{{ getString('html').slice(0, 200) }}{{ getString('html').length > 200 ? '...' : '' }}</pre>
  </div>

  <!-- Default Fallback -->
  <div
    v-else
    class="p-4 bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))]"
  >
    <p class="text-sm text-[hsl(var(--muted-foreground))] font-medium">{{ block.blockType }}</p>
    <pre class="text-xs text-[hsl(var(--muted-foreground))] mt-2 p-2 bg-[hsl(var(--background))] rounded overflow-x-auto">{{ JSON.stringify(block.data, null, 2) }}</pre>
  </div>
</template>
