<script setup lang="ts">
import type { MenuItemType } from '~/lib/publisher/types'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MenuItem {
  id: number
  label: string
  type: MenuItemType
  url?: string | null
  pageId?: number | null
  target?: '_blank' | '_self' | null
  icon?: string | null
  cssClass?: string | null
  visible?: boolean
  metadata?: Record<string, unknown> | null
  parentId?: number | null
  sortOrder?: number
  children?: MenuItem[]
}

interface MenuApiResponse {
  menu: {
    id: number
    name: string
    slug: string
    description: string | null
    location: string | null
    createdAt: string
    updatedAt: string
  }
  items: MenuItem[]
}

// ─── Route & State ─────────────────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()
const toast = useToast()
const menuId = computed(() => route.params.id as string)

// Modal states
const isFormOpen = ref(false)
const showDeleteModal = ref(false)
const editingItem = ref<MenuItem | null>(null)
const deleteTarget = ref<MenuItem | null>(null)
const parentItemForNew = ref<MenuItem | null>(null)
const isSubmitting = ref(false)

// ─── Fetch Menu Data ────────────────────────────────────────────────────────────

const { data: menuData, refresh, status, error } = await useFetch<{ data: MenuApiResponse }>(computed(() => `/api/publisher/menus/${menuId.value}`))

const menu = computed(() => menuData.value?.data?.menu)
const isLoading = computed(() => status.value === 'pending')

// Build tree from flat items list
function buildMenuTree(flatItems: MenuItem[]): MenuItem[] {
  const itemMap = new Map<number, MenuItem>()
  const roots: MenuItem[] = []

  // First pass: create a map and initialize children arrays
  for (const item of flatItems) {
    itemMap.set(item.id, { ...item, children: [] })
  }

  // Second pass: build parent-child relationships
  for (const item of flatItems) {
    const node = itemMap.get(item.id)!
    if (item.parentId && itemMap.has(item.parentId)) {
      itemMap.get(item.parentId)!.children!.push(node)
    }
    else {
      roots.push(node)
    }
  }

  // Sort children by sortOrder
  for (const item of itemMap.values()) {
    item.children?.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  }

  // Sort roots by sortOrder
  roots.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))

  return roots
}

// Writable ref so SortableArea can update order immediately via v-model
const menuItems = ref<MenuItem[]>([])

// Sync with server data
watch(() => menuData.value?.data?.items, (newItems) => {
  menuItems.value = buildMenuTree(newItems || [])
}, { immediate: true })

// ─── Location Badge Colors ──────────────────────────────────────────────────────

function getLocationClass(location: string | null): string {
  if (!location) return 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'

  const colors: Record<string, string> = {
    header: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300',
    footer: 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300',
    sidebar: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300',
    main: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300',
  }
  return colors[location] || 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
}

// ─── Form Modal Handlers ───────────────────────────────────────────────────────

function openCreateModal(parentItem?: MenuItem) {
  editingItem.value = null
  parentItemForNew.value = parentItem || null
  isFormOpen.value = true
}

function openEditModal(item: MenuItem) {
  editingItem.value = item
  parentItemForNew.value = null
  isFormOpen.value = true
}

function closeFormModal() {
  isFormOpen.value = false
  editingItem.value = null
  parentItemForNew.value = null
}

// ─── Delete Modal Handlers ─────────────────────────────────────────────────────

function openDeleteModal(item: MenuItem) {
  deleteTarget.value = item
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteTarget.value = null
}

// ─── CRUD Operations ────────────────────────────────────────────────────────────

