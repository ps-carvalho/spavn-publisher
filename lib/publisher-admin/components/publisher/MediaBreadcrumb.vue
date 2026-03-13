<script setup lang="ts">
defineProps<{
  items: Array<{ label: string; icon?: string; click?: () => void }>
}>()
</script>

<template>
  <div v-if="items.length > 1" class="flex items-center gap-1 mb-4 text-sm">
    <template v-for="(item, index) in items" :key="index">
      <button
        v-if="item.click"
        class="flex items-center gap-1 text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
        :class="{ 'text-amber-700 dark:text-amber-400 font-medium': index === items.length - 1 }"
        @click="item.click"
      >
        <UIcon v-if="item.icon" :name="item.icon" class="w-4 h-4" />
        <span>{{ item.label }}</span>
      </button>
      <span v-else class="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
        <UIcon v-if="item.icon" :name="item.icon" class="w-4 h-4" />
        <span>{{ item.label }}</span>
      </span>
      <UIcon
        v-if="index < items.length - 1"
        name="i-heroicons-chevron-right"
        class="w-4 h-4 text-stone-300 dark:text-stone-600"
      />
    </template>
  </div>
</template>
