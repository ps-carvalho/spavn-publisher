<script setup lang="ts">
import type { BlockTypeConfig, PageTypeConfig } from '~~/lib/publisher/types'
import { Input } from '@spavn/ui'
import { Info, ChevronDown, ChevronRight, Box, Search } from 'lucide-vue-next'

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
  <div class="w-60 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-[hsl(var(--border))]">
      <h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">
        Block Library
      </h3>
      <p v-if="selectedArea" class="text-xs text-[hsl(var(--muted-foreground))] mt-1">
        Adding to: {{ pageType?.areas[selectedArea]?.displayName || selectedArea }}
      </p>
    </div>

    <!-- Search -->
    <div class="p-3 border-b border-[hsl(var(--border))]">
      <Input
        v-model="searchQuery"
        placeholder="Search blocks..."
      />
    </div>

    <!-- No area selected message -->
    <div v-if="!selectedArea" class="p-4 m-3 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
      <div class="flex items-start gap-2">
        <Info class="w-4 h-4 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
        <div>
          <p class="text-sm font-medium text-[hsl(var(--foreground))]">
            Select an area
          </p>
          <p class="text-xs text-[hsl(var(--muted-foreground))] mt-1">
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
          class="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-[hsl(var(--accent))] transition-colors"
          @click="toggleCategory(category)"
        >
          <ChevronDown
            v-if="expandedCategories.has(category)"
            class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
          />
          <ChevronRight
            v-else
            class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
          />
          <span class="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
            {{ formatCategoryLabel(category) }}
          </span>
          <span class="text-xs text-[hsl(var(--muted-foreground))] ml-auto">
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
            class="w-full text-left px-3 py-2 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))] hover:bg-[hsl(var(--accent))] hover:border-[hsl(var(--border))] transition-colors group"
            :title="block.description"
            @click="handleBlockClick(block.name)"
          >
            <div class="flex items-center gap-2">
              <Box
                class="w-4 h-4 text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]"
              />
              <span class="text-sm font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--foreground))]">
                {{ block.displayName }}
              </span>
            </div>
            <p
              v-if="block.description"
              class="text-xs text-[hsl(var(--muted-foreground))] mt-1 line-clamp-2"
            >
              {{ block.description }}
            </p>
          </button>
        </div>
      </div>

      <!-- Empty state - no blocks match search -->
      <div v-if="!hasVisibleBlocks && searchQuery" class="text-center py-8">
        <Search class="w-6 h-6 text-[hsl(var(--muted-foreground))] mx-auto mb-2" />
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          No blocks match "{{ searchQuery }}"
        </p>
      </div>

      <!-- Empty state - no block types -->
      <div v-if="!blockTypes.length" class="text-center py-8 text-[hsl(var(--muted-foreground))] text-sm">
        No block types available
      </div>
    </div>
  </div>
</template>
