<script setup lang="ts">
import type { PageBlock, BlockTypeConfig } from '~~/lib/publisher/types'

const props = defineProps<{
  block: PageBlock
  blockTypeConfig: BlockTypeConfig | null
  isSelected: boolean
}>()

const emit = defineEmits<{
  select: []
  delete: []
}>()

// Get the icon for the block type
const blockIcon = computed(() => {
  return props.blockTypeConfig?.icon || 'i-heroicons-cube'
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
  return text.slice(0, maxLength).trim() + '…'
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
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/50 ring-2 ring-primary-500'
        : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 hover:border-stone-400 dark:hover:border-stone-600 hover:shadow-sm'
    ]"
    @click="handleSelect"
  >
    <!-- Drag handle -->
    <div class="drag-handle flex-shrink-0 text-stone-400 dark:text-stone-500 cursor-grab active:cursor-grabbing">
      <UIcon name="i-heroicons-bars-3" class="text-lg" />
    </div>

    <!-- Block type icon -->
    <div class="flex-shrink-0">
      <div
        class="w-8 h-8 rounded-md flex items-center justify-center"
        :class="[
          isSelected
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400'
            : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
        ]"
      >
        <UIcon :name="blockIcon" class="text-lg" />
      </div>
    </div>

    <!-- Block info -->
    <div class="flex-1 min-w-0">
      <div class="text-sm font-medium text-stone-800 dark:text-stone-200">
        {{ blockDisplayName }}
      </div>
      <div
        v-if="previewText"
        class="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5"
      >
        {{ previewText }}
      </div>
    </div>

    <!-- Actions -->
    <div class="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <UButton
        size="xs"
        variant="ghost"
        color="neutral"
        icon="i-heroicons-pencil-square"
        @click.stop="handleSelect"
      />
      <UButton
        size="xs"
        variant="ghost"
        color="error"
        icon="i-heroicons-trash"
        @click="handleDelete"
      />
    </div>
  </div>
</template>
