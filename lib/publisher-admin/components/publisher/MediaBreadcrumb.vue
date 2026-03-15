<script setup lang="ts">
import { ChevronRight } from 'lucide-vue-next'

defineProps<{
  items: Array<{ label: string; icon?: string; click?: () => void }>
}>()
</script>

<template>
  <div v-if="items.length > 1" class="flex items-center gap-1 mb-4 text-sm">
    <template v-for="(item, index) in items" :key="index">
      <button
        v-if="item.click"
        class="flex items-center gap-1 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors"
        :class="{ 'text-[hsl(var(--primary))] font-medium': index === items.length - 1 }"
        @click="item.click"
      >
        <span>{{ item.label }}</span>
      </button>
      <span v-else class="flex items-center gap-1 text-[hsl(var(--primary))] font-medium">
        <span>{{ item.label }}</span>
      </span>
      <ChevronRight
        v-if="index < items.length - 1"
        class="w-4 h-4 text-[hsl(var(--muted-foreground))]"
      />
    </template>
  </div>
</template>
