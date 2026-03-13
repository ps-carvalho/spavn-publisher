<script setup lang="ts">
import type { BlockTypeConfig, PageTypeConfig } from '~~/lib/publisher/types'

const props = defineProps<{
  blockTypes: BlockTypeConfig[]
  pageType: PageTypeConfig | null
  selectedArea: string | null
}>()

const emit = defineEmits<{
  'add-block': [blockTypeName: string]
}>()

// Search filter
const searchQuery = ref('')

// Track which categories are expanded
const expandedCategories = ref<Set<string>>(new Set())

// Category display order
const categoryOrder = ['text', 'media', 'hero', 'cta', 'layout', 'data', 'embed']

// Get allowed block type names for the selected area
const allowedBlockTypeNames = computed(() => {
  if (!props.selectedArea || !props.pageType) return null
  const area = props.pageType.areas[props.selectedArea]
  return area?.allowedBlocks ?? null
})

// Filter block types by search query
const filteredBlockTypes = computed(() => {
  const query = searchQuery.value.toLowerCase().trim()
  if (!query) return props.blockTypes
  return props.blockTypes.filter(bt =>
    bt.displayName.toLowerCase().includes(query) ||
    bt.name.toLowerCase().includes(query) ||
    bt.description?.toLowerCase().includes(query)
  )
})

// Check if a block type is allowed in the selected area
function isBlockAllowed(blockTypeName: string): boolean {
  if (!allowedBlockTypeNames.value) return true // No area selected, all allowed
  return allowedBlockTypeNames.value.includes(blockTypeName)
}

// Group filtered block types by category, respecting allowed blocks
const groupedBlocks = computed(() => {
  const grouped: Record<string, BlockTypeConfig[]> = {}

  for (const bt of filteredBlockTypes.value) {
    // Skip blocks not allowed in selected area
    if (!isBlockAllowed(bt.name)) continue

    const category = bt.category || 'General'
    if (!grouped[category]) grouped[category] = []
    grouped[category].push(bt)
  }

  // Sort categories by predefined order
  const sortedCategories: Record<string, BlockTypeConfig[]> = {}

  // First add categories in the predefined order
  for (const cat of categoryOrder) {
    if (grouped[cat]) {
      sortedCategories[cat] = grouped[cat]
    }
  }

  // Then add any remaining categories (like 'General' or custom ones)
  for (const [cat, blocks] of Object.entries(grouped)) {
    if (!sortedCategories[cat]) {
      sortedCategories[cat] = blocks
    }
  }

  return sortedCategories
})

// Initialize all categories as expanded
watch(
  () => groupedBlocks.value,
  (groups) => {
    for (const cat of Object.keys(groups)) {
      if (!expandedCategories.value.has(cat)) {
        expandedCategories.value.add(cat)
      }
    }
  },
  { immediate: true }
)

// Toggle category expansion
function toggleCategory(category: string) {
  if (expandedCategories.value.has(category)) {
    expandedCategories.value.delete(category)
  } else {
    expandedCategories.value.add(category)
  }
}

// Handle block click
function handleBlockClick(blockTypeName: string) {
  if (!props.selectedArea) return
  emit('add-block', blockTypeName)
}

// Format category label for display
function formatCategoryLabel(category: string): string {
  return category.toUpperCase()
}

// Check if there are any visible blocks
const hasVisibleBlocks = computed(() => {
  return Object.values(groupedBlocks.value).some(blocks => blocks.length > 0)
})
</script>

<template>
  <div class="w-60 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-stone-200 dark:border-stone-800">
      <h3 class="text-sm font-semibold text-stone-900 dark:text-stone-100">
        Block Library
      </h3>
      <p v-if="selectedArea" class="text-xs text-stone-500 dark:text-stone-400 mt-1">
        Adding to: {{ pageType?.areas[selectedArea]?.displayName || selectedArea }}
      </p>
    </div>

    <!-- Search -->
    <div class="p-3 border-b border-stone-200 dark:border-stone-800">
      <UInput
        v-model="searchQuery"
        placeholder="Search blocks..."
        icon="i-heroicons-magnifying-glass"
        size="sm"
      />
    </div>

    <!-- No area selected message -->
    <div v-if="!selectedArea" class="p-4 m-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <div class="flex items-start gap-2">
        <UIcon name="i-heroicons-information-circle" class="text-amber-500 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p class="text-sm font-medium text-amber-800 dark:text-amber-200">
            Select an area
          </p>
          <p class="text-xs text-amber-600 dark:text-amber-300 mt-1">
            Click an area in the canvas to add blocks
          </p>
        </div>
      </div>
    </div>

    <!-- Block list -->
    <div class="flex-1 overflow-auto p-3 space-y-3">
      <!-- Categories -->
      <div
        v-for="(blocks, category) in groupedBlocks"
        :key="category"
        class="space-y-1"
      >
        <!-- Category header -->
        <button
          type="button"
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          @click="toggleCategory(category)"
        >
          <UIcon
            :name="expandedCategories.has(category) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
            class="text-stone-400 dark:text-stone-500 text-sm"
          />
          <span class="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
            {{ formatCategoryLabel(category) }}
          </span>
          <span class="text-xs text-stone-400 dark:text-stone-500 ml-auto">
            {{ blocks.length }}
          </span>
        </button>

        <!-- Category blocks -->
        <div
          v-show="expandedCategories.has(category)"
          class="space-y-1 pl-5"
        >
          <button
            v-for="block in blocks"
            :key="block.name"
            type="button"
            class="w-full text-left px-3 py-2 rounded-md border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50 hover:bg-stone-100 dark:hover:bg-stone-700 hover:border-stone-300 dark:hover:border-stone-600 transition-colors group"
            :title="block.description"
            @click="handleBlockClick(block.name)"
          >
            <div class="flex items-center gap-2">
              <UIcon
                v-if="block.icon"
                :name="block.icon"
                class="text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300"
              />
              <UIcon
                v-else
                name="i-heroicons-cube"
                class="text-stone-400 dark:text-stone-500 group-hover:text-stone-600 dark:group-hover:text-stone-300"
              />
              <span class="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100">
                {{ block.displayName }}
              </span>
            </div>
            <p
              v-if="block.description"
              class="text-xs text-stone-400 dark:text-stone-500 mt-1 line-clamp-2"
            >
              {{ block.description }}
            </p>
          </button>
        </div>
      </div>

      <!-- Empty state - no blocks match search -->
      <div v-if="!hasVisibleBlocks && searchQuery" class="text-center py-8">
        <UIcon name="i-heroicons-magnifying-glass" class="text-2xl text-stone-300 dark:text-stone-600 mb-2" />
        <p class="text-sm text-stone-400 dark:text-stone-500">
          No blocks match "{{ searchQuery }}"
        </p>
      </div>

      <!-- Empty state - no block types -->
      <div v-if="!blockTypes.length" class="text-center py-8 text-stone-400 dark:text-stone-500 text-sm">
        No block types available
      </div>
    </div>
  </div>
</template>
