<script setup lang="ts">
import Sortable from 'sortablejs'

// Generic type for items that have an id
interface SortableItem {
  id: number
}

const props = withDefaults(defineProps<{
  modelValue: SortableItem[]
  disabled?: boolean
  handle?: string
  group?: string
}>(), {
  disabled: false,
  handle: '.drag-handle',
  group: 'blocks'
})

const emit = defineEmits<{
  'update:modelValue': [value: SortableItem[]]
  'reorder': [blockIds: number[]]
}>()

const containerRef = ref<HTMLElement | null>(null)
let sortableInstance: Sortable | null = null

onMounted(() => {
  if (!containerRef.value) return

  sortableInstance = Sortable.create(containerRef.value, {
    handle: props.handle,
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    dragClass: 'sortable-drag',
    disabled: props.disabled,
    group: { name: props.group, pull: false, put: false }, // No cross-area in v1
    onEnd(evt) {
      if (evt.oldIndex === undefined || evt.newIndex === undefined) return
      if (evt.oldIndex === evt.newIndex) return

      // Build the new order from the data (not DOM)
      const newItems = [...props.modelValue]
      const [moved] = newItems.splice(evt.oldIndex, 1)
      if (moved) {
        newItems.splice(evt.newIndex, 0, moved)
      }

      // Emit updated data — Vue will reconcile the DOM via reactivity
      // SortableJS has already moved the DOM element to the new position,
      // and the v-model update will make Vue's vnode tree match
      emit('update:modelValue', newItems)
      emit('reorder', newItems.map(item => item.id))
    }
  })
})

// Watch disabled prop
watch(() => props.disabled, (val) => {
  if (sortableInstance) {
    sortableInstance.option('disabled', val)
  }
})

onBeforeUnmount(() => {
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
})
</script>

<template>
  <div ref="containerRef">
    <slot />
  </div>
</template>

<style>
.sortable-ghost {
  opacity: 0.4;
  background: rgb(239 68 68 / 0.1);
  border-radius: 0.5rem;
}
.sortable-chosen {
  /* No special chosen style */
}
.sortable-drag {
  opacity: 0.9;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
</style>
