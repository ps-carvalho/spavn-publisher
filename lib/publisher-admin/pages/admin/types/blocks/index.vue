<script setup lang="ts">
import type { FieldConfig, BlockTypeConfig } from '~~/lib/publisher/types'
import { Plus, Pencil, Trash2, LayoutGrid, Search, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Textarea } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spavn/ui'
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface BlockTypeSummary {
  id?: number
  name: string
  displayName: string
  icon?: string
  category?: string
  description?: string
  fields: Record<string, FieldConfig>
  isSystem?: boolean
  active?: boolean
  createdAt?: string
}

const { toast } = useToast()
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedBlockType = ref<BlockTypeSummary | null>(null)
const isSubmitting = ref(false)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

// Form state
const form = ref({
  name: '',
  displayName: '',
  category: 'text',
  icon: '',
  description: '',
  fields: {} as Record<string, FieldConfig>,
})

const categories = [
  { label: 'Layout', value: 'layout' },
  { label: 'Media', value: 'media' },
  { label: 'Text', value: 'text' },
  { label: 'Interactive', value: 'interactive' },
  { label: 'Data', value: 'data' },
]

// Fetch block types
const { data, refresh, status } = await useFetch<{ data: BlockTypeSummary[] }>('/api/publisher/block-types')
const blockTypes = computed(() => data.value?.data || [])

// Search & pagination state
const search = ref('')
const debouncedSearch = ref('')
const page = ref(1)
const pageSize = 10

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, (newValue) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = newValue
    page.value = 1 // Reset to first page on search
  }, 300)
})

// Cleanup debounce timeout on unmount
onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

// Filter block types based on search
const filteredBlockTypes = computed(() => {
  let data = blockTypes.value
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase()
    data = data.filter(bt =>
      bt.displayName.toLowerCase().includes(query) ||
      bt.name.toLowerCase().includes(query) ||
      (bt.category && bt.category.toLowerCase().includes(query)) ||
      (bt.description && bt.description.toLowerCase().includes(query))
    )
  }
  return data
})

// Paginated block types
const paginatedBlockTypes = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredBlockTypes.value.slice(start, start + pageSize)
})

const totalPages = computed(() =>
  Math.ceil(filteredBlockTypes.value.length / pageSize)
)

function resetForm() {
  form.value = {
    name: '',
    displayName: '',
    category: 'text',
    icon: '',
    description: '',
    fields: {},
  }
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function openEditModal(blockType: BlockTypeSummary) {
  selectedBlockType.value = blockType
  form.value = {
    name: blockType.name,
    displayName: blockType.displayName,
    category: blockType.category || 'text',
    icon: blockType.icon || '',
    description: blockType.description || '',
    fields: { ...blockType.fields },
  }
  showEditModal.value = true
}

async function createBlockType() {
  if (!form.value.displayName.trim() || !form.value.name.trim()) {
    toast({ title: 'Name and display name are required', variant: 'destructive' })
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/publisher/block-types', {
      method: 'POST',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        category: form.value.category,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        fields: form.value.fields,
      },
    })

    await refresh()
    showCreateModal.value = false
    toast({ title: 'Block type created' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to create block type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSubmitting.value = false
  }
}

