<script setup lang="ts">
import type { BulkOperationProgress } from '~/composables/useMediaOperations'

defineProps<{
  isOperating: boolean
  progress: BulkOperationProgress
}>()
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out duration-200"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in duration-150"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOperating"
        class="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-3 px-6 py-4 rounded-lg bg-white dark:bg-stone-800 shadow-xl">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-amber-500 animate-spin" />
          <p class="text-sm font-medium text-stone-700 dark:text-stone-300">
            {{ progress.action === 'move' ? 'Moving' : 'Deleting' }}
            {{ progress.current }} of {{ progress.total }} files...
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
