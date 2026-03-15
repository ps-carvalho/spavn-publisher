<script setup lang="ts">
import type { FieldConfig, AreaConfig, PageTypeOptions } from '~~/lib/publisher/types'
import { Plus, Pencil, Trash2, Copy, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Textarea } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface PageTypeSummary {
  id?: number
  name: string
  displayName: string
  icon?: string
  description?: string
  areas: Record<string, AreaConfig>
  options?: PageTypeOptions
  isSystem?: boolean
  active?: boolean
  createdAt?: string
}

interface BlockTypeSummary {
  name: string
  displayName: string
}

const { toast } = useToast()
const showCreateModal = ref(false)
const showEditModal = ref(false)
const selectedPageType = ref<PageTypeSummary | null>(null)
const isSubmitting = ref(false)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

// Form state
const form = ref({
  name: '',
  displayName: '',
  icon: '',
  description: '',
  areas: {} as Record<string, AreaConfig>,
  options: {
    draftAndPublish: true,
    timestamps: true,
    softDelete: false,
    seo: true,
  } as PageTypeOptions,
})

// Area form state
const showAreaModal = ref(false)
const editingAreaName = ref<string | null>(null)
const areaForm = ref({
  name: '',
  displayName: '',
  allowedBlocks: [] as string[],
  minBlocks: undefined as number | undefined,
  maxBlocks: undefined as number | undefined,
})

// Fetch page types
const { data, refresh, status } = await useFetch<{ data: PageTypeSummary[] }>('/api/publisher/page-types')
const pageTypes = computed(() => data.value?.data || [])

// Fetch block types for allowedBlocks selection
const { data: blockTypesData } = await useFetch<{ data: BlockTypeSummary[] }>('/api/publisher/block-types')
const blockTypes = computed(() => blockTypesData.value?.data || [])

const blockTypeOptions = computed(() =>
  blockTypes.value.map(bt => ({
    label: bt.displayName,
    value: bt.name,
  })),
)

function resetForm() {
  form.value = {
    name: '',
    displayName: '',
    icon: '',
    description: '',
    areas: {},
    options: {
      draftAndPublish: true,
      timestamps: true,
      softDelete: false,
      seo: true,
    },
  }
}

