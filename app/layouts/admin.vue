<script setup lang="ts">
const route = useRoute()

// Derive page title from route
const pageTitle = computed(() => {
  const path = route.path
  if (path === '/admin') return 'Dashboard'
  if (path.startsWith('/admin/pages')) return 'Pages'
  if (path === '/admin/media') return 'Media Library'
  if (path === '/admin/types') return 'Content Types'
  if (path === '/admin/types/blocks') return 'Block Types'
  if (path === '/admin/types/pages') return 'Page Types'
  if (path.startsWith('/admin/types/content/')) return 'Content Types'
  if (path === '/admin/settings') return 'Settings'
  if (path === '/admin/settings/users') return 'Users & Roles'
  if (path === '/admin/settings/webhooks') return 'Webhooks'
  if (path === '/admin/settings/tokens') return 'API Tokens'
  if (path.startsWith('/admin/content/')) {
    const type = route.params.type
    return typeof type === 'string' ? type.charAt(0).toUpperCase() + type.slice(1) : 'Content'
  }
  return 'Publisher'
})
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-stone-950">
    <!-- Sidebar -->
    <PublisherSidebar />

    <!-- Main content area (offset by sidebar width) -->
    <div class="ml-60">
      <!-- Top bar -->
      <PublisherTopbar :title="pageTitle" />

      <!-- Page content -->
      <main class="p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
