<template>
  <div class="flex items-center justify-center min-h-screen bg-stone-100 dark:bg-stone-950">
    <div class="text-center">
      <div class="flex items-center justify-center gap-3 mb-6">
        <UIcon name="i-heroicons-cube-transparent" class="text-4xl text-amber-600 dark:text-amber-500" />
        <h1 class="text-4xl font-bold text-stone-900 dark:text-stone-100">Publisher</h1>
      </div>
      <p class="text-lg text-stone-500 dark:text-stone-400 mb-8">Developer-first headless CMS built on Nuxt 4</p>
      <UButton to="/admin" size="lg" color="neutral">
        Open Admin Panel
      </UButton>
    </div>
  </div>
</template>