async function handleFormSubmit(payload: Record<string, unknown>) {
  isSubmitting.value = true

  try {
    // Add parentId if creating a child item
    if (!editingItem.value && parentItemForNew.value) {
      payload.parentId = parentItemForNew.value.id
    }

    if (editingItem.value) {
      // Update existing item
      await $fetch(`/api/publisher/menus/${menuId.value}/items/${editingItem.value.id}`, {
        method: 'PUT',
        body: payload,
      })
      toast.add({ title: 'Menu item updated', color: 'success' })
    }
    else {
      // Create new item
      await $fetch(`/api/publisher/menus/${menuId.value}/items`, {
        method: 'POST',
        body: payload,
      })
      toast.add({ title: 'Menu item created', color: 'success' })
    }

    closeFormModal()
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast.add({
      title: err?.data?.data?.error?.message || 'Failed to save menu item',
      color: 'error',
    })
  }
  finally {
    isSubmitting.value = false
  }
}

async function deleteItem() {
  if (!deleteTarget.value) return

  isSubmitting.value = true

  try {
    await $fetch(`/api/publisher/menus/${menuId.value}/items/${deleteTarget.value.id}`, {
      method: 'DELETE',
    })
    toast.add({ title: 'Menu item deleted', color: 'success' })
    closeDeleteModal()
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast.add({
      title: err?.data?.data?.error?.message || 'Failed to delete menu item',
      color: 'error',
    })
  }
  finally {
    isSubmitting.value = false
  }
}

// ─── Event Handlers from MenuItemRenderer ──────────────────────────────────────

function handleItemEdit(item: MenuItem) {
  openEditModal(item)
}

function handleItemDelete(item: MenuItem) {
  openDeleteModal(item)
}

function handleAddChild(parentItem: MenuItem) {
  openCreateModal(parentItem)
}

async function handleReorder(orderedIds: number[]) {
  try {
    const reorderPayload = orderedIds.map((id, index) => ({
      id,
      sortOrder: index,
    }))

    await $fetch(`/api/publisher/menus/${menuId.value}/items/reorder`, {
      method: 'PATCH',
      body: { items: reorderPayload },
    })

    await refresh()
    toast.add({ title: 'Menu items reordered', color: 'success' })
  } catch (e: unknown) {
    // Revert to server state on error
    menuItems.value = buildMenuTree(menuData.value?.data?.items || [])
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast.add({
      title: err?.data?.data?.error?.message || 'Failed to reorder items',
      color: 'error',
    })
  }
}

// ─── Helper Functions ──────────────────────────────────────────────────────────

function findItemById(items: MenuItem[], id: number): MenuItem | null {
  for (const item of items) {
    if (item.id === id) return item
    if (item.children && item.children.length > 0) {
      const found = findItemById(item.children, id)
      if (found) return found
    }
  }
  return null
}

// ─── Navigation ────────────────────────────────────────────────────────────────