function resetAreaForm() {
  areaForm.value = {
    name: '',
    displayName: '',
    allowedBlocks: [],
    minBlocks: undefined,
    maxBlocks: undefined,
  }
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function openEditModal(pageType: PageTypeSummary) {
  selectedPageType.value = pageType
  form.value = {
    name: pageType.name,
    displayName: pageType.displayName,
    icon: pageType.icon || '',
    description: pageType.description || '',
    areas: { ...pageType.areas },
    options: pageType.options || {
      draftAndPublish: true,
      timestamps: true,
      softDelete: false,
      seo: true,
    },
  }
  showEditModal.value = true
}

// Area management
function openAddAreaModal() {
  editingAreaName.value = null
  resetAreaForm()
  showAreaModal.value = true
}

function openEditAreaModal(areaName: string, area: AreaConfig) {
  editingAreaName.value = areaName
  areaForm.value = {
    name: areaName,
    displayName: area.displayName,
    allowedBlocks: [...area.allowedBlocks],
    minBlocks: area.minBlocks,
    maxBlocks: area.maxBlocks,
  }
  showAreaModal.value = true
}

function saveArea() {
  if (!areaForm.value.name.trim() || !areaForm.value.displayName.trim()) {
    toast({ title: 'Area name and display name are required', variant: 'destructive' })
    return
  }

  if (areaForm.value.allowedBlocks.length === 0) {
    toast({ title: 'Select at least one allowed block type', variant: 'destructive' })
    return
  }

  const areaConfig: AreaConfig = {
    name: areaForm.value.name,
    displayName: areaForm.value.displayName,
    allowedBlocks: areaForm.value.allowedBlocks,
    minBlocks: areaForm.value.minBlocks,
    maxBlocks: areaForm.value.maxBlocks,
  }

  // If editing and name changed, remove old key
  if (editingAreaName.value && editingAreaName.value !== areaForm.value.name) {
    delete form.value.areas[editingAreaName.value]
  }

  form.value.areas[areaForm.value.name] = areaConfig
  showAreaModal.value = false
  toast({ title: editingAreaName.value ? 'Area updated' : 'Area added' })
}

function deleteArea(areaName: string) {
  if (!confirm(`Delete area "${areaName}"?`)) return
  delete form.value.areas[areaName]
}

function getAreaCount(areas: Record<string, any> | undefined): number {
  return areas ? Object.keys(areas).length : 0
}

function getRows() {
  return pageTypes.value.map(pt => ({
    ...pt,
    areaCount: getAreaCount(pt.areas),
  }))
}

async function createPageType() {
  if (!form.value.displayName.trim() || !form.value.name.trim()) {
    toast({ title: 'Name and display name are required', variant: 'destructive' })
    return
  }

  if (Object.keys(form.value.areas).length === 0) {
    toast({ title: 'At least one area is required', variant: 'destructive' })
    return
  }

  isSubmitting.value = true

  try {
    await $fetch('/api/publisher/page-types', {
      method: 'POST',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        areas: form.value.areas,
        options: form.value.options,
      },
    })

    await refresh()
    showCreateModal.value = false
    toast({ title: 'Page type created' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to create page type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSubmitting.value = false
  }
}

async function updatePageType() {
  if (!selectedPageType.value) return

  isSubmitting.value = true

  try {
    await $fetch(`/api/publisher/page-types/${selectedPageType.value.name}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        displayName: form.value.displayName,
        icon: form.value.icon || undefined,
        description: form.value.description || undefined,
        areas: form.value.areas,
        options: form.value.options,
      },
    })

    await refresh()
    showEditModal.value = false
    toast({ title: 'Page type updated' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to update page type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSubmitting.value = false
  }
}

function openDeleteModal(pageType: PageTypeSummary) {
  selectedPageType.value = pageType
  showDeleteModal.value = true
}

async function deletePageType() {
  if (!selectedPageType.value) return

  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/page-types/${selectedPageType.value.name}`, { method: 'DELETE' })
    await refresh()
    toast({ title: 'Page type deleted' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete page type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isDeleting.value = false
    showDeleteModal.value = false
    selectedPageType.value = null
  }
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
        <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Page Types</h2>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Page templates with configurable areas for blocks
        </p>
      </div>
      <Button variant="outline" @click="openCreateModal">
        <Plus class="h-4 w-4 mr-2" />
        Create Page Type
      </Button>
    </div>

    <!-- Table -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[40px]"></TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>API Name</TableHead>
            <TableHead>Areas</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell colspan="6" class="text-center py-8 text-[hsl(var(--muted-foreground))]">Loading...</TableCell>
          </TableRow>
          <TableRow v-for="pt in getRows()" :key="pt.name">
            <TableCell>
              <Copy class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <button
                  @click="openEditModal(pt)"
                  class="font-medium text-[hsl(var(--foreground))] hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {{ pt.displayName }}
                </button>
                <Badge v-if="pt.isSystem" variant="secondary" class="text-xs">
                  System
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <code class="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                {{ pt.name }}
              </code>
            </TableCell>
            <TableCell class="text-sm text-[hsl(var(--muted-foreground))]">
              {{ pt.areaCount }} areas
            </TableCell>
            <TableCell>
              <Badge
                v-if="pt.active === false"
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
                <Button size="sm" variant="ghost" @click="openEditModal(pt)">
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  v-if="!pt.isSystem"
                  size="sm"
                  variant="ghost"
                  @click="openDeleteModal(pt)"
                >
                  <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Empty state -->
      <div v-if="pageTypes.length === 0 && status !== 'pending'" class="text-center py-12">
        <Copy class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No page types defined.</p>
        <Button
          variant="outline"
          class="mt-4"
          @click="openCreateModal"
        >
          <Plus class="h-4 w-4 mr-2" />
          Create your first page type
        </Button>
      </div>
    </div>

    <!-- Create Modal -->
    <Dialog v-model:open="showCreateModal">
      <DialogContent class="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Page Type</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="createPageType" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Display Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.displayName" placeholder="e.g., Landing Page" />
            </div>

            <div class="space-y-2">
              <Label>API Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.name" placeholder="e.g., landing-page" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Icon</Label>
              <Input v-model="form.icon" placeholder="e.g., File" />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Description</Label>
            <Textarea v-model="form.description" placeholder="What is this page type for?" :rows="3" />
          </div>

          <!-- Options -->
          <div class="border-t border-[hsl(var(--border))] pt-4">
            <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Options</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.options.draftAndPublish"
                  class="rounded border-[hsl(var(--border))]"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">Draft & Publish</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.options.seo"
                  class="rounded border-[hsl(var(--border))]"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">SEO Fields</span>
              </label>
            </div>
          </div>

          <!-- Areas -->
          <div class="border-t border-[hsl(var(--border))] pt-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium text-[hsl(var(--foreground))]">Areas</h4>
              <Button size="sm" variant="outline" @click="openAddAreaModal">
                <Plus class="h-3 w-3 mr-1" />
                Add Area
              </Button>
            </div>

            <div v-if="Object.keys(form.areas).length > 0" class="space-y-2">
              <div
                v-for="(area, name) in form.areas"
                :key="name"
                class="flex items-center justify-between p-3 border border-[hsl(var(--border))] rounded-lg"
              >
                <div>
                  <span class="font-medium text-[hsl(var(--foreground))]">{{ area.displayName }}</span>
                  <code class="ml-2 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded">
                    {{ name }}
                  </code>
                  <span class="text-xs text-[hsl(var(--muted-foreground))] ml-2">
                    {{ area.allowedBlocks.length }} blocks allowed
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <Button size="sm" variant="ghost" @click="openEditAreaModal(name as string, area)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" @click="deleteArea(name as string)">
                    <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 border border-dashed border-[hsl(var(--border))] rounded-lg">
              <p class="text-sm text-[hsl(var(--muted-foreground))]">No areas defined yet</p>
            </div>
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
          <DialogTitle>Edit Page Type</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="updatePageType" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Display Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.displayName" placeholder="e.g., Landing Page" />
            </div>

            <div class="space-y-2">
              <Label>API Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="form.name" placeholder="e.g., landing-page" />
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Icon</Label>
              <Input v-model="form.icon" placeholder="e.g., File" />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Description</Label>
            <Textarea v-model="form.description" placeholder="What is this page type for?" :rows="3" />
          </div>

          <!-- Options -->
          <div class="border-t border-[hsl(var(--border))] pt-4">
            <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Options</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.options.draftAndPublish"
                  class="rounded border-[hsl(var(--border))]"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">Draft & Publish</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="form.options.seo"
                  class="rounded border-[hsl(var(--border))]"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">SEO Fields</span>
              </label>
            </div>
          </div>

          <!-- Areas -->
          <div class="border-t border-[hsl(var(--border))] pt-4">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium text-[hsl(var(--foreground))]">Areas</h4>
              <Button size="sm" variant="outline" @click="openAddAreaModal">
                <Plus class="h-3 w-3 mr-1" />
                Add Area
              </Button>
            </div>

            <div v-if="Object.keys(form.areas).length > 0" class="space-y-2">
              <div
                v-for="(area, name) in form.areas"
                :key="name"
                class="flex items-center justify-between p-3 border border-[hsl(var(--border))] rounded-lg"
              >
                <div>
                  <span class="font-medium text-[hsl(var(--foreground))]">{{ area.displayName }}</span>
                  <code class="ml-2 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded">
                    {{ name }}
                  </code>
                  <span class="text-xs text-[hsl(var(--muted-foreground))] ml-2">
                    {{ area.allowedBlocks.length }} blocks allowed
                  </span>
                </div>
                <div class="flex items-center gap-1">
                  <Button size="sm" variant="ghost" @click="openEditAreaModal(name as string, area)">
                    <Pencil class="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" @click="deleteArea(name as string)">
                    <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                </div>
              </div>
            </div>
            <div v-else class="text-center py-4 border border-dashed border-[hsl(var(--border))] rounded-lg">
              <p class="text-sm text-[hsl(var(--muted-foreground))]">No areas defined yet</p>
            </div>
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

    <!-- Area Modal -->
    <Dialog v-model:open="showAreaModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingAreaName ? 'Edit Area' : 'Add Area' }}</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="saveArea" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Display Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input v-model="areaForm.displayName" placeholder="e.g., Main Content" />
            </div>

            <div class="space-y-2">
              <Label>API Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input
                v-model="areaForm.name"
                placeholder="e.g., main"
                :disabled="!!editingAreaName"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Allowed Block Types <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <div class="space-y-2 max-h-40 overflow-y-auto border border-[hsl(var(--border))] rounded-md p-3">
              <label
                v-for="bt in blockTypes"
                :key="bt.name"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="areaForm.allowedBlocks.includes(bt.name)"
                  class="rounded border-[hsl(var(--border))]"
                  @change="(e: Event) => {
                    const checked = (e.target as HTMLInputElement).checked
                    if (checked) areaForm.allowedBlocks.push(bt.name)
                    else areaForm.allowedBlocks = areaForm.allowedBlocks.filter((n: string) => n !== bt.name)
                  }"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">{{ bt.displayName }}</span>
                <code class="text-xs text-[hsl(var(--muted-foreground))]">{{ bt.name }}</code>
              </label>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Min Blocks</Label>
              <Input v-model.number="areaForm.minBlocks" type="number" min="0" />
              <p class="text-xs text-[hsl(var(--muted-foreground))]">Minimum blocks required</p>
            </div>

            <div class="space-y-2">
              <Label>Max Blocks</Label>
              <Input v-model.number="areaForm.maxBlocks" type="number" min="1" />
              <p class="text-xs text-[hsl(var(--muted-foreground))]">Maximum blocks allowed</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" @click="showAreaModal = false">Cancel</Button>
            <Button type="submit">
              {{ editingAreaName ? 'Update' : 'Add' }} Area
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Delete confirmation -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Page Type</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete <span class="font-medium text-[hsl(var(--foreground))]">{{ selectedPageType?.displayName }}</span>?
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">Cancel</Button>
          <Button variant="destructive" :disabled="isDeleting" @click="deletePageType">
            <Loader2 v-if="isDeleting" class="h-4 w-4 mr-2 animate-spin" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
