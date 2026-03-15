<script setup lang="ts">
import { Button } from '@spavn/ui'
import { FolderInput, Trash2, X } from 'lucide-vue-next'

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
        class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-lg"
      >
        <span class="text-sm font-medium text-[hsl(var(--foreground))]">
          {{ selectedCount }} selected
        </span>
        <div class="w-px h-5 bg-[hsl(var(--border))]" />
        <Button
          variant="outline"
          :disabled="isBulkOperating"
          @click="emit('move')"
        >
          <FolderInput class="h-4 w-4 mr-2" />
          Move to Folder
        </Button>
        <Button
          variant="destructive"
          :disabled="isBulkOperating"
          @click="emit('delete')"
        >
          <Trash2 class="h-4 w-4 mr-2" />
          Delete
        </Button>
        <div class="w-px h-5 bg-[hsl(var(--border))]" />
        <Button
          variant="ghost"
          :disabled="isBulkOperating"
          @click="emit('cancel')"
        >
          <X class="h-4 w-4 mr-2" />
          Cancel
        </Button>
      </div>
    </Transition>
  </Teleport>
</template>
