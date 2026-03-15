<script setup lang="ts">
import { Plus, Pencil, Trash2, FileText, Search } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
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

const { toast } = useToast()

// Fetch page types for display names
const { data: pageTypesData } = await useFetch<{ data: Array<{ name: string; displayName: string }> }>('/api/publisher/page-types')
const pageTypesMap = computed(() => {
  const map: Record<string, string> = {}
  pageTypesData.value?.data?.forEach((pt) => {
    map[pt.name] = pt.displayName
  })
  return map
})

// Search & filter state
const search = ref('')
const statusFilter = ref<string>('all')
const page = ref(1)
const pageSize = 10

// Debounced search (manual implementation)
const debouncedSearch = ref('')
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

// Reset page when status filter changes
watch(statusFilter, () => {
  page.value = 1
})

// Build query params
const queryParams = computed(() => {
  const params: Record<string, string> = {
    'pagination[page]': String(page.value),
    'pagination[pageSize]': String(pageSize),
    sort: 'updatedAt:desc',
  }

  if (debouncedSearch.value) {
    params.search = debouncedSearch.value
  }

  if (statusFilter.value && statusFilter.value !== 'all') {
    params.status = statusFilter.value
  }

  return params
})

// Fetch pages
const { data: pagesData, refresh, status } = await useFetch<{
  data: Array<{
    id: number
    title: string
    slug: string
    pageType: string
    status: string
    updatedAt: string
  }>
  meta: { pagination: { page: number; pageSize: number; total: number; pageCount: number } }
}>('/api/v1/pages', {
  query: queryParams,
  watch: [queryParams],
})

const pages = computed(() => pagesData.value?.data || [])
const pagination = computed(() => pagesData.value?.meta?.pagination || { page: 1, pageSize: 25, total: 0, pageCount: 0 })

// Status filter options
const statusOptions = [
  { label: 'All', value: 'all' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
]

// Delete modal
const showDeleteModal = ref(false)
const pageToDelete = ref<{ id: number; title: string } | null>(null)

async function deletePage() {
  if (!pageToDelete.value) return
  try {
    await $fetch(`/api/v1/pages/${pageToDelete.value.id}`, { method: 'DELETE' })
    await refresh()
    toast({ title: 'Page deleted' })
  }
  catch {
    toast({ title: 'Failed to delete page', variant: 'destructive' })
  }
  finally {
    showDeleteModal.value = false
    pageToDelete.value = null
  }
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString()
}

function openDeleteModal(row: typeof pages.value[0]) {
  pageToDelete.value = { id: row.id, title: row.title }
  showDeleteModal.value = true
}

function navigateToEditor(row: typeof pages.value[0]) {
  navigateTo(`/admin/pages/${row.id}`)
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
        Pages
      </h2>
      <Button as-child variant="outline">
        <NuxtLink to="/admin/pages/new">
          <Plus class="h-4 w-4 mr-2" />
          Create Page
        </NuxtLink>
      </Button>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          v-model="search"
          placeholder="Search pages..."
          class="pl-9"
        />
      </div>
      <Select v-model="statusFilter">
        <SelectTrigger class="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <!-- Table card -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Page Type</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead class="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell colspan="6" class="text-center py-8 text-[hsl(var(--muted-foreground))]">Loading...</TableCell>
          </TableRow>
          <TableRow
            v-for="row in pages"
            :key="row.id"
            class="cursor-pointer"
            @click="navigateToEditor(row)"
          >
            <TableCell class="font-medium text-[hsl(var(--foreground))]">{{ row.title }}</TableCell>
            <TableCell class="font-mono text-sm text-[hsl(var(--muted-foreground))]">{{ row.slug }}</TableCell>
            <TableCell class="text-sm text-[hsl(var(--muted-foreground))]">{{ pageTypesMap[row.pageType] || row.pageType }}</TableCell>
            <TableCell>
              <Badge :variant="row.status === 'published' ? 'default' : 'secondary'">
                {{ row.status }}
              </Badge>
            </TableCell>
            <TableCell class="text-sm text-[hsl(var(--muted-foreground))]">{{ formatDate(row.updatedAt) }}</TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Button size="sm" variant="ghost" as-child @click.stop>
                  <NuxtLink :to="`/admin/pages/${row.id}`">
                    <Pencil class="h-4 w-4" />
                  </NuxtLink>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  @click.stop="openDeleteModal(row)"
                >
                  <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Empty state -->
      <div v-if="pages.length === 0 && status !== 'pending'" class="text-center py-12">
        <FileText class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No pages yet.</p>
        <Button class="mt-3" variant="outline" as-child>
          <NuxtLink to="/admin/pages/new">
            Create your first page
          </NuxtLink>
        </Button>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.pageCount > 1" class="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Showing {{ ((pagination.page - 1) * pageSize) + 1 }}–{{ Math.min(pagination.page * pageSize, pagination.total) }} of {{ pagination.total }}
        </p>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious :disabled="page <= 1" @click="page = Math.max(1, page - 1)" />
            </PaginationItem>
            <PaginationItem>
              <span class="text-sm text-[hsl(var(--muted-foreground))] px-3">Page {{ page }} of {{ pagination.pageCount }}</span>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext :disabled="page >= pagination.pageCount" @click="page = Math.min(pagination.pageCount, page + 1)" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>

    <!-- Delete confirmation -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Page</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete <strong>"{{ pageToDelete?.title }}"</strong>? This page will be soft-deleted and can be recovered.
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="deletePage">
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
