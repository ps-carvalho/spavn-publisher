<script setup lang="ts">
defineProps<{
  selectedCount: number
  isBulkOperating: boolean
}>()

const emit = defineEmits<{
  move: []
  delete: []
  cancel: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0 translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 translate-y-4"
    >
      <div
        v-if="selectedCount > 0"
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg"
      >
        <span class="text-sm font-medium text-stone-700 dark:text-stone-300">
          {{ selectedCount }} selected
        </span>
        <div class="w-px h-5 bg-stone-200 dark:bg-stone-700" />
        <UButton
          variant="outline"
          color="neutral"
          icon="i-heroicons-folder-arrow-right"
          :disabled="isBulkOperating"
          @click="emit('move')"
        >
          Move to Folder
        </UButton>
        <UButton
          variant="outline"
          color="error"
          icon="i-heroicons-trash"
          :disabled="isBulkOperating"
          @click="emit('delete')"
        >
          Delete
        </UButton>
        <div class="w-px h-5 bg-stone-200 dark:bg-stone-700" />
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-x-mark"
          :disabled="isBulkOperating"
          @click="emit('cancel')"
        >
          Cancel
        </UButton>
      </div>
    </Transition>
  </Teleport>
</template>
