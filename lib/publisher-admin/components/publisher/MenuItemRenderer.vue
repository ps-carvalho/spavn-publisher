<script setup lang="ts">
import type { MenuItemType } from '~/lib/publisher/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id: number
  label: string
  type: MenuItemType
  url?: string | null
  pageId?: number | null
  target?: '_blank' | '_self' | null
  icon?: string | null
  cssClass?: string | null
  visible?: boolean
  metadata?: Record<string, unknown> | null
  parentId?: number | null
  sortOrder?: number
  children?: MenuItem[]
}

// ─── Props & Emits ─────────────────────────────────────────────────────────────

interface Props {
  item: MenuItem
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  depth: 0,
})

const emit = defineEmits<{
  edit: [item: MenuItem]
  delete: [item: MenuItem]
  'add-child': [item: MenuItem]
  reorder: [payload: { itemId: number; parentId: number | null; sortOrder: number }]
}>()

// ─── State ─────────────────────────────────────────────────────────────────────

const isExpanded = ref(true)

// ─── Computed ──────────────────────────────────────────────────────────────────

const hasChildren = computed(() =>
  props.item.children && props.item.children.length > 0,
)

const children = computed(() =>
  props.item.children || [],
)

const typeIcon = computed(() => {
  switch (props.item.type) {
    case 'page': return 'i-heroicons-document'
    case 'external': return 'i-heroicons-arrow-top-right-on-square'
    case 'label': return 'i-heroicons-tag'
    default: return 'i-heroicons-link'
  }
})

const typeColor = computed(() => {
  switch (props.item.type) {
    case 'page': return 'primary'
    case 'external': return 'success'
    case 'label': return 'neutral'
    default: return 'neutral'
  }
})

const indentStyle = computed(() => ({
  marginLeft: `${props.depth * 2}rem`,
}))

// ─── Methods ───────────────────────────────────────────────────────────────────

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function handleEdit() {
  emit('edit', props.item)
}

function handleDelete() {
  emit('delete', props.item)
}

function handleAddChild() {
  emit('add-child', props.item)
}

// Pass through events for children
function handleChildEdit(item: MenuItem) {
  emit('edit', item)
}

function handleChildDelete(item: MenuItem) {
  emit('delete', item)
}

function handleChildAddChild(item: MenuItem) {
  emit('add-child', item)
}

function handleChildReorder(payload: { itemId: number; parentId: number | null; sortOrder: number }) {
  emit('reorder', payload)
}
</script>

<template>
  <!-- Wrapper - children are siblings of the item, not nested inside -->
  <div class="menu-item-wrapper">
    <!-- Item Row - this is the draggable element -->
    <div
      class="menu-item flex items-center gap-2 p-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-lg transition-colors group"
      :class="{ 'has-children': hasChildren }"
      :style="indentStyle"
    >
      <!-- Drag Handle - only on root items for now -->
      <div
        v-if="depth === 0"
        class="drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        <UIcon name="i-heroicons-bars-3" class="w-4 h-4" />
      </div>
      <!-- Spacer for nested items -->
      <div v-else class="w-5" />

      <!-- Expand/Collapse Button -->
      <button
        v-if="hasChildren"
        class="p-0.5 rounded hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
        @click="toggleExpand"
      >
        <UIcon
          :name="isExpanded ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
          class="w-4 h-4 text-stone-500 dark:text-stone-400"
        />
      </button>
      <div v-else class="w-5" />

      <!-- Type Badge -->
      <UBadge :color="typeColor" size="xs" variant="subtle">
        <UIcon :name="typeIcon" class="mr-1 w-3 h-3" />
        {{ item.type }}
      </UBadge>

      <!-- Label -->
      <span class="flex-1 font-medium text-stone-700 dark:text-stone-300 truncate">
        {{ item.label }}
      </span>

      <!-- URL Preview -->
      <span
        v-if="item.url"
        class="text-sm text-stone-500 dark:text-stone-400 truncate max-w-xs hidden sm:block"
      >
        {{ item.url }}
      </span>

      <!-- Visibility Indicator -->
      <UIcon
        v-if="!item.visible"
        name="i-heroicons-eye-slash"
        class="w-4 h-4 text-stone-400 dark:text-stone-500"
        title="Hidden"
      />

      <!-- Action Buttons -->
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <UTooltip text="Edit">
          <UButton
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="handleEdit"
          />
        </UTooltip>
        <UTooltip text="Add Child">
          <UButton
            icon="i-heroicons-plus"
            color="neutral"
            variant="ghost"
            size="xs"
            @click="handleAddChild"
          />
        </UTooltip>
        <UTooltip text="Delete">
          <UButton
            icon="i-heroicons-trash"
            color="error"
            variant="ghost"
            size="xs"
            @click="handleDelete"
          />
        </UTooltip>
      </div>
    </div>

    <!-- Children Container - SIBLING of the item row, not nested inside it -->
    <div
      v-if="hasChildren && isExpanded"
      class="children-container border-l-2 border-stone-200 dark:border-stone-700 ml-6 pl-2"
    >
      <PublisherMenuItemRenderer
        v-for="child in children"
        :key="child.id"
        :item="child"
        :depth="depth + 1"
        @edit="handleChildEdit"
        @delete="handleChildDelete"
        @add-child="handleChildAddChild"
        @reorder="handleChildReorder"
      />
    </div>
  </div>
</template>
