<script setup lang="ts">
import type { PageBlock, BlockTypeConfig } from '~~/lib/publisher/types'

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
  <div class="w-80 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-stone-200 dark:border-stone-800">
      <h3 class="text-sm font-semibold text-stone-900 dark:text-stone-100">
        Block Settings
      </h3>
    </div>

    <!-- No block selected -->
    <div v-if="!block" class="flex-1 flex items-center justify-center text-stone-400 dark:text-stone-500">
      <div class="text-center px-6">
        <div class="text-4xl mb-3">📦</div>
        <p class="text-sm font-medium text-stone-500 dark:text-stone-400 mb-1">No block selected</p>
        <p class="text-xs text-stone-400 dark:text-stone-500">
          Click a block in the canvas to edit it
        </p>
      </div>
    </div>

    <!-- Block settings form -->
    <div v-else class="flex-1 overflow-auto">
      <!-- Block type header -->
      <div class="p-4 border-b border-stone-200 dark:border-stone-800">
        <div class="flex items-center gap-2">
          <UIcon :name="blockType?.icon || 'i-heroicons-cube'" class="text-stone-500 dark:text-stone-400" />
          <span class="text-sm font-semibold text-stone-900 dark:text-stone-100">
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
      <div v-else class="p-4 text-sm text-stone-500 dark:text-stone-400 text-center py-8">
        This block has no configurable fields
      </div>
    </div>

    <!-- Unsaved changes indicator -->
    <div v-if="hasChanges && block" class="px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border-t border-amber-200 dark:border-amber-800">
      <p class="text-xs text-amber-700 dark:text-amber-300 flex items-center gap-1">
        <UIcon name="i-heroicons-exclamation-circle" />
        You have unsaved changes
      </p>
    </div>

    <!-- Actions -->
    <div v-if="block" class="p-4 border-t border-stone-200 dark:border-stone-800 space-y-2">
      <UButton
        block
        color="primary"
        icon="i-heroicons-check"
        :disabled="!hasChanges"
        :loading="isSaving"
        @click="handleSave"
      >
        Save Changes
      </UButton>

      <UButton
        block
        color="error"
        variant="ghost"
        icon="i-heroicons-trash"
        @click="confirmDelete"
      >
        Delete Block
      </UButton>
    </div>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
            Delete Block
          </h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to delete this block? This cannot be undone.
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">
              Cancel
            </UButton>
            <UButton color="error" @click="handleDelete">
              Delete
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
