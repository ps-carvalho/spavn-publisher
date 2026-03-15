<script setup lang="ts">
import type { PageBlock, BlockTypeConfig } from '~~/lib/publisher/types'
import { Button } from '@spavn/ui'
import { Menu, Box, PenSquare, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  block: PageBlock
  blockTypeConfig: BlockTypeConfig | null
  isSelected: boolean
}>()

const emit = defineEmits<{
  select: []
  delete: []
}>()

// Get the icon component for the block type
const blockIconComponent = computed(() => {
  // The blockTypeConfig.icon is a heroicon string; we use Box as fallback
  return Box
})

// Get the display name for the block type
const blockDisplayName = computed(() => {
  return props.blockTypeConfig?.displayName || props.block.blockType
})

// Generate preview text from the first string/text field in block data
const previewText = computed(() => {
  if (!props.block.data) return ''

  // Find the first string value in the block data
  const fields = props.blockTypeConfig?.fields || {}
  const fieldNames = Object.keys(fields)

  // First, try to find a title, headline, or name field
  const titleFields = ['title', 'headline', 'name', 'heading']
  for (const fieldName of titleFields) {
    if (fieldNames.includes(fieldName)) {
      const value = props.block.data[fieldName]
      if (typeof value === 'string' && value.trim()) {
        return truncateText(value, 50)
      }
    }
  }

  // Then look for any string/text field
  for (const [fieldName, fieldConfig] of Object.entries(fields)) {
    if (fieldConfig.type === 'string' || fieldConfig.type === 'text') {
      const value = props.block.data[fieldName]
      if (typeof value === 'string' && value.trim()) {
        return truncateText(value, 50)
      }
    }
  }

  // Fallback: look for any string value in data
  for (const value of Object.values(props.block.data)) {
    if (typeof value === 'string' && value.trim()) {
      return truncateText(value, 50)
    }
  }

  return ''
})

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

function handleSelect() {
  emit('select')
}

function handleDelete(event: MouseEvent) {
  event.stopPropagation()
  emit('delete')
}
</script>

<template>
  <div
    class="group flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer"
    :class="[
      isSelected
        ? 'border-[hsl(var(--primary))] bg-[hsl(var(--accent))] ring-2 ring-[hsl(var(--primary))]'
        : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:border-[hsl(var(--border))] hover:shadow-sm'
    ]"
    @click="handleSelect"
  >
    <!-- Drag handle -->
    <div class="drag-handle flex-shrink-0 text-[hsl(var(--muted-foreground))] cursor-grab active:cursor-grabbing">
      <Menu class="w-5 h-5" />
    </div>

    <!-- Block type icon -->
    <div class="flex-shrink-0">
      <div
        class="w-8 h-8 rounded-md flex items-center justify-center"
        :class="[
          isSelected
            ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
            : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
        ]"
      >
        <component :is="blockIconComponent" class="w-5 h-5" />
      </div>
    </div>

    <!-- Block info -->
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-[hsl(var(--foreground))]">
        {{ blockDisplayName }}
      </div>
      <div
        v-if="previewText"
        class="text-xs text-[hsl(var(--muted-foreground))] truncate mt-0.5"
      >
        {{ previewText }}
      </div>
    </div>

    <!-- Actions -->
    <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        size="sm"
        variant="ghost"
        @click.stop="handleSelect"
      >
        <PenSquare class="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        class="text-[hsl(var(--destructive))]"
        @click="handleDelete"
      >
        <Trash2 class="h-4 w-4" />
      </Button>
    </div>
  </div>
</template>