function goBack() {
  router.push('/admin/menus')
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <UIcon name="i-heroicons-arrow-path" class="text-3xl animate-spin text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">Loading menu...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !menu" class="flex items-center justify-center py-20">
      <div class="text-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-3xl text-red-500 dark:text-red-400 mb-3" />
        <p class="text-stone-500 dark:text-stone-400 mb-4">
          {{ error?.message || 'Menu not found' }}
        </p>
        <UButton color="neutral" @click="goBack">
          Back to Menus
        </UButton>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400 mb-4">
        <NuxtLink to="/admin" class="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
          Admin
        </NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        <NuxtLink to="/admin/menus" class="hover:text-stone-700 dark:hover:text-stone-300 transition-colors">
          Menus
        </NuxtLink>
        <UIcon name="i-heroicons-chevron-right" class="w-4 h-4" />
        <span class="text-stone-700 dark:text-stone-300 font-medium">{{ menu.name }}</span>
      </div>

      <!-- Header Section -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
              {{ menu.name }}
            </h2>
            <span
              v-if="menu.location"
              class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
              :class="getLocationClass(menu.location)"
            >
              {{ menu.location }}
            </span>
          </div>
          <p v-if="menu.description" class="text-sm text-stone-500 dark:text-stone-400">
            {{ menu.description }}
          </p>
          <div class="flex items-center gap-4 mt-2 text-xs text-stone-400 dark:text-stone-500">
            <span>Slug: <code class="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded font-mono">{{ menu.slug }}</code></span>
            <span>{{ menuItems.length }} {{ menuItems.length === 1 ? 'item' : 'items' }}</span>
          </div>
        </div>

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          @click="goBack"
        >
          Back to Menus
        </UButton>
      </div>

      <!-- Actions Bar -->
      <div class="flex items-center justify-between mb-4 pb-4 border-b border-stone-200 dark:border-stone-800">
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Manage the items in this menu. Drag to reorder items.
        </p>
        <UButton
          icon="i-heroicons-plus"
          color="neutral"
          @click="openCreateModal()"
        >
          Add Menu Item
        </UButton>
      </div>

      <!-- Menu Items List -->
      <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <!-- Items rendered using MenuItemRenderer -->
        <template v-if="menuItems.length > 0">
          <ClientOnly>
            <PublisherSortableArea
              v-model="menuItems"
              :disabled="menuItems.length <= 1"
              handle=".drag-handle"
              group="menu-items"
              @reorder="handleReorder"
            >
              <PublisherMenuItemRenderer
                v-for="item in menuItems"
                :key="item.id"
                :item="item"
                :depth="0"
                @edit="handleItemEdit"
                @delete="handleItemDelete"
                @add-child="handleAddChild"
              />
            </PublisherSortableArea>
            <template #fallback>
              <div class="divide-y divide-stone-100 dark:divide-stone-800">
                <PublisherMenuItemRenderer
                  v-for="item in menuItems"
                  :key="item.id"
                  :item="item"
                  :depth="0"
                  @edit="handleItemEdit"
                  @delete="handleItemDelete"
                  @add-child="handleAddChild"
                />
              </div>
            </template>
          </ClientOnly>
        </template>

        <!-- Empty State -->
        <div v-else class="text-center py-12">
          <UIcon name="i-heroicons-bars-3" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
          <p class="text-stone-500 dark:text-stone-400">No menu items yet.</p>
          <p class="text-sm text-stone-400 dark:text-stone-500 mt-1">Add your first menu item to get started.</p>
          <UButton
            variant="soft"
            color="neutral"
            icon="i-heroicons-plus"
            class="mt-4"
            @click="openCreateModal()"
          >
            Add First Item
          </UButton>
        </div>
      </div>
    </template>

    <!-- Menu Item Form Modal -->
    <UModal v-model:open="isFormOpen" @close="closeFormModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
              {{ editingItem ? 'Edit Menu Item' : parentItemForNew ? `Add Child to "${parentItemForNew.label}"` : 'Add Menu Item' }}
            </h3>
          </div>

          <PublisherMenuItemForm
            v-if="isFormOpen"
            :menu-id="menu!.id"
            :item="editingItem || undefined"
            :on-submit="handleFormSubmit"
            :on-cancel="closeFormModal"
          />
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal" @close="closeDeleteModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-3 mb-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="text-xl text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Delete Menu Item
              </h3>
              <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Are you sure you want to delete <span class="font-medium text-stone-700 dark:text-stone-300">{{ deleteTarget?.label }}</span>?
              </p>
            </div>
          </div>

          <UAlert
            v-if="deleteTarget?.children && deleteTarget.children.length > 0"
            color="warning"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            class="mb-4"
          >
            <template #title>
              This item has child items
            </template>
            <template #description>
              All {{ deleteTarget.children.length }} child item(s) will also be deleted.
            </template>
          </UAlert>

          <UAlert
            v-else
            color="warning"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            class="mb-4"
          >
            <template #title>
              This action cannot be undone
            </template>
          </UAlert>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="closeDeleteModal">
              Cancel
            </UButton>
            <UButton color="error" :loading="isSubmitting" @click="deleteItem">
              Delete Item
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
