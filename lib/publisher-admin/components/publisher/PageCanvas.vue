<script setup lang="ts">
import type { PageBlock, BlockTypeConfig, PageTypeConfig, AreaConfig } from '~~/lib/publisher/types'

const props = withDefaults(defineProps<{
  blocks: Record<string, PageBlock[]>
  pageType: PageTypeConfig | null
  blockTypes: BlockTypeConfig[]
  selectedBlockId: number | null
  mode?: 'edit' | 'preview'
}>(), {
  mode: 'edit',
})

const emit = defineEmits<{
  'select-block': [blockId: number]
  'delete-block': [blockId: number]
  'add-block': [areaName: string]
  'reorder-blocks': [areaName: string, blockIds: number[]]
}>()

// Get areas in order from page type
const areaNames = computed(() => {
  if (!props.pageType) return Object.keys(props.blocks)
  return Object.keys(props.pageType.areas)
})

// Get area config by name
function getAreaConfig(areaName: string): AreaConfig | undefined {
  return props.pageType?.areas[areaName]
}

// Get block type config by name
function getBlockTypeConfig(blockTypeName: string): BlockTypeConfig | null {
  return props.blockTypes.find(bt => bt.name === blockTypeName) || null
}

// Get allowed blocks display names for an area
function getAllowedBlocksHint(areaName: string): string {
  const areaConfig = getAreaConfig(areaName)
  if (!areaConfig || !areaConfig.allowedBlocks.length) return ''
  
  const displayNames = areaConfig.allowedBlocks.map(blockTypeName => {
    const config = getBlockTypeConfig(blockTypeName)
    return config?.displayName || blockTypeName
  })
  
  return displayNames.join(', ')
}

// Check if add button should be disabled (max blocks reached)
function isAddButtonDisabled(areaName: string): boolean {
  const areaConfig = getAreaConfig(areaName)
  if (!areaConfig?.maxBlocks) return false
  
  const currentCount = props.blocks[areaName]?.length || 0
  return currentCount >= areaConfig.maxBlocks
}

// Get max blocks hint text
function getMaxBlocksHint(areaName: string): string {
  const areaConfig = getAreaConfig(areaName)
  if (!areaConfig?.maxBlocks) return ''
  
  const currentCount = props.blocks[areaName]?.length || 0
  return `max: ${areaConfig.maxBlocks}`
}

// Handle block selection
function handleSelectBlock(blockId: number) {
  emit('select-block', blockId)
}

// Handle block deletion
function handleDeleteBlock(blockId: number) {
  emit('delete-block', blockId)
}

// Handle add block button click
function handleAddBlock(areaName: string) {
  emit('add-block', areaName)
}
</script>

<template>
  <div class="flex-1 overflow-auto bg-stone-100 dark:bg-stone-950 p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Area containers -->
      <div
        v-for="areaName in areaNames"
        :key="areaName"
        class="rounded-xl overflow-hidden"
        :class="mode === 'edit'
          ? 'border-2 border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900'
          : 'border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50'"
      >
        <!-- Area header -->
        <div
          class="px-4 py-3 border-b"
          :class="mode === 'edit'
            ? 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700'
            : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-800'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h4 class="text-sm font-semibold text-stone-800 dark:text-stone-200 uppercase tracking-wide">
                {{ getAreaConfig(areaName)?.displayName || areaName }}
              </h4>

              <!-- Max blocks badge (edit mode only) -->
              <UBadge
                v-if="mode === 'edit' && getAreaConfig(areaName)?.maxBlocks"
                size="xs"
                variant="subtle"
                color="neutral"
              >
                {{ getMaxBlocksHint(areaName) }}
              </UBadge>
            </div>

            <!-- Add block button (edit mode only) -->
            <UButton
              v-if="mode === 'edit'"
              size="xs"
              variant="ghost"
              color="primary"
              icon="i-heroicons-plus"
              :disabled="isAddButtonDisabled(areaName)"
              @click="handleAddBlock(areaName)"
            >
              Add Block
            </UButton>
          </div>

          <!-- Allowed blocks hint (edit mode only) -->
          <p
            v-if="mode === 'edit' && getAllowedBlocksHint(areaName)"
            class="text-xs text-stone-500 dark:text-stone-400 mt-1"
          >
            Allowed: {{ getAllowedBlocksHint(areaName) }}
          </p>
        </div>

        <!-- Area content -->
        <div class="p-4">
          <!-- EDIT MODE: Blocks with drag-drop reordering -->
          <template v-if="mode === 'edit'">
            <template v-if="blocks[areaName]?.length">
              <ClientOnly>
                <PublisherSortableArea
                  :model-value="blocks[areaName] || []"
                  :disabled="blocks[areaName].length <= 1"
                  handle=".drag-handle"
                  class="space-y-2"
                  @reorder="(ids: number[]) => emit('reorder-blocks', areaName, ids)"
                >
                  <PublisherBlockInstance
                    v-for="block in blocks[areaName]"
                    :key="block.id"
                    :block="block"
                    :block-type-config="getBlockTypeConfig(block.blockType)"
                    :is-selected="selectedBlockId === block.id"
                    @select="handleSelectBlock(block.id)"
                    @delete="handleDeleteBlock(block.id)"
                  />
                </PublisherSortableArea>
                <template #fallback>
                  <!-- SSR fallback: render blocks without sortable -->
                  <div class="space-y-2">
                    <PublisherBlockInstance
                      v-for="block in blocks[areaName]"
                      :key="block.id"
                      :block="block"
                      :block-type-config="getBlockTypeConfig(block.blockType)"
                      :is-selected="selectedBlockId === block.id"
                      @select="handleSelectBlock(block.id)"
                      @delete="handleDeleteBlock(block.id)"
                    />
                  </div>
                </template>
              </ClientOnly>
            </template>

            <!-- Empty state (edit mode) -->
            <div
              v-else
              class="text-center py-8"
            >
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 mb-3">
                <UIcon name="i-heroicons-cube" class="text-xl text-stone-400 dark:text-stone-500" />
              </div>
              <p class="text-sm text-stone-500 dark:text-stone-400 mb-1">
                No blocks yet
              </p>
              <p class="text-xs text-stone-400 dark:text-stone-500 mb-4">
                Click the button below to add a block
              </p>
              <UButton
                size="sm"
                variant="outline"
                color="primary"
                icon="i-heroicons-plus"
                @click="handleAddBlock(areaName)"
              >
                Add Block
              </UButton>
            </div>
          </template>

          <!-- PREVIEW MODE: Render styled block previews -->
          <template v-else>
            <div v-if="blocks[areaName]?.length" class="space-y-4">
              <PublisherBlockPreview
                v-for="block in blocks[areaName]"
                :key="block.id"
                :block="block"
              />
            </div>

            <!-- Empty state (preview mode) -->
            <div
              v-else
              class="text-center py-8 text-stone-400 dark:text-stone-500"
            >
              <UIcon name="i-heroicons-document-text" class="text-2xl mb-2" />
              <p class="text-sm">No content in this area</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
