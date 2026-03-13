<script setup lang="ts">
import { z } from 'zod'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface MenuListItem {
  id: number
  name: string
  slug: string
  description: string | null
  location: string | null
  createdAt: string
  itemCount: number
}

const toast = useToast()
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const selectedMenu = ref<MenuListItem | null>(null)
const isSubmitting = ref(false)
const formErrors = ref<Record<string, string>>({})

// Create form
const createForm = reactive({
  name: '',
  displayName: '',
  slug: '',
  description: '',
  location: '',
})

// Validation schema
const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be 100 characters or less'),
  displayName: z.string().min(1, 'Display name is required').max(255, 'Display name must be 255 characters or less'),
  slug: z
    .string()
    .min(1, 'Slug is required')
    .max(100, 'Slug must be 100 characters or less')
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  location: z.string().max(100, 'Location must be 100 characters or less').optional(),
})

// Location options
const locationOptions = [
  { label: 'Header', value: 'header' },
  { label: 'Footer', value: 'footer' },
  { label: 'Sidebar', value: 'sidebar' },
  { label: 'Main', value: 'main' },
  { label: 'Custom', value: 'custom' },
]

// Fetch menus
const { data, refresh, status } = await useFetch<{ data: MenuListItem[] }>('/api/publisher/menus')
const menus = computed(() => data.value?.data || [])

// Table columns
const columns = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'slug', header: 'Slug' },
  { accessorKey: 'itemCount', header: 'Items' },
  { accessorKey: 'location', header: 'Location' },
  { id: 'actions', header: '' },
]

// Reset form
function resetForm() {
  createForm.name = ''
  createForm.displayName = ''
  createForm.slug = ''
  createForm.description = ''
  createForm.location = ''
  formErrors.value = {}
}

// Generate slug from name
function generateSlug() {
  if (!createForm.name) return
  createForm.slug = createForm.name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Validate form
function validateForm(): boolean {
  formErrors.value = {}
  const result = createSchema.safeParse(createForm)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string
      formErrors.value[field] = issue.message
    }
    return false
  }
  return true
}

