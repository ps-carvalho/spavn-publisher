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
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div class="relative overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 ring-1 ring-amber-200/60 dark:ring-amber-800/30">
            <UIcon name="i-heroicons-document-text" class="text-amber-600 dark:text-amber-400 text-xl" />
          </div>
          <div>
            <p class="text-[13px] font-medium text-stone-500 dark:text-stone-400">Content Types</p>
            <p class="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">—</p>
          </div>
        </div>
        <div class="absolute -right-3 -bottom-3 w-20 h-20 rounded-full bg-amber-50/50 dark:bg-amber-900/10 blur-xl" />
      </div>

      <div class="relative overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 ring-1 ring-emerald-200/60 dark:ring-emerald-800/30">
            <UIcon name="i-heroicons-photo" class="text-emerald-600 dark:text-emerald-400 text-xl" />
          </div>
          <div>
            <p class="text-[13px] font-medium text-stone-500 dark:text-stone-400">Media Files</p>
            <p class="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">—</p>
          </div>
        </div>
        <div class="absolute -right-3 -bottom-3 w-20 h-20 rounded-full bg-emerald-50/50 dark:bg-emerald-900/10 blur-xl" />
      </div>

      <div class="relative overflow-hidden rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
        <div class="flex items-center gap-4">
          <div class="p-3 rounded-xl bg-violet-50 dark:bg-violet-950/40 ring-1 ring-violet-200/60 dark:ring-violet-800/30">
            <UIcon name="i-heroicons-users" class="text-violet-600 dark:text-violet-400 text-xl" />
          </div>
          <div>
            <p class="text-[13px] font-medium text-stone-500 dark:text-stone-400">Users</p>
            <p class="text-2xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">—</p>
          </div>
        </div>
        <div class="absolute -right-3 -bottom-3 w-20 h-20 rounded-full bg-violet-50/50 dark:bg-violet-900/10 blur-xl" />
      </div>
    </div>
  </div>
</template>
