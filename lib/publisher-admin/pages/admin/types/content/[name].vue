<script setup lang="ts">
import type { FieldConfig, ContentTypeOptions } from '~~/lib/publisher/types'
import { ArrowLeft, Trash2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Textarea } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Alert, AlertTitle, AlertDescription } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const router = useRouter()
const { toast } = useToast()
const isSaving = ref(false)
const showDeleteModal = ref(false)
const isDeleting = ref(false)

const typeName = computed(() => route.params.name as string)

// Fetch content type
const { data: typesData, refresh } = await useFetch<{ data: any[] }>('/api/publisher/types')
const contentType = computed(() => typesData.value?.data?.find(t => t.name === typeName.value))

// Form state
const formData = ref({
  name: '',
  displayName: '',
  pluralName: '',
  icon: '',
  description: '',
  options: {
    draftAndPublish: true,
    timestamps: true,
    softDelete: false,
  } as ContentTypeOptions,
  fields: {} as Record<string, FieldConfig>,
})

// Populate form when content type loads
watch(contentType, (ct) => {
  if (!ct) return
  formData.value = {
    name: ct.name,
    displayName: ct.displayName,
    pluralName: ct.pluralName,
    icon: ct.icon || '',
    description: ct.description || '',
    options: ct.options || {
      draftAndPublish: true,
      timestamps: true,
      softDelete: false,
    },
    fields: ct.fields || {},
  }
}, { immediate: true })

async function save() {
  if (!formData.value.displayName.trim()) {
    toast({ title: 'Display name is required', variant: 'destructive' })
    return
  }

  isSaving.value = true

  try {
    const body = {
      name: formData.value.name,
      displayName: formData.value.displayName,
      pluralName: formData.value.pluralName,
      icon: formData.value.icon || undefined,
      description: formData.value.description || undefined,
      options: formData.value.options,
      fields: formData.value.fields,
    }

    const result = await $fetch(`/api/publisher/types/${typeName.value}`, {
      method: 'PUT',
      body,
    })

    // Show migration results if any
    const migration = (result as any)?.migration
    if (migration?.added?.length > 0 || migration?.warnings?.length > 0) {
      toast({
        title: 'Content type updated',
        description: migration.added?.length > 0
          ? `Added columns: ${migration.added.join(', ')}`
          : undefined,
      })
    }
    else {
      toast({ title: 'Content type updated' })
    }

    // If name changed, redirect to new URL
    if (formData.value.name !== typeName.value) {
      await router.push(`/admin/types/content/${formData.value.name}`)
    }
    else {
      await refresh()
    }
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to update content type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSaving.value = false
  }
}

