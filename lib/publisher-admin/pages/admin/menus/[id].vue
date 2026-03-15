<script setup lang="ts">
import type { MenuItemType } from '~/lib/publisher/types'
import { ArrowLeft, RefreshCw, AlertTriangle, Plus, Menu, ChevronRight } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Alert, AlertTitle, AlertDescription } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

// --- Types ---

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

// --- Route & State ---

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const menuId = computed(() => route.params.id as string)

// Modal states
const isFormOpen = ref(false)
const showDeleteModal = ref(false)
const editingItem = ref<MenuItem | null>(null)
const deleteTarget = ref<MenuItem | null>(null)
const parentItemForNew = ref<MenuItem | null>(null)
const isSubmitting = ref(false)

// --- Fetch Menu Data ---

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

// --- Location Badge Colors ---

function getLocationClass(location: string | null): string {
  if (!location) return 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'

  const colors: Record<string, string> = {
    header: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
    footer: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
    sidebar: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
    main: 'bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]',
  }
  return colors[location] || 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]'
}

// --- Form Modal Handlers ---

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

// --- Delete Modal Handlers ---

function openDeleteModal(item: MenuItem) {
  deleteTarget.value = item
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  deleteTarget.value = null
}

// --- CRUD Operations ---

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
      toast({ title: 'Menu item updated' })
    }
    else {
      // Create new item
      await $fetch(`/api/publisher/menus/${menuId.value}/items`, {
        method: 'POST',
        body: payload,
      })
      toast({ title: 'Menu item created' })
    }

    closeFormModal()
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast({
      title: err?.data?.data?.error?.message || 'Failed to save menu item',
      variant: 'destructive',
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
    toast({ title: 'Menu item deleted' })
    closeDeleteModal()
    await refresh()
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast({
      title: err?.data?.data?.error?.message || 'Failed to delete menu item',
      variant: 'destructive',
    })
  }
  finally {
    isSubmitting.value = false
  }
}

// --- Event Handlers from MenuItemRenderer ---

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
    toast({ title: 'Menu items reordered' })
  } catch (e: unknown) {
    // Revert to server state on error
    menuItems.value = buildMenuTree(menuData.value?.data?.items || [])
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast({
      title: err?.data?.data?.error?.message || 'Failed to reorder items',
      variant: 'destructive',
    })
  }
}

// --- Helper Functions ---

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

// --- Navigation ---

function goBack() {
  router.push('/admin/menus')
}
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="text-center">
        <RefreshCw class="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">Loading menu...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error || !menu" class="flex items-center justify-center py-20">
      <div class="text-center">
        <AlertTriangle class="h-8 w-8 text-[hsl(var(--destructive))] mx-auto mb-3" />
        <p class="text-[hsl(var(--muted-foreground))] mb-4">
          {{ error?.message || 'Menu not found' }}
        </p>
        <Button variant="outline" @click="goBack">
          Back to Menus
        </Button>
      </div>
    </div>

    <!-- Main Content -->
    <template v-else>
      <!-- Breadcrumb -->
      <div class="flex items-center gap-2 text-sm text-[hsl(var(--muted-foreground))] mb-4">
        <NuxtLink to="/admin" class="hover:text-[hsl(var(--foreground))] transition-colors">
          Admin
        </NuxtLink>
        <ChevronRight class="w-4 h-4" />
        <NuxtLink to="/admin/menus" class="hover:text-[hsl(var(--foreground))] transition-colors">
          Menus
        </NuxtLink>
        <ChevronRight class="w-4 h-4" />
        <span class="text-[hsl(var(--foreground))] font-medium">{{ menu.name }}</span>
      </div>

      <!-- Header Section -->
      <div class="flex items-start justify-between mb-6">
        <div>
          <div class="flex items-center gap-3 mb-2">
            <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
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
          <p v-if="menu.description" class="text-sm text-[hsl(var(--muted-foreground))]">
            {{ menu.description }}
          </p>
          <div class="flex items-center gap-4 mt-2 text-xs text-[hsl(var(--muted-foreground))]">
            <span>Slug: <code class="bg-[hsl(var(--muted))] px-1.5 py-0.5 rounded font-mono">{{ menu.slug }}</code></span>
            <span>{{ menuItems.length }} {{ menuItems.length === 1 ? 'item' : 'items' }}</span>
          </div>
        </div>

        <Button variant="ghost" @click="goBack">
          <ArrowLeft class="h-4 w-4 mr-2" />
          Back to Menus
        </Button>
      </div>

      <!-- Actions Bar -->
      <div class="flex items-center justify-between mb-4 pb-4 border-b border-[hsl(var(--border))]">
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Manage the items in this menu. Drag to reorder items.
        </p>
        <Button variant="outline" @click="openCreateModal()">
          <Plus class="h-4 w-4 mr-2" />
          Add Menu Item
        </Button>
      </div>

      <!-- Menu Items List -->
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden">
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
              <div class="divide-y divide-[hsl(var(--border))]">
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
          <Menu class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
          <p class="text-[hsl(var(--muted-foreground))]">No menu items yet.</p>
          <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">Add your first menu item to get started.</p>
          <Button
            variant="outline"
            class="mt-4"
            @click="openCreateModal()"
          >
            <Plus class="h-4 w-4 mr-2" />
            Add First Item
          </Button>
        </div>
      </div>
    </template>

    <!-- Menu Item Form Modal -->
    <Dialog v-model:open="isFormOpen" @close="closeFormModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {{ editingItem ? 'Edit Menu Item' : parentItemForNew ? `Add Child to "${parentItemForNew.label}"` : 'Add Menu Item' }}
          </DialogTitle>
        </DialogHeader>

        <PublisherMenuItemForm
          v-if="isFormOpen"
          :menu-id="menu!.id"
          :item="editingItem || undefined"
          :on-submit="handleFormSubmit"
          :on-cancel="closeFormModal"
        />
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Modal -->
    <Dialog v-model:open="showDeleteModal" @close="closeDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Menu Item</DialogTitle>
        </DialogHeader>
        <div class="flex items-start gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--destructive))]/10 shrink-0">
            <AlertTriangle class="h-5 w-5 text-[hsl(var(--destructive))]" />
          </div>
          <p class="text-sm text-[hsl(var(--muted-foreground))]">
            Are you sure you want to delete <span class="font-medium text-[hsl(var(--foreground))]">{{ deleteTarget?.label }}</span>?
          </p>
        </div>

        <Alert
          v-if="deleteTarget?.children && deleteTarget.children.length > 0"
          variant="destructive"
          class="mb-4"
        >
          <AlertTriangle class="h-4 w-4" />
          <AlertTitle>This item has child items</AlertTitle>
          <AlertDescription>
            All {{ deleteTarget.children.length }} child item(s) will also be deleted.
          </AlertDescription>
        </Alert>

        <Alert
          v-else
          variant="destructive"
          class="mb-4"
        >
          <AlertTriangle class="h-4 w-4" />
          <AlertTitle>This action cannot be undone</AlertTitle>
        </Alert>

        <DialogFooter>
          <Button variant="ghost" @click="closeDeleteModal">
            Cancel
          </Button>
          <Button variant="destructive" :disabled="isSubmitting" @click="deleteItem">
            Delete Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
