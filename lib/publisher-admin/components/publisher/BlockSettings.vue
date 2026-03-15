<script setup lang="ts">
import type { PageBlock, BlockTypeConfig } from '~~/lib/publisher/types'
import { Button } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Box, Check, Trash2, Loader2, AlertTriangle } from 'lucide-vue-next'

const props = defineProps<{
  block: PageBlock | null
  blockType: BlockTypeConfig | null
}>()

const emit = defineEmits<{
  'update-block': [blockId: number, data: Record<string, unknown>]
  'delete-block': [blockId: number]
}>()

// Local form data for the block
const formData = ref<Record<string, unknown>>({})

// Flag to skip watcher during block initialization
const isInitializing = ref(false)

// Track unsaved changes locally
const hasChanges = ref(false)

// Track saving state (will be managed by parent in Task 3)
const isSaving = ref(false)

// Watch for block changes and populate form
watch(
  () => props.block,
  (newBlock) => {
    isInitializing.value = true
    if (newBlock) {
      formData.value = { ...newBlock.data }
    }
    else {
      formData.value = {}
    }
    nextTick(() => {
      isInitializing.value = false
      hasChanges.value = false
    })
  },
  { immediate: true }
)

// Track local changes without auto-saving
// Parent will handle explicit save actions
watch(
  formData,
  () => {
    if (!props.block || isInitializing.value) return
    hasChanges.value = true
  },
  { deep: true }
)

// Delete confirmation
const showDeleteModal = ref(false)

function confirmDelete() {
  if (props.block) {
    showDeleteModal.value = true
  }
}

function handleDelete() {
  if (props.block) {
    emit('delete-block', props.block.id)
    showDeleteModal.value = false
  }
}

// Handle save action - emits update-block event with current form data
async function handleSave() {
  if (!props.block || !hasChanges.value) return

  isSaving.value = true

  try {
    // Emit the update event - parent will handle the actual API call
    emit('update-block', props.block.id, { ...formData.value })

    // For now, assume success and reset dirty state
    // In Task 3, we'll handle errors and keep dirty state on failure
    hasChanges.value = false
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="w-80 border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-[hsl(var(--border))]">
      <h3 class="text-sm font-semibold text-[hsl(var(--foreground))]">
        Block Settings
      </h3>
    </div>

    <!-- No block selected -->
    <div v-if="!block" class="flex-1 flex items-center justify-center text-[hsl(var(--muted-foreground))]">
      <div class="text-center px-6">
        <div class="text-4xl mb-3">
          <Box class="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))]" />
        </div>
        <p class="text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">No block selected</p>
        <p class="text-xs text-[hsl(var(--muted-foreground))]">
          Click a block in the canvas to edit it
        </p>
      </div>
    </div>

    <!-- Block settings form -->
    <div v-else class="flex-1 overflow-auto">
      <!-- Block type header -->
      <div class="p-4 border-b border-[hsl(var(--border))]">
        <div class="flex items-center gap-2">
          <Box class="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
          <span class="text-sm font-semibold text-[hsl(var(--foreground))]">
            {{ blockType?.displayName || block.blockType }}
          </span>
        </div>
      </div>

      <!-- Fields -->
      <div v-if="blockType?.fields" class="p-4 space-y-4">
        <PublisherFieldRenderer
          v-for="[fieldName, fieldConfig] in Object.entries(blockType.fields)"
          :key="fieldName"
          :field-name="fieldName"
          :field-config="fieldConfig"
          v-model="formData[fieldName]"
        />
      </div>

      <!-- No fields -->
      <div v-else class="p-4 text-sm text-[hsl(var(--muted-foreground))] text-center py-8">
        This block has no configurable fields
      </div>
    </div>

    <!-- Unsaved changes indicator -->
    <div v-if="hasChanges && block" class="px-4 py-2 bg-[hsl(var(--accent))] border-t border-[hsl(var(--border))]">
      <p class="text-xs text-[hsl(var(--primary))] flex items-center gap-1">
        <AlertTriangle class="w-3 h-3" />
        You have unsaved changes
      </p>
    </div>

    <!-- Actions -->
    <div v-if="block" class="p-4 border-t border-[hsl(var(--border))] space-y-2">
      <template v-if="!isSaving">
        <Button
          class="w-full"
          :disabled="!hasChanges"
          @click="handleSave"
        >
          <Check class="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </template>
      <template v-else>
        <Button
          class="w-full"
          disabled
        >
          <Loader2 class="h-4 w-4 animate-spin mr-2" />
          Saving...
        </Button>
      </template>

      <Button
        variant="ghost"
        class="w-full text-[hsl(var(--destructive))]"
        @click="confirmDelete"
      >
        <Trash2 class="h-4 w-4 mr-2" />
        Delete Block
      </Button>
    </div>

    <!-- Delete confirmation modal -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Block</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete this block? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="handleDelete">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
