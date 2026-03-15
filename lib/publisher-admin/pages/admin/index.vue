<script setup lang="ts">
import { FileText, Image, Users } from 'lucide-vue-next'
import { Card, CardContent } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const { user } = usePublisherAuth()
</script>

<template>
  <div>
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))] mb-2">
        Welcome back{{ user?.firstName ? `, ${user.firstName}` : '' }}!
      </h2>
      <p class="text-[hsl(var(--muted-foreground))]">
        Manage your content, media, and settings from this dashboard.
      </p>
    </div>

    <!-- Quick stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <Card>
        <CardContent class="flex items-center gap-4 p-6">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
            <FileText class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div>
            <p class="text-sm font-medium text-[hsl(var(--muted-foreground))]">Content Types</p>
            <p class="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">&mdash;</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="flex items-center gap-4 p-6">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
            <Image class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div>
            <p class="text-sm font-medium text-[hsl(var(--muted-foreground))]">Media Files</p>
            <p class="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">&mdash;</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="flex items-center gap-4 p-6">
          <div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--muted))]">
            <Users class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
          </div>
          <div>
            <p class="text-sm font-medium text-[hsl(var(--muted-foreground))]">Users</p>
            <p class="text-2xl font-bold tracking-tight text-[hsl(var(--foreground))]">&mdash;</p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
