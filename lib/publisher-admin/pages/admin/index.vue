<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const { user } = usePublisherAuth()
</script>

<template>
  <div>
    <div class="mb-8">
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
        Welcome back{{ user?.firstName ? `, ${user.firstName}` : '' }}!
      </h2>
      <p class="text-stone-500 dark:text-stone-400">
        Manage your content, media, and settings from this dashboard.
      </p>
    </div>

    <!-- Quick stats cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
            <UIcon name="i-heroicons-document-text" class="text-amber-600 dark:text-amber-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-stone-500 dark:text-stone-400">Content Types</p>
            <p class="text-2xl font-bold text-stone-900 dark:text-stone-100">—</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-green-50 dark:bg-green-950">
            <UIcon name="i-heroicons-photo" class="text-green-600 dark:text-green-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-stone-500 dark:text-stone-400">Media Files</p>
            <p class="text-2xl font-bold text-stone-900 dark:text-stone-100">—</p>
          </div>
        </div>
      </UCard>

      <UCard>
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-lg bg-purple-50 dark:bg-purple-950">
            <UIcon name="i-heroicons-users" class="text-purple-600 dark:text-purple-400 text-xl" />
          </div>
          <div>
            <p class="text-sm text-stone-500 dark:text-stone-400">Users</p>
            <p class="text-2xl font-bold text-stone-900 dark:text-stone-100">—</p>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
