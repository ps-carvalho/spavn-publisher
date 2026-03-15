<script setup lang="ts">
import { Button } from '@spavn/ui'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@spavn/ui'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel } from '@spavn/ui'
import { Sun, Moon, Folder, Cloud, AlertTriangle, Home, ChevronRight, ChevronDown, Settings, LogOut } from 'lucide-vue-next'

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
  }
  catch {
    storageError.value = true
  }
})

const storageLabel = computed(() => {
  if (storageError.value) return 'Storage configuration error'
  return `Storage: ${storageProvider.value}`
})

async function handleLogout() {
  await logout()
}
</script>

<template>
  <header class="h-14 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] shadow-[0_1px_3px_rgba(0,0,0,0.02)] flex items-center justify-between px-6 sticky top-0 z-30">
    <!-- Breadcrumb -->
    <div class="flex items-center gap-2 text-sm">
      <NuxtLink to="/admin" class="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors duration-150">
        <Home class="w-4 h-4" />
      </NuxtLink>
      <ChevronRight class="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
      <span class="text-[hsl(var(--foreground))] font-medium">{{ title || 'Dashboard' }}</span>
    </div>

    <!-- Right side: theme toggle + storage + user -->
    <div class="flex items-center gap-2">
      <!-- Theme toggle -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              :aria-label="themeLabel"
              class="transition-all duration-150"
              @click="toggleTheme"
            >
              <Moon v-if="!isDark" class="w-4 h-4" />
              <Sun v-else class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ themeLabel }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- Storage status -->
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="sm"
              as="NuxtLink"
              to="/admin/settings"
            >
              <AlertTriangle v-if="storageError" class="w-4 h-4 text-[hsl(var(--destructive))]" />
              <Folder v-else-if="storageProvider === 'local'" class="w-4 h-4" />
              <Cloud v-else class="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ storageLabel }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <!-- User dropdown -->
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            class="flex items-center gap-2.5"
          >
            <!-- Avatar with initials -->
            <div class="w-8 h-8 rounded-full bg-[hsl(var(--accent))] flex items-center justify-center shrink-0">
              <span class="text-sm font-medium text-[hsl(var(--accent-foreground))]">
                {{ user?.firstName?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U' }}
              </span>
            </div>
            <div class="text-left hidden sm:block">
              <span class="text-sm font-medium text-[hsl(var(--foreground))] block leading-tight">
                {{ user?.firstName || user?.email?.split('@')[0] || 'User' }}
              </span>
              <span class="text-xs text-[hsl(var(--muted-foreground))] block leading-tight capitalize">
                {{ user?.role || 'admin' }}
              </span>
            </div>
            <ChevronDown class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{{ user?.email || 'User' }}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem as-child>
            <NuxtLink to="/admin" class="flex items-center gap-2">
              <Home class="w-4 h-4" />
              Dashboard
            </NuxtLink>
          </DropdownMenuItem>
          <DropdownMenuItem as-child>
            <NuxtLink to="/admin/settings" class="flex items-center gap-2">
              <Settings class="w-4 h-4" />
              Settings
            </NuxtLink>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="flex items-center gap-2" @click="handleLogout">
            <LogOut class="w-4 h-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  </header>
</template>
