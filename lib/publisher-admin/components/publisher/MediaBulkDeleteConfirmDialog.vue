<script setup lang="ts">
import { Button } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Loader2 } from 'lucide-vue-next'

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
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete {{ selectedCount }} File{{ selectedCount !== 1 ? 's' : '' }}?</DialogTitle>
      </DialogHeader>
      <p class="text-sm text-[hsl(var(--muted-foreground))]">
        This action cannot be undone. The selected files will be permanently removed.
      </p>
      <DialogFooter>
        <Button
          variant="ghost"
          :disabled="isBulkOperating"
          @click="emit('update:open', false)"
        >
          Cancel
        </Button>
        <Button
          v-if="!isBulkOperating"
          variant="destructive"
          @click="emit('confirm')"
        >
          Delete {{ selectedCount }} File{{ selectedCount !== 1 ? 's' : '' }}
        </Button>
        <Button
          v-else
          variant="destructive"
          disabled
        >
          <Loader2 class="h-4 w-4 animate-spin mr-2" />
          Deleting...
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
