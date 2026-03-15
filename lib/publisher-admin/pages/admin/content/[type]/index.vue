<script setup lang="ts">
import { Plus, Pencil, Trash2, Search, Box } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@spavn/ui'
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const { toast } = useToast()
const typeName = computed(() => route.params.type as string)

// Fetch content type config
const { data: typeData } = await useFetch<{ data: any[] }>('/api/publisher/types')
const contentType = computed(() => typeData.value?.data?.find((t: any) => t.pluralName === typeName.value))

// Search & filter state
const search = ref('')
const statusFilter = ref<string>('')
const page = ref(1)
const pageSize = 25

// Build query params
const queryParams = computed(() => {
  const params: Record<string, string> = {
    'pagination[page]': String(page.value),
    'pagination[pageSize]': String(pageSize),
    'sort': 'createdAt:desc',
  }

  // Search by first string field
  if (search.value && contentType.value) {
    const firstStringField = Object.entries(contentType.value.fields)
      .find(([_, f]: [string, any]) => f.type === 'string')?.[0]
    if (firstStringField) {
      params[`filters[${firstStringField}][$contains]`] = search.value
    }
  }

  // Status filter
  if (statusFilter.value) {
    params['filters[status]'] = statusFilter.value
  }

  return params
})

// Fetch entries
const { data: entriesData, refresh, status } = await useFetch<{
  data: Record<string, unknown>[]
  meta: { pagination: { page: number; pageSize: number; total: number; pageCount: number } }
}>(() => `/api/v1/${typeName.value}`, {
  query: queryParams,
  watch: [queryParams],
})

const entries = computed(() => entriesData.value?.data || [])
const pagination = computed(() => entriesData.value?.meta?.pagination || { page: 1, pageSize: 25, total: 0, pageCount: 0 })

// Derive table columns from content type (first 4 non-body fields + status + updatedAt)
const columns = computed(() => {
  if (!contentType.value) return []

  const cols: { accessorKey?: string; id?: string; header: string }[] = []

  let count = 0
  for (const [name, config] of Object.entries(contentType.value.fields) as [string, any][]) {
    if (config.type === 'richtext' || config.type === 'text' || config.type === 'password') continue
    if (count >= 4) break
    cols.push({ accessorKey: name, header: config.label || name })
    count++
  }

  if (contentType.value.options?.draftAndPublish) {
    cols.push({ accessorKey: 'status', header: 'Status' })
  }

  cols.push({ accessorKey: 'updatedAt', header: 'Updated' })
  cols.push({ id: 'actions', header: '' })

  return cols
})

// Status filter options
const statusOptions = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
]

// Delete modal
const showDeleteModal = ref(false)
const entryToDelete = ref<number | null>(null)

async function deleteEntry() {
  if (!entryToDelete.value) return
  try {
    await $fetch(`/api/v1/${typeName.value}/${entryToDelete.value}`, { method: 'DELETE' })
    await refresh()
    toast({ title: 'Entry deleted' })
  }
  catch {
    toast({ title: 'Failed to delete entry', variant: 'destructive' })
  }
  finally {
    showDeleteModal.value = false
    entryToDelete.value = null
  }
}

function formatDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '—'
  return new Date(dateStr).toLocaleDateString()
}

function getStatusDotClass(status: string): string {
  if (status === 'published') return 'bg-[hsl(var(--accent))]'
  return 'bg-[hsl(var(--muted-foreground))]'
}

function getStatusTextClass(status: string): string {
  if (status === 'published') return 'text-[hsl(var(--accent-foreground))]'
  return 'text-[hsl(var(--muted-foreground))]'
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
        {{ contentType?.displayName || typeName }}
      </h2>
      <Button as-child variant="outline">
        <NuxtLink :to="`/admin/content/${typeName}/new`">
          <Plus class="h-4 w-4 mr-2" />
          Create Entry
        </NuxtLink>
      </Button>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          v-model="search"
          placeholder="Search..."
          class="pl-9"
        />
      </div>
      <Select
        v-if="contentType?.options?.draftAndPublish"
        v-model="statusFilter"
      >
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
            <TableHead v-for="col in columns" :key="col.accessorKey || col.id" :class="col.id === 'actions' ? 'w-[100px]' : ''">
              {{ col.header }}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell :colspan="columns.length" class="text-center py-8 text-[hsl(var(--muted-foreground))]">Loading...</TableCell>
          </TableRow>
          <TableRow v-for="row in entries" :key="row.id as number">
            <template v-for="col in columns" :key="col.accessorKey || col.id">
              <TableCell v-if="col.accessorKey === 'status'">
                <div class="flex items-center gap-2">
                  <span
                    class="w-2 h-2 rounded-full"
                    :class="getStatusDotClass(row.status as string || 'draft')"
                  />
                  <span
                    class="text-sm capitalize"
                    :class="getStatusTextClass(row.status as string || 'draft')"
                  >
                    {{ row.status || 'draft' }}
                  </span>
                </div>
              </TableCell>
              <TableCell v-else-if="col.accessorKey === 'updatedAt'" class="text-sm text-[hsl(var(--muted-foreground))]">
                {{ formatDate(row.updatedAt) }}
              </TableCell>
              <TableCell v-else-if="col.id === 'actions'">
                <div class="flex items-center gap-1">
                  <Button size="sm" variant="ghost" as-child>
                    <NuxtLink :to="`/admin/content/${typeName}/${row.id}`">
                      <Pencil class="h-4 w-4" />
                    </NuxtLink>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    @click.stop="entryToDelete = row.id as number; showDeleteModal = true"
                  >
                    <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                  </Button>
                </div>
              </TableCell>
              <TableCell v-else class="text-sm">
                {{ row[col.accessorKey!] }}
              </TableCell>
            </template>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Empty state -->
      <div v-if="entries.length === 0 && status !== 'pending'" class="text-center py-12">
        <Box class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No entries yet.</p>
        <Button class="mt-3" variant="outline" as-child>
          <NuxtLink :to="`/admin/content/${typeName}/new`">
            Create your first entry
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
          <DialogTitle>Delete Entry</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete this entry? {{ contentType?.options?.softDelete ? 'It will be soft-deleted and can be recovered.' : 'This action cannot be undone.' }}
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">Cancel</Button>
          <Button variant="destructive" @click="deleteEntry">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