// Create menu
async function createMenu() {
  if (!validateForm()) return

  isSubmitting.value = true
  try {
    await $fetch('/api/publisher/menus', {
      method: 'POST',
      body: {
        name: createForm.name,
        displayName: createForm.displayName,
        slug: createForm.slug,
        description: createForm.description || undefined,
        location: createForm.location || undefined,
      },
    })
    showCreateModal.value = false
    resetForm()
    await refresh()
    toast.add({ title: 'Menu created', color: 'success' })
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast.add({ title: err?.data?.data?.error?.message || 'Failed to create menu', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

// Close create modal
function closeCreateModal() {
  showCreateModal.value = false
  resetForm()
}

// Open delete modal
function openDeleteModal(menu: MenuListItem) {
  selectedMenu.value = menu
  showDeleteModal.value = true
}

// Delete menu
async function deleteMenu() {
  if (!selectedMenu.value) return

  isSubmitting.value = true
  try {
    await $fetch(`/api/publisher/menus/${selectedMenu.value.id}`, {
      method: 'DELETE',
    })
    showDeleteModal.value = false
    selectedMenu.value = null
    await refresh()
    toast.add({ title: 'Menu deleted', color: 'success' })
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast.add({ title: err?.data?.data?.error?.message || 'Failed to delete menu', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

// Get location badge color
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
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Menus</h2>
      <UButton icon="i-heroicons-plus" color="neutral" @click="showCreateModal = true">
        New Menu
      </UButton>
    </div>

    <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">
      Manage navigation menus for your site
    </p>

    <!-- Menus table -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <UTable :data="menus" :columns="columns" :loading="status === 'pending'">
        <template #name-cell="{ row }">
          <NuxtLink
            :to="`/admin/menus/${row.original.id}`"
            class="font-medium text-stone-900 dark:text-stone-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {{ row.original.name }}
          </NuxtLink>
          <p v-if="row.original.description" class="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate max-w-xs">
            {{ row.original.description }}
          </p>
        </template>

        <template #slug-cell="{ row }">
          <code class="text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono">
            {{ row.original.slug }}
          </code>
        </template>

        <template #itemCount-cell="{ row }">
          <span class="text-sm text-stone-600 dark:text-stone-400">
            {{ row.original.itemCount }} {{ row.original.itemCount === 1 ? 'item' : 'items' }}
          </span>
        </template>

        <template #location-cell="{ row }">
          <span
            v-if="row.original.location"
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
            :class="getLocationClass(row.original.location)"
          >
            {{ row.original.location }}
          </span>
          <span v-else class="text-stone-400 dark:text-stone-500 text-sm">—</span>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UTooltip text="Edit menu items">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-cog-6-tooth"
                :to="`/admin/menus/${row.original.id}`"
              />
            </UTooltip>
            <UTooltip text="Delete menu">
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                @click="openDeleteModal(row.original)"
              />
            </UTooltip>
          </div>
        </template>
      </UTable>

      <!-- Empty state -->
      <div v-if="menus.length === 0 && status !== 'pending'" class="text-center py-12">
        <UIcon name="i-heroicons-bars-3" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">No menus created yet.</p>
        <p class="text-sm text-stone-400 dark:text-stone-500 mt-1">Create a menu to manage navigation links.</p>
        <UButton
          variant="soft"
          color="neutral"
          icon="i-heroicons-plus"
          class="mt-4"
          @click="showCreateModal = true"
        >
          Create your first menu
        </UButton>
      </div>
    </div>

    <!-- Create Modal -->
    <UModal v-model:open="showCreateModal" @close="closeCreateModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
            Create Menu
          </h3>
          <form @submit.prevent="createMenu" class="space-y-4">
            <UFormField label="Name" required :error="formErrors.name">
              <UInput
                v-model="createForm.name"
                placeholder="e.g., Main Navigation"
                class="w-full"
                @blur="generateSlug"
              />
            </UFormField>

            <UFormField label="Display Name" required :error="formErrors.displayName">
              <UInput
                v-model="createForm.displayName"
                placeholder="e.g., Main Navigation"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Slug" required :error="formErrors.slug">
              <UInput
                v-model="createForm.slug"
                placeholder="e.g., main-navigation"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs text-stone-400">Used in API calls and templates</span>
              </template>
            </UFormField>

            <UFormField label="Description" :error="formErrors.description">
              <UTextarea
                v-model="createForm.description"
                placeholder="Brief description of this menu's purpose"
                :rows="2"
                class="w-full"
              />
            </UFormField>

            <UFormField label="Location" :error="formErrors.location">
              <USelectMenu
                v-model="createForm.location"
                :items="locationOptions"
                value-key="value"
                placeholder="Select location"
                class="w-full"
              />
              <template #hint>
                <span class="text-xs text-stone-400">Where this menu appears on the site</span>
              </template>
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton variant="ghost" color="neutral" @click="closeCreateModal">
                Cancel
              </UButton>
              <UButton
                type="submit"
                color="neutral"
                :loading="isSubmitting"
                :disabled="!createForm.name || !createForm.displayName || !createForm.slug"
              >
                Create Menu
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-start gap-3 mb-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20 shrink-0">
              <UIcon name="i-heroicons-exclamation-triangle" class="text-xl text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
                Delete Menu
              </h3>
              <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
                Are you sure you want to delete <span class="font-medium text-stone-700 dark:text-stone-300">{{ selectedMenu?.name }}</span>?
              </p>
            </div>
          </div>

          <UAlert
            color="warning"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            class="mb-4"
          >
            <template #title>
              This action cannot be undone
            </template>
            <template #description>
              All {{ selectedMenu?.itemCount || 0 }} menu items will be permanently deleted along with this menu.
            </template>
          </UAlert>

          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">
              Cancel
            </UButton>
            <UButton color="error" :loading="isSubmitting" @click="deleteMenu">
              Delete Menu
            </UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
