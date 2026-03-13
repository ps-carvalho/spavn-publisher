<script setup lang="ts">
defineProps<{
  title?: string
}>()

const { user, logout } = usePublisherAuth()
const colorMode = useColorMode()

const isDark = computed({
  get: () => colorMode.value === 'dark',
  set: (val: boolean) => {
    colorMode.preference = val ? 'dark' : 'light'
  },
})

function toggleTheme() {
  isDark.value = !isDark.value
}

const themeIcon = computed(() =>
  isDark.value ? 'i-heroicons-sun' : 'i-heroicons-moon',
)

const themeLabel = computed(() =>
  isDark.value ? 'Switch to light mode' : 'Switch to dark mode',
)

// Storage status
const storageProvider = ref<string>('local')
const storageError = ref(false)

onMounted(async () => {
  try {
    const response = await $fetch('/api/publisher/storage/config')
    storageProvider.value = response.defaultProvider || 'local'
    storageError.value = false
  } catch {
    storageError.value = true
  }
})

const storageIcon = computed(() => {
  if (storageError.value) return 'i-heroicons-exclamation-triangle'
  if (storageProvider.value === 'local') return 'i-heroicons-folder'
  return 'i-heroicons-cloud'
})

const storageLabel = computed(() => {
  if (storageError.value) return 'Storage configuration error'
  return `Storage: ${storageProvider.value}`
})

const storageColor = computed(() => {
  if (storageError.value) return 'warning'
  return 'neutral'
})

async function handleLogout() {
  await logout()
}

const userMenuItems = computed(() => [
  [
    {
      label: user.value?.email || 'User',
      slot: 'account',
      disabled: true,
    },
  ],
  [
    {
      label: 'Dashboard',
      icon: 'i-heroicons-home',
      to: '/admin',
    },
    {
      label: 'Settings',
      icon: 'i-heroicons-cog-6-tooth',
      to: '/admin/settings',
    },
  ],
  [
    {
      label: 'Logout',
      icon: 'i-heroicons-arrow-right-on-rectangle',
      onSelect: handleLogout,
    },
  ],
])
</script>

<template>
  <header class="h-14 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between px-6 sticky top-0 z-30">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm">
      <NuxtLink to="/admin" class="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors duration-150">
        <UIcon name="i-heroicons-home" class="w-4 h-4" />
      </NuxtLink>
      <UIcon name="i-heroicons-chevron-right" class="w-4 h-4 text-stone-300 dark:text-stone-600" />
      <span class="text-amber-700 dark:text-amber-500 font-medium">{{ title || 'Dashboard' }}</span>
    </div>

    <!-- Right side: theme toggle + user -->
    <div class="flex items-center gap-2">
      <!-- Theme toggle -->
      <UButton
        :icon="themeIcon"
        color="neutral"
        variant="ghost"
        size="sm"
        :aria-label="themeLabel"
        class="transition-all duration-150"
        @click="toggleTheme"
      />

      <!-- Storage status -->
      <UTooltip :text="storageLabel">
        <UButton
          :icon="storageIcon"
          :color="storageColor"
          variant="ghost"
          size="sm"
          to="/admin/settings"
        />
      </UTooltip>

      <!-- User dropdown -->
      <UDropdownMenu :items="userMenuItems">
        <UButton
          color="neutral"
          variant="ghost"
          class="flex items-center gap-2.5"
        >
          <!-- Avatar with initials -->
          <div class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <span class="text-sm font-medium text-amber-700 dark:text-amber-400">
              {{ user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U' }}
            </span>
          </div>
          <div class="text-left hidden sm:block">
            <span class="text-sm font-medium text-stone-900 dark:text-stone-100 block leading-tight">
              {{ user?.firstName || user?.email?.split('@')[0] || 'User' }}
            </span>
            <span class="text-xs text-stone-500 dark:text-stone-400 block leading-tight capitalize">
              {{ user?.role || 'admin' }}
            </span>
          </div>
          <UIcon name="i-heroicons-chevron-down" class="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 ml-1" />
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
</template>
