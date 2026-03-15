<script setup lang="ts">
import type { PageBlock, BlockTypeConfig, PageTypeConfig, AreaConfig } from '~~/lib/publisher/types'
import { Button } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Box, Plus, FileText } from 'lucide-vue-next'

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
  <div class="flex-1 overflow-auto bg-[hsl(var(--background))] p-6">
    <div class="max-w-4xl mx-auto space-y-6">
      <!-- Area containers -->
      <div
        v-for="areaName in areaNames"
        :key="areaName"
        class="rounded-xl overflow-hidden"
        :class="mode === 'edit'
          ? 'border-2 border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]'
          : 'border border-[hsl(var(--border))] bg-[hsl(var(--background))]'"
      >
        <!-- Area header -->
        <div
          class="px-4 py-3 border-b"
          :class="mode === 'edit'
            ? 'bg-[hsl(var(--muted))] border-[hsl(var(--border))]'
            : 'bg-[hsl(var(--muted))] border-[hsl(var(--border))]'"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <h4 class="text-sm font-semibold text-[hsl(var(--foreground))] uppercase tracking-wide">
                {{ getAreaConfig(areaName)?.displayName || areaName }}
              </h4>

              <!-- Max blocks badge (edit mode only) -->
              <Badge
                v-if="mode === 'edit' && getAreaConfig(areaName)?.maxBlocks"
                variant="secondary"
              >
                {{ getMaxBlocksHint(areaName) }}
              </Badge>
            </div>

            <!-- Add block button (edit mode only) -->
            <Button
              v-if="mode === 'edit'"
              size="sm"
              variant="ghost"
              :disabled="isAddButtonDisabled(areaName)"
              @click="handleAddBlock(areaName)"
            >
              <Plus class="h-4 w-4 mr-2" />
              Add Block
            </Button>
          </div>

          <!-- Allowed blocks hint (edit mode only) -->
          <p
            v-if="mode === 'edit' && getAllowedBlocksHint(areaName)"
            class="text-xs text-[hsl(var(--muted-foreground))] mt-1"
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
              <div class="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--muted))] mb-3">
                <Box class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </div>
              <p class="text-sm text-[hsl(var(--muted-foreground))] mb-1">
                No blocks yet
              </p>
              <p class="text-xs text-[hsl(var(--muted-foreground))] mb-4">
                Click the button below to add a block
              </p>
              <Button
                size="sm"
                variant="outline"
                @click="handleAddBlock(areaName)"
              >
                <Plus class="h-4 w-4 mr-2" />
                Add Block
              </Button>
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
              class="text-center py-8 text-[hsl(var(--muted-foreground))]"
            >
              <FileText class="w-6 h-6 mx-auto mb-2" />
              <p class="text-sm">No content in this area</p>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
