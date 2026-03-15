<script setup lang="ts">
import type { Component } from 'vue'
import { Box, Copy, Menu, File, Inbox, Image, LayoutGrid, Key, Users, Zap, Settings, ChevronDown, ChevronRight } from 'lucide-vue-next'
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@spavn/ui'

const route = useRoute()

interface ContentTypeInfo {
  name: string
  displayName: string
  pluralName: string
  icon?: string
}

interface NavItem {
  label: string
  icon?: Component
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
        icon: Copy,
        to: '/admin/pages',
        active: route.path.startsWith('/admin/pages'),
      },
    ],
  })

  // Content section
  const contentItems: NavItem[] = [
    {
      label: 'Menus',
      icon: Menu,
      to: '/admin/menus',
      active: route.path.startsWith('/admin/menus'),
    },
  ]
  if (contentTypes.value.length > 0) {
    for (const ct of contentTypes.value) {
      contentItems.push({
        label: ct.displayName,
        icon: File,
        to: `/admin/content/${ct.pluralName}`,
        active: route.path.startsWith(`/admin/content/${ct.pluralName}`),
      })
    }
  }
  else {
    contentItems.push({
      label: 'No content types yet',
      icon: Inbox,
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
        icon: Image,
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
        icon: Box,
        to: '/admin/types',
        active: route.path.startsWith('/admin/types') && !route.path.startsWith('/admin/types/blocks') && !route.path.startsWith('/admin/types/pages'),
      },
      {
        label: 'Block Types',
        icon: LayoutGrid,
        to: '/admin/types/blocks',
        active: route.path.startsWith('/admin/types/blocks'),
      },
      {
        label: 'Page Types',
        icon: Copy,
        to: '/admin/types/pages',
        active: route.path.startsWith('/admin/types/pages'),
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
        icon: Users,
        to: '/admin/settings/users',
        active: route.path === '/admin/settings/users',
      },
      {
        label: 'API Tokens',
        icon: Key,
        to: '/admin/settings/tokens',
        active: route.path === '/admin/settings/tokens',
      },
      {
        label: 'Webhooks',
        icon: Zap,
        to: '/admin/settings/webhooks',
        active: route.path === '/admin/settings/webhooks',
      },
      {
        label: 'Settings',
        icon: Settings,
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
  <aside class="w-60 inset-y-0 left-0 fixed z-40 flex flex-col bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] shadow-[1px_0_3px_rgba(0,0,0,0.04)]">
    <!-- Logo -->
    <div class="h-14 shrink-0 flex items-center justify-center border-b border-[hsl(var(--border))]">
      <NuxtLink to="/admin" class="flex items-center gap-2.5 transition-opacity duration-150 hover:opacity-80">
        <Box class="w-5 h-5 text-[hsl(var(--foreground))]" />
        <span class="font-bold text-lg tracking-tight text-[hsl(var(--foreground))]">Publisher</span>
      </NuxtLink>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 overflow-y-auto py-4">
      <ul class="space-y-1">
        <li v-for="section in navigationSections" :key="section.label">
          <!-- Collapsible Section -->
          <template v-if="section.collapsible">
            <Collapsible :open="expandedSections.has(section.label)" @update:open="toggleSection(section.label)">
              <CollapsibleTrigger class="w-full flex items-center justify-between px-3 pt-6 pb-2 first:pt-2 text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors duration-150">
                <span>{{ section.label }}</span>
                <component
                  :is="expandedSections.has(section.label) ? ChevronDown : ChevronRight"
                  class="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] transition-transform duration-150"
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <ul class="space-y-0.5 px-2">
                  <li v-for="item in section.items" :key="item.label">
                    <NuxtLink
                      v-if="item.to"
                      :to="item.to"
                      :class="[
                        'group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                        item.active
                          ? 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] font-medium border-l-[3px] border-[hsl(var(--primary))] -ml-[3px] pl-[calc(0.75rem+3px)]'
                          : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]',
                        item.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                      ]"
                    >
                      <component
                        :is="item.icon || File"
                        class="w-5 h-5 shrink-0 transition-colors duration-150"
                        :class="item.active
                          ? 'text-[hsl(var(--foreground))]'
                          : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'"
                      />
                      <span class="truncate">{{ item.label }}</span>
                    </NuxtLink>
                    <span
                      v-else
                      :class="[
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm',
                        item.disabled ? 'text-[hsl(var(--muted-foreground))] cursor-not-allowed' : ''
                      ]"
                    >
                      <component
                        :is="item.icon || File"
                        class="w-5 h-5 shrink-0 text-[hsl(var(--muted-foreground))]"
                      />
                      <span class="truncate">{{ item.label }}</span>
                    </span>
                  </li>
                </ul>
              </CollapsibleContent>
            </Collapsible>
          </template>

          <!-- Non-collapsible Section -->
          <template v-else>
            <div class="px-3 pt-6 pb-2 first:pt-2 text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              {{ section.label }}
            </div>

            <ul class="space-y-0.5 px-2">
              <li v-for="item in section.items" :key="item.label">
                <NuxtLink
                  v-if="item.to"
                  :to="item.to"
                  :class="[
                    'group flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                    item.active
                      ? 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] font-medium border-l-[3px] border-[hsl(var(--primary))] -ml-[3px] pl-[calc(0.75rem+3px)]'
                      : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]',
                    item.disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
                  ]"
                >
                  <component
                    :is="item.icon || File"
                    class="w-5 h-5 shrink-0 transition-colors duration-150"
                    :class="item.active
                      ? 'text-[hsl(var(--foreground))]'
                      : 'text-[hsl(var(--muted-foreground))] group-hover:text-[hsl(var(--foreground))]'"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </NuxtLink>
                <span
                  v-else
                  :class="[
                    'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm',
                    item.disabled ? 'text-[hsl(var(--muted-foreground))] cursor-not-allowed' : ''
                  ]"
                >
                  <component
                    :is="item.icon || File"
                    class="w-5 h-5 shrink-0 text-[hsl(var(--muted-foreground))]"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </span>
              </li>
            </ul>
          </template>
        </li>
      </ul>
    </nav>

    <!-- Version -->
    <div class="shrink-0 px-5 py-3 border-t border-[hsl(var(--border))]">
      <p class="text-xs text-[hsl(var(--muted-foreground))] text-center">Publisher v0.1.0</p>
    </div>
  </aside>
</template>
