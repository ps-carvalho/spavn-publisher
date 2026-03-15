<script setup lang="ts">
import { ArrowLeft, Trash2, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const { toast } = useToast()
const typeName = computed(() => route.params.type as string)
const entryId = computed(() => route.params.id as string)
const isSaving = ref(false)

// Fetch content type config
const { data: typeData } = await useFetch<{ data: any[] }>('/api/publisher/types')
const contentType = computed(() => typeData.value?.data?.find((t: any) => t.pluralName === typeName.value))

// Fetch existing entry
const { data: entryData, refresh: refreshEntry } = await useFetch<{ data: Record<string, unknown> }>(
  () => `/api/v1/${typeName.value}/${entryId.value}`,
)

// Form state
const formData = ref<Record<string, unknown>>({})

// Populate form from entry
watch([entryData, contentType], () => {
  if (!entryData.value?.data || !contentType.value) return
  const data: Record<string, unknown> = {}
  for (const [name, config] of Object.entries(contentType.value.fields) as [string, any][]) {
    let val = entryData.value.data[name] ?? ''
    // Sanitize corrupt values — e.g. slug stored as {} from missing await bug
    if (typeof val === 'object' && val !== null && config.type !== 'json') {
      val = ''
    }
    data[name] = val
  }
  formData.value = data
}, { immediate: true })

// Separate main fields from sidebar-only fields
const mainFields = computed(() => {
  if (!contentType.value) return []
  return Object.entries(contentType.value.fields).filter(
    ([_, config]: [string, any]) => config.type !== 'boolean',
  )
})

const sidebarFields = computed(() => {
  if (!contentType.value) return []
  return Object.entries(contentType.value.fields).filter(
    ([_, config]: [string, any]) => config.type === 'boolean',
  )
})

const currentStatus = computed(() => entryData.value?.data?.status as string || 'draft')

function getStatusDotClass(status: string): string {
  if (status === 'published') return 'bg-[hsl(var(--accent))]'
  return 'bg-[hsl(var(--muted-foreground))]'
}

function getStatusTextClass(status: string): string {
  if (status === 'published') return 'text-[hsl(var(--accent-foreground))]'
  return 'text-[hsl(var(--muted-foreground))]'
}

async function save() {
  isSaving.value = true

  try {
    const body = { ...formData.value }

    await $fetch(`/api/v1/${typeName.value}/${entryId.value}`, {
      method: 'PATCH',
      body,
    })

    await refreshEntry()
    toast({ title: 'Saved' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to save'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSaving.value = false
  }
}

async function publish() {
  isSaving.value = true

  try {
    await $fetch(`/api/v1/${typeName.value}/${entryId.value}`, {
      method: 'PATCH',
      body: { ...formData.value, status: 'published' },
    })

    await refreshEntry()
    toast({ title: 'Published!' })
  }
  catch (e: any) {
    toast({ title: e?.data?.data?.error?.message || 'Failed to publish', variant: 'destructive' })
  }
  finally {
    isSaving.value = false
  }
}

async function unpublish() {
  isSaving.value = true

  try {
    await $fetch(`/api/v1/${typeName.value}/${entryId.value}`, {
      method: 'PATCH',
      body: { status: 'draft' },
    })

    await refreshEntry()
    toast({ title: 'Unpublished' })
  }
  catch {
    toast({ title: 'Failed to unpublish', variant: 'destructive' })
  }
  finally {
    isSaving.value = false
  }
}

// Delete
const showDeleteModal = ref(false)

async function deleteEntry() {
  try {
    await $fetch(`/api/v1/${typeName.value}/${entryId.value}`, { method: 'DELETE' })
    toast({ title: 'Deleted' })
    await navigateTo(`/admin/content/${typeName.value}`)
  }
  catch {
    toast({ title: 'Failed to delete', variant: 'destructive' })
  }
  finally {
    showDeleteModal.value = false
  }
}

function formatDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '—'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <div v-if="contentType && entryData">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <Button variant="ghost" as-child>
          <NuxtLink :to="`/admin/content/${typeName}`">
            <ArrowLeft class="h-4 w-4" />
          </NuxtLink>
        </Button>
        <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
          Edit {{ contentType.displayName }}
        </h2>
        <!-- Status dot+text -->
        <div v-if="contentType.options?.draftAndPublish" class="flex items-center gap-2">
          <span
            class="w-2 h-2 rounded-full"
            :class="getStatusDotClass(currentStatus)"
          />
          <span
            class="text-sm capitalize font-medium"
            :class="getStatusTextClass(currentStatus)"
          >
            {{ currentStatus }}
          </span>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Main form (70%) -->
      <div class="lg:col-span-3">
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <form @submit.prevent="save" class="space-y-5">
            <PublisherFieldRenderer
              v-for="[name, config] in mainFields"
              :key="name"
              :field-name="name"
              :field-config="config"
              :form-data="formData"
              v-model="formData[name]"
            />
          </form>
        </div>
      </div>

      <!-- Sidebar (30%) -->
      <div class="space-y-4">
        <!-- Actions -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div class="space-y-3">
            <Button class="w-full" variant="outline" @click="save" :disabled="isSaving">
              <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
              Save
            </Button>

            <template v-if="contentType.options?.draftAndPublish">
              <Button
                v-if="currentStatus !== 'published'"
                class="w-full"
                variant="outline"
                @click="publish"
                :disabled="isSaving"
              >
                <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
                Publish
              </Button>
              <Button
                v-else
                class="w-full"
                variant="outline"
                @click="unpublish"
                :disabled="isSaving"
              >
                <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
                Unpublish
              </Button>
            </template>

            <Button
              class="w-full"
              variant="ghost"
              @click="showDeleteModal = true"
            >
              <Trash2 class="h-4 w-4 mr-2 text-[hsl(var(--destructive))]" />
              Delete
            </Button>
          </div>
        </div>

        <!-- Boolean fields -->
        <div
          v-if="sidebarFields.length > 0"
          class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6"
        >
          <div class="space-y-4">
            <PublisherFieldRenderer
              v-for="[name, config] in sidebarFields"
              :key="name"
              :field-name="name"
              :field-config="config"
              :form-data="formData"
              v-model="formData[name]"
            />
          </div>
        </div>

        <!-- Timestamps -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Details</h4>
          <div class="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
            <p><span class="font-medium text-[hsl(var(--foreground))]">ID:</span> {{ entryData.data.id }}</p>
            <p v-if="entryData.data.createdAt"><span class="font-medium text-[hsl(var(--foreground))]">Created:</span> {{ formatDate(entryData.data.createdAt) }}</p>
            <p v-if="entryData.data.updatedAt"><span class="font-medium text-[hsl(var(--foreground))]">Updated:</span> {{ formatDate(entryData.data.updatedAt) }}</p>
            <p v-if="entryData.data.publishedAt"><span class="font-medium text-[hsl(var(--foreground))]">Published:</span> {{ formatDate(entryData.data.publishedAt) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Entry</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">Are you sure? This cannot be undone.</p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">Cancel</Button>
          <Button variant="destructive" @click="deleteEntry">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