async function updateBlockType() {
  if (!selectedBlockType.value) return

  isSubmitting.value = true

  try {
    await $fetch(`/api/publisher/block-types/${selectedBlockType.value.name}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        category: form.value.category,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        fields: form.value.fields,
      },
    })

    await refresh()
    showEditModal.value = false
    toast({ title: 'Block type updated' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to update block type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSubmitting.value = false
  }
}

function openDeleteModal(blockType: BlockTypeSummary) {
  selectedBlockType.value = blockType
  showDeleteModal.value = true
}

async function deleteBlockType() {
  if (!selectedBlockType.value) return

  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/block-types/${selectedBlockType.value.name}`, { method: 'DELETE' })
    await refresh()
    toast({ title: 'Block type deleted' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete block type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isDeleting.value = false
    showDeleteModal.value = false
    selectedBlockType.value = null
  }
}

function getFieldCount(fields: Record<string, any> | undefined): number {
  return fields ? Object.keys(fields).length : 0
}

// Auto-generate name from displayName
watch(() => form.value.displayName, (displayName) => {
  if (!showEditModal.value && (!form.value.name || form.value.name === slugify(form.value.name))) {
    form.value.name = slugify(displayName)
  }
})

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Block Types</h2>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Reusable components for the page builder
        </p>
      </div>
      <Button variant="outline" @click="openCreateModal">
        <Plus class="h-4 w-4 mr-2" />
        Create Block Type
      </Button>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          v-model="search"
          placeholder="Search block types..."
          class="pl-9"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[40px]"></TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>API Name</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell colspan="7" class="text-center py-8 text-[hsl(var(--muted-foreground))]">Loading...</TableCell>
          </TableRow>
          <TableRow v-for="bt in paginatedBlockTypes" :key="bt.name">
            <TableCell>
              <LayoutGrid class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <button
                  @click="openEditModal(bt)"
                  class="font-medium text-[hsl(var(--foreground))] hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {{ bt.displayName }}
                </button>
                <Badge v-if="bt.isSystem" variant="secondary" class="text-xs">
                  System
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <Badge v-if="bt.category" variant="secondary" class="text-xs">
                {{ bt.category }}
              </Badge>
              <span v-else class="text-[hsl(var(--muted-foreground))]">--</span>
            </TableCell>
            <TableCell>
              <code class="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                {{ bt.name }}
              </code>
            </TableCell>
            <TableCell class="text-sm text-[hsl(var(--muted-foreground))]">
              {{ getFieldCount(bt.fields) }} fields
            </TableCell>
            <TableCell>
              <Badge
                v-if="bt.active === false"
                variant="destructive"
                class="text-xs"
              >
                Disabled
              </Badge>
              <Badge v-else variant="default" class="text-xs">
                Active
              </Badge>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Button size="sm" variant="ghost" @click="openEditModal(bt)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  v-if="!bt.isSystem"
                  size="sm"
                  variant="ghost"
                  @click="openDeleteModal(bt)"
                >
                  <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Empty state -->
      <div v-if="filteredBlockTypes.length === 0 && status !== 'pending'" class="text-center py-12">
        <LayoutGrid class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <p v-if="debouncedSearch" class="text-[hsl(var(--muted-foreground))]">No block types found.</p>
        <template v-else>
          <p class="text-[hsl(var(--muted-foreground))]">No block types defined.</p>
          <Button
            variant="outline"
            class="mt-4"
            @click="openCreateModal"
          >
            <Plus class="h-4 w-4 mr-2" />
            Create your first block type
          </Button>
        </template>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Showing {{ ((page - 1) * pageSize) + 1 }}–{{ Math.min(page * pageSize, filteredBlockTypes.length) }} of {{ filteredBlockTypes.length }}
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious :disabled="page <= 1" @click="page = Math.max(1, page - 1)" />
            </PaginationItem>
            <PaginationItem>
              <span class="text-sm text-[hsl(var(--muted-foreground))] px-3">Page {{ page }} of {{ totalPages }}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext :disabled="page >= totalPages" @click="page = Math.min(totalPages, page + 1)" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Block Type</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="createBlockType" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Display Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.displayName" placeholder="e.g., Hero Section" />
            </div>

            <div class="space-y-2">
              <Label>API Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.name" placeholder="e.g., hero-section" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Category</Label>
              <Select v-model="form.category">
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label>Icon</Label>
              <Input v-model="form.icon" placeholder="e.g., Image" />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Description</Label>
            <Textarea v-model="form.description" placeholder="What is this block for?" :rows="3" />
          </div>

          <div class="border-t border-[hsl(var(--border))] pt-4">
            <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Fields</h4>
            <PublisherFieldEditor v-model="form.fields" mode="block" />
          </div>

          <DialogFooter>
            <Button variant="ghost" @click="showCreateModal = false">Cancel</Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Edit Modal -->
    <Dialog v-model:open="showEditModal">
      <DialogContent class="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Block Type</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="updateBlockType" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Display Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.displayName" placeholder="e.g., Hero Section" />
            </div>

            <div class="space-y-2">
              <Label>API Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.name" placeholder="e.g., hero-section" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Category</Label>
              <Select v-model="form.category">
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="cat in categories" :key="cat.value" :value="cat.value">{{ cat.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="space-y-2">
              <Label>Icon</Label>
              <Input v-model="form.icon" placeholder="e.g., Image" />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Description</Label>
            <Textarea v-model="form.description" placeholder="What is this block for?" :rows="3" />
          </div>

          <div class="border-t border-[hsl(var(--border))] pt-4">
            <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Fields</h4>
            <PublisherFieldEditor v-model="form.fields" mode="block" />
          </div>

          <DialogFooter>
            <Button variant="ghost" @click="showEditModal = false">Cancel</Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete confirmation -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Block Type</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete <span class="font-medium text-[hsl(var(--foreground))]">{{ selectedBlockType?.displayName }}</span>?
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">Cancel</Button>
          <Button variant="destructive" :disabled="isDeleting" @click="deleteBlockType">
            <Loader2 v-if="isDeleting" class="h-4 w-4 mr-2 animate-spin" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
