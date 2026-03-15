<script setup lang="ts">
import type { FieldConfig, ContentTypeOptions } from '~~/lib/publisher/types'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Textarea } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const { toast } = useToast()
const router = useRouter()
const isSaving = ref(false)

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

// Auto-generate name and pluralName from displayName
watch(() => formData.value.displayName, (displayName) => {
  if (!formData.value.name || formData.value.name === slugify(formData.value.name)) {
    formData.value.name = slugify(displayName)
  }
  if (!formData.value.pluralName || formData.value.pluralName === `${formData.value.pluralName}`) {
    formData.value.pluralName = slugify(displayName) + 's'
  }
})

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

async function save() {
  if (!formData.value.displayName.trim()) {
    toast({ title: 'Display name is required', variant: 'destructive' })
    return
  }

  if (!formData.value.name.trim()) {
    toast({ title: 'Name is required', variant: 'destructive' })
    return
  }

  if (!formData.value.pluralName.trim()) {
    toast({ title: 'Plural name is required', variant: 'destructive' })
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

    await $fetch('/api/publisher/types', {
      method: 'POST',
      body,
    })

    toast({ title: 'Content type created' })
    await router.push('/admin/types')
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to create content type'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <Button variant="ghost" as-child>
          <NuxtLink to="/admin/types">
            <ArrowLeft class="h-4 w-4" />
          </NuxtLink>
        </Button>
        <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
          New Content Type
        </h2>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Main form -->
      <div class="lg:col-span-3 space-y-6">
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
              Create Content Type
            </Button>
            <Button class="w-full" variant="ghost" as-child>
              <NuxtLink to="/admin/types">
                Cancel
              </NuxtLink>
            </Button>
          </div>
        </div>

        <!-- API Preview -->
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <h4 class="text-sm font-medium text-[hsl(var(--foreground))] mb-3">API Preview</h4>
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
