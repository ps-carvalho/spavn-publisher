<script setup lang="ts">
import { Box } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
</script>

<template>
  <div class="flex items-center justify-center min-h-screen bg-[hsl(var(--background))]">
    <div class="text-center">
      <div class="flex items-center justify-center gap-3 mb-6">
        <Box class="w-9 h-9 text-[hsl(var(--primary))]" />
        <h1 class="text-4xl font-bold text-[hsl(var(--foreground))]">Publisher</h1>
      </div>
      <p class="text-lg text-[hsl(var(--muted-foreground))] mb-8">Developer-first headless CMS built with NextJS</p>
      <NuxtLink to="/admin">
        <Button size="lg" variant="outline">
          Open Admin Panel
        </Button>
      </NuxtLink>
    </div>
  </div>
</template>
