<script setup lang="ts">
const route = useRoute()

interface ContentTypeInfo {
  name: string
  displayName: string
  pluralName: string
  icon?: string
}

interface NavItem {
  label: string
  icon?: string
  to?: string
  active?: boolean
  disabled?: boolean
}

interface NavSection {
  label: string
  items: NavItem[]
  collapsible?: boolean
  defaultOpen?: boolean
}

// Fetch content types dynamically
const { data: typesData } = await useFetch<{ data: ContentTypeInfo[] }>('/api/publisher/types', {
  key: 'sidebar-types',
})

const contentTypes = computed(() => typesData.value?.data || [])

// Collapsible section state
const expandedSections = ref<Set<string>>(new Set(['Content', 'Types']))

const toggleSection = (label: string) => {
  if (expandedSections.value.has(label)) {
    expandedSections.value.delete(label)
  }
  else {
    expandedSections.value.add(label)
  }
}

// Build navigation sections dynamically
const navigationSections = computed<NavSection[]>(() => {
  const sections: NavSection[] = []

  // Pages section
  sections.push({
    label: 'Pages',
    items: [
      {
        label: 'All Pages',
        icon: 'i-heroicons-document-duplicate',
        to: '/admin/pages',
        active: route.path.startsWith('/admin/pages'),
      },
    ],
  })

  // Content section
  const contentItems: NavItem[] = [
    {
      label: 'Menus',
      icon: 'i-heroicons-bars-3',
      to: '/admin/menus',
      active: route.path.startsWith('/admin/menus'),
    },
  ]
  if (contentTypes.value.length > 0) {
    for (const ct of contentTypes.value) {
      contentItems.push({
        label: ct.displayName,
        icon: ct.icon || 'i-heroicons-document',
        to: `/admin/content/${ct.pluralName}`,
        active: route.path.startsWith(`/admin/content/${ct.pluralName}`),
      })
    }
  }
  else {
    contentItems.push({
      label: 'No content types yet',
      icon: 'i-heroicons-inbox',
      disabled: true,
    })
  }
  sections.push({
    label: 'Content',
    items: contentItems,
    collapsible: true,
    defaultOpen: true,
  })

  // Assets section
  sections.push({
    label: 'Assets',
    items: [
      {
        label: 'Media Library',
        icon: 'i-heroicons-photo',
        to: '/admin/media',
        active: route.path === '/admin/media',
      },
    ],
  })

  // Types section (collapsible)
  sections.push({
    label: 'Types',
    items: [
      {
        label: 'Content Types',
        icon: 'i-heroicons-cube',
        to: '/admin/types',
        active: route.path.startsWith('/admin/types') && !route.path.startsWith('/admin/types/blocks') && !route.path.startsWith('/admin/types/pages'),
      },
      {
        label: 'Block Types',
        icon: 'i-heroicons-squares-2x2',
        to: '/admin/types/blocks',
        active: route.path.startsWith('/admin/types/blocks'),
      },
      {
        label: 'Page Types',
        icon: 'i-heroicons-document-duplicate',
        to: '/admin/types/pages',
        active: route.path.startsWith('/admin/types/pages'),
      },
      {
        label: 'API Tokens',
        icon: 'i-heroicons-key',
        to: '/admin/settings/tokens',
        active: route.path === '/admin/settings/tokens',
      },
    ],
    collapsible: true,
    defaultOpen: true,
  })

  // System section
  sections.push({
    label: 'System',
    items: [
      {
        label: 'Users & Roles',
        icon: 'i-heroicons-users',
        to: '/admin/settings/users',
        active: route.path === '/admin/settings/users',
      },
      {
        label: 'Webhooks',
        icon: 'i-heroicons-bolt',
        to: '/admin/settings/webhooks',
        active: route.path === '/admin/settings/webhooks',
      },
      {
        label: 'Settings',
        icon: 'i-heroicons-cog-6-tooth',
        to: '/admin/settings',
        active: route.path === '/admin/settings' && !route.path.includes('/settings/'),
      },
    ],
  })

  return sections
})

// Check if a section has an active item
const isSectionActive = (section: NavSection) => {
  return section.items.some(item => item.active)
}

// Initialize expanded sections with sections that have active items
onMounted(() => {
  navigationSections.value.forEach((section) => {
    if (section.collapsible && isSectionActive(section)) {
      expandedSections.value.add(section.label)
    }
  })
})
</script>

<template>
  <aside class="w-60 inset-y-0 left-0 fixed z-40 flex flex-col bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 shadow-[1px_0_3px_rgba(0,0,0,0.02)] dark:shadow-[1px_0_3px_rgba(0,0,0,0.1)]">
    <!-- Logo -->
    <div class="h-14 shrink-0 flex items-center justify-center border-b border-stone-200 dark:border-stone-800">
      <NuxtLink to="/admin" class="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80">
        <UIcon name="i-heroicons-cube-transparent" class="text-amber-600 dark:text-amber-500 text-xl" />
        <span class="font-bold text-lg tracking-tight text-stone-900 dark:text-stone-100">Publisher</span>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4">
      <ul class="space-y-1">
        <li v-for="section in navigationSections" :key="section.label">
          <!-- Section Label -->
          <button
            v-if="section.collapsible"
            type="button"
            class="w-full flex items-center justify-between px-3 pt-6 pb-2 first:pt-2 text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500 hover:text-stone-500 dark:hover:text-stone-400 transition-colors duration-150"
            @click="toggleSection(section.label)"
          >
            <span>{{ section.label }}</span>
            <UIcon
              :name="expandedSections.has(section.label) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              class="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 transition-transform duration-150"
              :class="{ 'rotate-0': expandedSections.has(section.label) }"
            />
          </button>
          <div
            v-else
            class="px-3 pt-6 pb-2 first:pt-2 text-[11px] font-medium uppercase tracking-wider text-stone-400 dark:text-stone-500"
          >
            {{ section.label }}
          </div>

          <!-- Section Items -->
          <ul
            v-show="!section.collapsible || expandedSections.has(section.label)"
            class="space-y-0.5 px-2"
            :class="{ 'overflow-hidden': section.collapsible }"
          >
            <li v-for="item in section.items" :key="item.label">
              <NuxtLink
                v-if="item.to"
                :to="item.to"
                :class="[
                  'group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                  item.active
                    ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 font-medium border-l-[3px] border-amber-500 -ml-[3px] pl-[calc(0.75rem+3px)]'
                    : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100',
                  item.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                ]"
              >
                <UIcon
                  :name="item.icon || 'i-heroicons-document'"
                  class="w-5 h-5 shrink-0 transition-colors duration-150"
                  :class="item.active
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-stone-400 dark:text-stone-500 group-hover:text-stone-500 dark:group-hover:text-stone-400'"
                />
                <span class="truncate">{{ item.label }}</span>
              </NuxtLink>
              <span
                v-else
                :class="[
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm',
                  item.disabled ? 'text-stone-400 dark:text-stone-500 cursor-not-allowed' : ''
                ]"
              >
                <UIcon
                  :name="item.icon || 'i-heroicons-document'"
                  class="w-5 h-5 shrink-0 text-stone-400 dark:text-stone-500"
                />
                <span class="truncate">{{ item.label }}</span>
              </span>
            </li>
          </ul>
        </li>
      </ul>
    </nav>

    <!-- Version -->
    <div class="shrink-0 px-5 py-3 border-t border-stone-200 dark:border-stone-800">
      <p class="text-xs text-stone-400 dark:text-stone-500 text-center">Publisher v0.1.0</p>
    </div>
  </aside>
</template>
