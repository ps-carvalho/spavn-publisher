<script setup lang="ts">
import { z } from 'zod'
import { Plus, Settings, Trash2, Menu, AlertTriangle } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Textarea } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { Alert, AlertTitle, AlertDescription } from '@spavn/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spavn/ui'
import { useToast } from '@spavn/ui'

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

const { toast } = useToast()
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
    toast({ title: 'Menu created' })
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast({ title: err?.data?.data?.error?.message || 'Failed to create menu', variant: 'destructive' })
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
    toast({ title: 'Menu deleted' })
  }
  catch (e: unknown) {
    const err = e as { data?: { data?: { error?: { message?: string } } } }
    toast({ title: err?.data?.data?.error?.message || 'Failed to delete menu', variant: 'destructive' })
  }
  finally {
    isSubmitting.value = false
  }
}

// Get location badge color
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
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Menus</h2>
      <Button variant="outline" @click="showCreateModal = true">
        <Plus class="h-4 w-4 mr-2" />
        New Menu
      </Button>
    </div>

    <p class="text-sm text-[hsl(var(--muted-foreground))] mb-4">
      Manage navigation menus for your site
    </p>

    <!-- Menus table -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Location</TableHead>
            <TableHead class="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell colspan="5" class="text-center py-8 text-[hsl(var(--muted-foreground))]">Loading...</TableCell>
          </TableRow>
          <TableRow v-for="row in menus" :key="row.id">
            <TableCell>
              <NuxtLink
                :to="`/admin/menus/${row.id}`"
                class="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              >
                {{ row.name }}
              </NuxtLink>
              <p v-if="row.description" class="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 truncate max-w-xs">
                {{ row.description }}
              </p>
            </TableCell>
            <TableCell>
              <code class="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                {{ row.slug }}
              </code>
            </TableCell>
            <TableCell class="text-sm text-[hsl(var(--muted-foreground))]">
              {{ row.itemCount }} {{ row.itemCount === 1 ? 'item' : 'items' }}
            </TableCell>
            <TableCell>
              <span
                v-if="row.location"
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize"
                :class="getLocationClass(row.location)"
              >
                {{ row.location }}
              </span>
              <span v-else class="text-[hsl(var(--muted-foreground))] text-sm">--</span>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Button size="sm" variant="ghost" as-child title="Edit menu items">
                  <NuxtLink :to="`/admin/menus/${row.id}`">
                    <Settings class="h-4 w-4" />
                  </NuxtLink>
                </Button>
                <Button size="sm" variant="ghost" title="Delete menu" @click="openDeleteModal(row)">
                  <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Empty state -->
      <div v-if="menus.length === 0 && status !== 'pending'" class="text-center py-12">
        <Menu class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No menus created yet.</p>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">Create a menu to manage navigation links.</p>
        <Button
          variant="outline"
          class="mt-4"
          @click="showCreateModal = true"
        >
          <Plus class="h-4 w-4 mr-2" />
          Create your first menu
        </Button>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog v-model:open="showCreateModal" @close="closeCreateModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Menu</DialogTitle>
        </DialogHeader>
        <form @submit.prevent="createMenu" class="space-y-4">
          <div class="space-y-2">
            <Label>Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              v-model="createForm.name"
              placeholder="e.g., Main Navigation"
              class="w-full"
              @blur="generateSlug"
            />
            <p v-if="formErrors.name" class="text-xs text-[hsl(var(--destructive))]">{{ formErrors.name }}</p>
          </div>

          <div class="space-y-2">
            <Label>Display Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              v-model="createForm.displayName"
              placeholder="e.g., Main Navigation"
              class="w-full"
            />
            <p v-if="formErrors.displayName" class="text-xs text-[hsl(var(--destructive))]">{{ formErrors.displayName }}</p>
          </div>

          <div class="space-y-2">
            <Label>Slug <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              v-model="createForm.slug"
              placeholder="e.g., main-navigation"
              class="w-full"
            />
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Used in API calls and templates</p>
            <p v-if="formErrors.slug" class="text-xs text-[hsl(var(--destructive))]">{{ formErrors.slug }}</p>
          </div>

          <div class="space-y-2">
            <Label>Description</Label>
            <Textarea
              v-model="createForm.description"
              placeholder="Brief description of this menu's purpose"
              :rows="3"
              class="w-full"
            />
            <p v-if="formErrors.description" class="text-xs text-[hsl(var(--destructive))]">{{ formErrors.description }}</p>
          </div>

          <div class="space-y-2">
            <Label>Location</Label>
            <Select v-model="createForm.location">
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in locationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Where this menu appears on the site</p>
            <p v-if="formErrors.location" class="text-xs text-[hsl(var(--destructive))]">{{ formErrors.location }}</p>
          </div>

          <DialogFooter>
            <Button variant="ghost" @click="closeCreateModal">
              Cancel
            </Button>
            <Button
              type="submit"
              :disabled="isSubmitting || !createForm.name || !createForm.displayName || !createForm.slug"
            >
              Create Menu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Modal -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Menu</DialogTitle>
        </DialogHeader>
        <div class="flex items-start gap-3 mb-4">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--destructive))]/10 shrink-0">
            <AlertTriangle class="h-5 w-5 text-[hsl(var(--destructive))]" />
          </div>
          <p class="text-sm text-[hsl(var(--muted-foreground))]">
            Are you sure you want to delete <span class="font-medium text-[hsl(var(--foreground))]">{{ selectedMenu?.name }}</span>?
          </p>
        </div>

        <Alert variant="destructive" class="mb-4">
          <AlertTriangle class="h-4 w-4" />
          <AlertTitle>This action cannot be undone</AlertTitle>
          <AlertDescription>
            All {{ selectedMenu?.itemCount || 0 }} menu items will be permanently deleted along with this menu.
          </AlertDescription>
        </Alert>

        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">
            Cancel
          </Button>
          <Button variant="destructive" :disabled="isSubmitting" @click="deleteMenu">
            Delete Menu
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
