<script setup lang="ts">
import type { MenuItemType } from '~/lib/publisher/types'
import { Button } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { ChevronDown, ChevronRight, ExternalLink, EyeOff, File, Link, Menu, PenSquare, Plus, Tag, Trash2 } from 'lucide-vue-next'

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

const typeIconComponent = computed(() => {
  switch (props.item.type) {
    case 'page': return File
    case 'external': return ExternalLink
    case 'label': return Tag
    default: return Link
  }
})

const typeVariant = computed<'default' | 'secondary' | 'outline'>(() => {
  switch (props.item.type) {
    case 'page': return 'default'
    case 'external': return 'secondary'
    case 'label': return 'outline'
    default: return 'outline'
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
      class="menu-item flex items-center gap-2 p-3 hover:bg-[hsl(var(--background))] rounded-lg transition-colors group"
      :class="{ 'has-children': hasChildren }"
      :style="indentStyle"
    >
      <!-- Drag Handle - only on root items for now -->
      <div
        v-if="depth === 0"
        class="drag-handle cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--background))] transition-colors"
      >
        <Menu class="w-4 h-4" />
      </div>
      <!-- Spacer for nested items -->
      <div v-else class="w-5" />

      <!-- Expand/Collapse Button -->
      <button
        v-if="hasChildren"
        class="p-0.5 rounded hover:bg-[hsl(var(--accent))] transition-colors"
        @click="toggleExpand"
      >
        <ChevronDown v-if="isExpanded" class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <ChevronRight v-else class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      </button>
      <div v-else class="w-5" />

      <!-- Type Badge -->
      <Badge :variant="typeVariant">
        <component :is="typeIconComponent" class="mr-1 w-3 h-3" />
        {{ item.type }}
      </Badge>

      <!-- Label -->
      <span class="flex-1 font-medium text-[hsl(var(--foreground))] truncate">
        {{ item.label }}
      </span>

      <!-- URL Preview -->
      <span
        v-if="item.url"
        class="text-sm text-[hsl(var(--muted-foreground))] truncate max-w-xs hidden sm:block"
      >
        {{ item.url }}
      </span>

      <!-- Visibility Indicator -->
      <EyeOff
        v-if="!item.visible"
        class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
        title="Hidden"
      />

      <!-- Action Buttons -->
      <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          title="Edit"
          @click="handleEdit"
        >
          <PenSquare class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          title="Add Child"
          @click="handleAddChild"
        >
          <Plus class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          title="Delete"
          @click="handleDelete"
        >
          <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
        </Button>
      </div>
    </div>

    <!-- Children Container - SIBLING of the item row, not nested inside it -->
    <div
      v-if="hasChildren && isExpanded"
      class="children-container border-l-2 border-[hsl(var(--border))] ml-6 pl-2"
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
