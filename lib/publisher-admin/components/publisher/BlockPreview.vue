<script setup lang="ts">
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
    class="relative bg-gradient-to-br from-stone-800 to-stone-900 text-white rounded-lg overflow-hidden"
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
        class="text-lg text-stone-300 mb-6 max-w-2xl mx-auto"
      >
        {{ getString('subtitle') }}
      </p>
      <button
        v-if="getString('ctaText')"
        class="px-6 py-3 bg-white text-stone-900 font-semibold rounded-lg hover:bg-stone-100 transition-colors"
      >
        {{ getString('ctaText') }}
      </button>
    </div>
  </div>

  <!-- Rich Text Block -->
  <div
    v-else-if="block.blockType === 'rich-text'"
    class="prose prose-stone dark:prose-invert max-w-none p-6 bg-white dark:bg-stone-800 rounded-lg"
  >
    <div
      v-if="getString('content')"
      class="prose prose-sm dark:prose-invert max-w-none text-stone-700 dark:text-stone-300 whitespace-pre-wrap"
      v-text="stripHtml(getString('content'))"
    />
    <p v-else class="text-stone-400 italic">No content</p>
  </div>

  <!-- Heading Block -->
  <div
    v-else-if="block.blockType === 'heading'"
    class="p-4 bg-white dark:bg-stone-800 rounded-lg"
  >
    <component
      :is="`h${headingLevel}`"
      class="font-bold text-stone-900 dark:text-stone-100"
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
      class="text-stone-500 dark:text-stone-400 mt-2"
    >
      {{ getString('subtitle') }}
    </p>
  </div>

  <!-- Quote Block -->
  <div
    v-else-if="block.blockType === 'quote'"
    class="p-6 bg-stone-50 dark:bg-stone-800/50 rounded-lg border-l-4 border-stone-400"
  >
    <blockquote class="text-lg italic text-stone-700 dark:text-stone-300">
      "{{ getString('text', 'Quote text') }}"
    </blockquote>
    <p
      v-if="getString('attribution')"
      class="text-sm text-stone-500 dark:text-stone-400 mt-3"
    >
      — {{ getString('attribution') }}
    </p>
  </div>

  <!-- Image Block -->
  <div
    v-else-if="block.blockType === 'image'"
    class="p-4 bg-white dark:bg-stone-800 rounded-lg"
  >
    <div class="aspect-video bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-heroicons-photo" class="text-4xl text-stone-400 dark:text-stone-500" />
        <p
          v-if="getString('mediaId') || getString('src')"
          class="text-xs text-stone-500 dark:text-stone-400 mt-2"
        >
          {{ getString('mediaId') || getString('src') }}
        </p>
      </div>
    </div>
    <p
      v-if="getString('caption')"
      class="text-sm text-stone-500 dark:text-stone-400 mt-3 text-center"
    >
      {{ getString('caption') }}
    </p>
  </div>

  <!-- Image Gallery Block -->
  <div
    v-else-if="block.blockType === 'image-gallery'"
    class="p-4 bg-white dark:bg-stone-800 rounded-lg"
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
        class="aspect-square bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center"
      >
        <UIcon name="i-heroicons-photo" class="text-2xl text-stone-400 dark:text-stone-500" />
      </div>
      <!-- Placeholder slots if no images -->
      <template v-if="getArray('images').length === 0">
        <div
          v-for="i in Math.min(getNumber('columns', 3), 4)"
          :key="`placeholder-${i}`"
          class="aspect-square bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center"
        >
          <UIcon name="i-heroicons-photo" class="text-2xl text-stone-400 dark:text-stone-500" />
        </div>
      </template>
    </div>
  </div>

  <!-- Video Block -->
  <div
    v-else-if="block.blockType === 'video'"
    class="p-4 bg-white dark:bg-stone-800 rounded-lg"
  >
    <div class="aspect-video bg-stone-900 rounded-lg flex items-center justify-center relative">
      <div class="absolute inset-0 flex items-center justify-center">
        <div class="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
          <UIcon name="i-heroicons-play" class="text-2xl text-stone-900 ml-1" />
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
    class="p-6 bg-white dark:bg-stone-800 rounded-lg"
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
        <div class="w-12 h-12 mx-auto mb-3 rounded-lg bg-stone-100 dark:bg-stone-700 flex items-center justify-center">
          <UIcon :name="feature.icon || 'i-heroicons-sparkles'" class="text-xl text-stone-600 dark:text-stone-400" />
        </div>
        <h4 class="font-semibold text-stone-900 dark:text-stone-100">{{ feature.title || 'Feature' }}</h4>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">{{ feature.description }}</p>
      </div>
    </div>
  </div>

  <!-- CTA Block -->
  <div
    v-else-if="block.blockType === 'cta'"
    class="p-8 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg text-center"
  >
    <h3
      v-if="getString('headline')"
      class="text-2xl font-bold mb-2"
    >
      {{ getString('headline') }}
    </h3>
    <p
      v-if="getString('description')"
      class="text-primary-100 mb-6"
    >
      {{ getString('description') }}
    </p>
    <div class="flex justify-center gap-3">
      <button
        v-if="getString('primaryButtonText')"
        class="px-6 py-2 bg-white text-primary-600 font-semibold rounded-lg"
      >
        {{ getString('primaryButtonText') }}
      </button>
      <button
        v-if="getString('secondaryButtonText')"
        class="px-6 py-2 border-2 border-white text-white font-semibold rounded-lg"
      >
        {{ getString('secondaryButtonText') }}
      </button>
    </div>
  </div>

  <!-- Button Group Block -->
  <div
    v-else-if="block.blockType === 'button-group'"
    class="p-4 bg-white dark:bg-stone-800 rounded-lg"
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
        <button class="px-4 py-2 bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 rounded-lg font-medium">
          Button 1
        </button>
        <button class="px-4 py-2 border-2 border-stone-900 dark:border-stone-100 rounded-lg font-medium">
          Button 2
        </button>
      </template>
    </div>
  </div>

  <!-- Accordion Block -->
  <div
    v-else-if="block.blockType === 'accordion'"
    class="bg-white dark:bg-stone-800 rounded-lg overflow-hidden"
  >
    <div
      v-for="(item, index) in getArray<{title?: string; content?: string}>('items').slice(0, 3)"
      :key="index"
      class="border-b border-stone-200 dark:border-stone-700 last:border-b-0"
    >
      <div class="px-4 py-3 flex items-center justify-between">
        <span class="font-medium text-stone-900 dark:text-stone-100">{{ item.title || 'Item' }}</span>
        <UIcon name="i-heroicons-chevron-down" class="text-stone-400" />
      </div>
    </div>
    <div
      v-if="getArray('items').length === 0"
      class="px-4 py-3 text-stone-500 dark:text-stone-400 text-sm"
    >
      No accordion items
    </div>
  </div>

  <!-- Card Grid Block -->
  <div
    v-else-if="block.blockType === 'card-grid'"
    class="p-4 bg-white dark:bg-stone-800 rounded-lg"
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
        class="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden"
      >
        <div class="aspect-video bg-stone-100 dark:bg-stone-700" />
        <div class="p-4">
          <h4 class="font-semibold text-stone-900 dark:text-stone-100">{{ card.title || 'Card' }}</h4>
          <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">{{ card.description }}</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Stats Block -->
  <div
    v-else-if="block.blockType === 'stats'"
    class="p-6 bg-white dark:bg-stone-800 rounded-lg"
  >
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div
        v-for="(stat, index) in getArray<{value?: string; label?: string}>('stats').slice(0, 4)"
        :key="index"
        class="text-center"
      >
        <div class="text-3xl font-bold text-stone-900 dark:text-stone-100">{{ stat.value || '0' }}</div>
        <div class="text-sm text-stone-500 dark:text-stone-400 mt-1">{{ stat.label || 'Stat' }}</div>
      </div>
    </div>
  </div>

  <!-- Logo Grid Block -->
  <div
    v-else-if="block.blockType === 'logo-grid'"
    class="p-6 bg-white dark:bg-stone-800 rounded-lg"
  >
    <p
      v-if="getString('title')"
      class="text-center text-sm font-medium text-stone-500 dark:text-stone-400 mb-4"
    >
      {{ getString('title') }}
    </p>
    <div class="grid grid-cols-3 md:grid-cols-6 gap-4">
      <div
        v-for="(logo, index) in getArray<unknown>('logos').slice(0, 6)"
        :key="index"
        class="aspect-[2/1] bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center"
      >
        <UIcon name="i-heroicons-building-office-2" class="text-2xl text-stone-400 dark:text-stone-500" />
      </div>
      <template v-if="getArray('logos').length === 0">
        <div
          v-for="i in 6"
          :key="`placeholder-${i}`"
          class="aspect-[2/1] bg-stone-100 dark:bg-stone-700 rounded-lg flex items-center justify-center"
        >
          <UIcon name="i-heroicons-building-office-2" class="text-2xl text-stone-400 dark:text-stone-500" />
        </div>
      </template>
    </div>
  </div>

  <!-- Code Block -->
  <div
    v-else-if="block.blockType === 'code'"
    class="bg-stone-900 rounded-lg overflow-hidden"
  >
    <div class="px-4 py-2 bg-stone-800 text-xs text-stone-400 flex items-center justify-between">
      <span>{{ getString('language', 'code') }}</span>
      <UIcon name="i-heroicons-document-duplicate" class="text-stone-500" />
    </div>
    <pre class="p-4 text-sm text-stone-300 font-mono overflow-x-auto"><code>{{ getString('code', '// No code provided') }}</code></pre>
  </div>

  <!-- HTML Block -->
  <div
    v-else-if="block.blockType === 'html'"
    class="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg"
  >
    <div class="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
      <UIcon name="i-heroicons-code-bracket" />
      <span class="text-sm font-medium">Custom HTML</span>
    </div>
    <p class="text-xs text-amber-500 dark:text-amber-400">
      Custom HTML content is rendered on the frontend. Preview not available in admin.
    </p>
    <pre
      v-if="getString('html')"
      class="mt-3 p-2 bg-amber-100/50 dark:bg-amber-900/30 rounded text-xs text-amber-700 dark:text-amber-300 font-mono overflow-x-auto max-h-24"
    >{{ getString('html').slice(0, 200) }}{{ getString('html').length > 200 ? '...' : '' }}</pre>
  </div>

  <!-- Default Fallback -->
  <div
    v-else
    class="p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700"
  >
    <p class="text-sm text-stone-500 dark:text-stone-400 font-medium">{{ block.blockType }}</p>
    <pre class="text-xs text-stone-400 dark:text-stone-500 mt-2 p-2 bg-stone-100 dark:bg-stone-900 rounded overflow-x-auto">{{ JSON.stringify(block.data, null, 2) }}</pre>
  </div>
</template>
