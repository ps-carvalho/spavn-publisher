<script setup lang="ts">
defineProps<{
  open: boolean
  selectedCount: number
  isBulkOperating: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: []
}>()
</script>

<template>
  <UModal :open="open" @update:open="emit('update:open', $event)">
    <template #content>
      <div class="p-6">
        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
          Delete {{ selectedCount }} File{{ selectedCount !== 1 ? 's' : '' }}?
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">
          This action cannot be undone. The selected files will be permanently removed.
        </p>
        <div class="flex justify-end gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            :disabled="isBulkOperating"
            @click="emit('update:open', false)"
          >
            Cancel
          </UButton>
          <UButton
            color="error"
            :loading="isBulkOperating"
            @click="emit('confirm')"
          >
            Delete {{ selectedCount }} File{{ selectedCount !== 1 ? 's' : '' }}
          </UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>
