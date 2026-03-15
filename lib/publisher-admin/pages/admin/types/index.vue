<script setup lang="ts">
import type { FieldConfig } from '~~/lib/publisher/types'
import { Plus, Pencil, Trash2, Box, Search, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spavn/ui'
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface ContentTypeSummary {
  name: string
  displayName: string
  pluralName: string
  icon?: string
  description?: string
  fieldCount: number
  fields: Record<string, FieldConfig>
  options?: any
  isSystem?: boolean
  active?: boolean
}

const { toast } = useToast()

// Fetch content types
const { data: contentTypesData, refresh: refreshContentTypes, status: contentTypesStatus } = await useFetch<{ data: ContentTypeSummary[] }>('/api/publisher/types')

const contentTypes = computed(() => contentTypesData.value?.data || [])

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

// Filter content types based on search
const filteredContentTypes = computed(() => {
  let data = contentTypes.value
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase()
    data = data.filter(t =>
      t.displayName.toLowerCase().includes(query) ||
      t.name.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    )
  }
  return data
})

// Paginated content types
const paginatedContentTypes = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredContentTypes.value.slice(start, start + pageSize)
})

const totalPages = computed(() =>
  Math.ceil(filteredContentTypes.value.length / pageSize)
)

// Delete confirmation
const showDeleteModal = ref(false)
const deleteTarget = ref<{ name: string, displayName: string } | null>(null)
const isDeleting = ref(false)

function openDeleteModal(name: string, displayName: string) {
  deleteTarget.value = { name, displayName }
  showDeleteModal.value = true
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/types/${deleteTarget.value.name}`, { method: 'DELETE' })
    await refreshContentTypes()
    toast({ title: `${deleteTarget.value.displayName} deleted` })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isDeleting.value = false
    showDeleteModal.value = false
    deleteTarget.value = null
  }
}

function getFieldCount(fields: Record<string, any> | undefined): number {
  return fields ? Object.keys(fields).length : 0
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Content Types</h2>
      <Button as-child variant="outline">
        <NuxtLink to="/admin/types/content/new">
          <Plus class="h-4 w-4 mr-2" />
          Create Content Type
        </NuxtLink>
      </Button>
    </div>

    <p class="text-sm text-[hsl(var(--muted-foreground))] mb-4">
      Define content structures for your API
    </p>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          v-model="search"
          placeholder="Search content types..."
          class="pl-9"
        />
      </div>
    </div>

    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead class="w-[40px]"></TableHead>
            <TableHead>Display Name</TableHead>
            <TableHead>API Name</TableHead>
            <TableHead>Fields</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="contentTypesStatus === 'pending'">
            <TableCell colspan="6" class="text-center py-8 text-[hsl(var(--muted-foreground))]">Loading...</TableCell>
          </TableRow>
          <TableRow v-for="t in paginatedContentTypes" :key="t.name">
            <TableCell>
              <Box class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <NuxtLink
                  :to="`/admin/types/content/${t.name}`"
                  class="font-medium text-[hsl(var(--foreground))] hover:text-blue-600 dark:hover:text-blue-400"
                >
                  {{ t.displayName }}
                </NuxtLink>
                <Badge v-if="t.isSystem" variant="secondary" class="text-xs">
                  System
                </Badge>
              </div>
            </TableCell>
            <TableCell>
              <code class="text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                {{ t.name }}
              </code>
            </TableCell>
            <TableCell class="text-sm text-[hsl(var(--muted-foreground))]">
              {{ getFieldCount(t.fields) }} fields
            </TableCell>
            <TableCell>
              <Badge
                v-if="t.active === false"
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
                <Button size="sm" variant="ghost" as-child>
                  <NuxtLink :to="`/admin/types/content/${t.name}`">
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                </Button>
                <Button
                  v-if="!t.isSystem"
                  size="sm"
                  variant="ghost"
                  @click="openDeleteModal(t.name, t.displayName)"
                >
                  <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div v-if="filteredContentTypes.length === 0 && contentTypesStatus !== 'pending'" class="text-center py-12">
        <Box class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No content types found.</p>
        <Button
          v-if="!search"
          variant="outline"
          as-child
          class="mt-4"
        >
          <NuxtLink to="/admin/types/content/new">
            <Plus class="h-4 w-4 mr-2" />
            Create your first content type
          </NuxtLink>
        </Button>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Showing {{ ((page - 1) * pageSize) + 1 }}–{{ Math.min(page * pageSize, filteredContentTypes.length) }} of {{ filteredContentTypes.length }}
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

    <!-- Delete confirmation modal -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Content Type</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete <span class="font-medium text-[hsl(var(--foreground))]">{{ deleteTarget?.displayName }}</span>?
          This will disable the type but preserve existing data.
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">
            Cancel
          </Button>
          <Button variant="destructive" :disabled="isDeleting" @click="confirmDelete">
            <Loader2 v-if="isDeleting" class="h-4 w-4 mr-2 animate-spin" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