async function deleteType() {
  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/types/${typeName.value}`, { method: 'DELETE' })
    toast({ title: 'Content type deleted' })
    await router.push('/admin/types')
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete content type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isDeleting.value = false
    showDeleteModal.value = false
  }
}
</script>

<template>
  <div v-if="contentType">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <Button variant="ghost" as-child>
          <NuxtLink to="/admin/types">
            <ArrowLeft class="h-4 w-4" />
          </NuxtLink>
        </Button>
        <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
          Edit {{ contentType.displayName }}
        </h2>
        <Badge v-if="contentType.isSystem" variant="secondary">
          System
        </Badge>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Main form -->
      <div class="lg:col-span-3 space-y-6">
        <!-- Warning banner -->
        <Alert variant="destructive">
          <AlertTriangle class="h-4 w-4" />
          <AlertTitle>Schema Changes</AlertTitle>
          <AlertDescription>Adding fields is safe. Removing fields hides them from the API but data is preserved.</AlertDescription>
        </Alert>

        <!-- Basic info -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Basic Information</h3>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>Display Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
                <Input
                  v-model="formData.displayName"
                  placeholder="e.g., Article, Product, Author"
                />
              </div>

              <div class="space-y-2">
                <Label>Icon Class</Label>
                <Input
                  v-model="formData.icon"
                  placeholder="e.g., FileText"
                />
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label>API Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
                <Input
                  v-model="formData.name"
                  placeholder="e.g., article"
                />
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Used in API routes</p>
              </div>

              <div class="space-y-2">
                <Label>Plural Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
                <Input
                  v-model="formData.pluralName"
                  placeholder="e.g., articles"
                />
                <p class="text-xs text-[hsl(var(--muted-foreground))]">API endpoint name</p>
              </div>
            </div>

            <div class="space-y-2">
              <Label>Description</Label>
              <Textarea
                v-model="formData.description"
                placeholder="What is this content type for?"
                :rows="3"
              />
            </div>
          </div>
        </div>

        <!-- Options -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Options</h3>

          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="formData.options.draftAndPublish"
                class="rounded border-[hsl(var(--border))]"
              />
              <div>
                <span class="text-sm font-medium text-[hsl(var(--foreground))]">Draft & Publish</span>
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Add status and publishedAt fields</p>
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="formData.options.timestamps"
                class="rounded border-[hsl(var(--border))]"
              />
              <div>
                <span class="text-sm font-medium text-[hsl(var(--foreground))]">Timestamps</span>
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Add createdAt and updatedAt fields</p>
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="formData.options.softDelete"
                class="rounded border-[hsl(var(--border))]"
              />
              <div>
                <span class="text-sm font-medium text-[hsl(var(--foreground))]">Soft Delete</span>
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Add deletedAt field, filter deleted from API</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Fields -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] mb-4">Fields</h3>
          <PublisherFieldEditor v-model="formData.fields" mode="content" />
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Actions -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <div class="space-y-3">
            <Button class="w-full" variant="outline" @click="save" :disabled="isSaving">
              <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
              Save Changes
            </Button>
            <Button class="w-full" variant="ghost" as-child>
              <NuxtLink to="/admin/types">
                Cancel
              </NuxtLink>
            </Button>

            <hr class="border-[hsl(var(--border))] my-4" />

            <Button
              v-if="!contentType.isSystem"
              class="w-full"
              variant="ghost"
              @click="showDeleteModal = true"
            >
              <Trash2 class="h-4 w-4 mr-2 text-[hsl(var(--destructive))]" />
              Delete Content Type
            </Button>
          </div>
        </div>

        <!-- API Preview -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">API Endpoints</h4>
          <div class="space-y-2 text-sm">
            <div>
              <span class="text-[hsl(var(--muted-foreground))]">List:</span>
              <code class="ml-2 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                GET /api/v1/{{ formData.pluralName || 'items' }}
              </code>
            </div>
            <div>
              <span class="text-[hsl(var(--muted-foreground))]">Create:</span>
              <code class="ml-2 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                POST /api/v1/{{ formData.pluralName || 'items' }}
              </code>
            </div>
            <div>
              <span class="text-[hsl(var(--muted-foreground))]">Get:</span>
              <code class="ml-2 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                GET /api/v1/{{ formData.pluralName || 'items' }}/:id
              </code>
            </div>
            <div>
              <span class="text-[hsl(var(--muted-foreground))]">Update:</span>
              <code class="ml-2 text-xs bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] px-1.5 py-0.5 rounded font-mono">
                PATCH /api/v1/{{ formData.pluralName || 'items' }}/:id
              </code>
            </div>
          </div>
        </div>

        <!-- Field count -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">Statistics</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-[hsl(var(--muted-foreground))]">Fields</span>
              <span class="font-medium text-[hsl(var(--foreground))]">{{ Object.keys(formData.fields).length }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-[hsl(var(--muted-foreground))]">Required</span>
              <span class="font-medium text-[hsl(var(--foreground))]">
                {{ Object.values(formData.fields).filter(f => f.required).length }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation -->
    <Dialog v-model:open="showDeleteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Content Type</DialogTitle>
        </DialogHeader>
        <p class="text-[hsl(var(--muted-foreground))]">
          Are you sure you want to delete <span class="font-medium text-[hsl(var(--foreground))]">{{ contentType.displayName }}</span>?
          This will disable the type but preserve existing data in the database.
        </p>
        <DialogFooter>
          <Button variant="ghost" @click="showDeleteModal = false">Cancel</Button>
          <Button variant="destructive" :disabled="isDeleting" @click="deleteType">
            <Loader2 v-if="isDeleting" class="h-4 w-4 mr-2 animate-spin" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>

  <!-- Loading state -->
  <div v-else class="text-center py-12">
    <RefreshCw class="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))] mx-auto" />
  </div>
</template>
