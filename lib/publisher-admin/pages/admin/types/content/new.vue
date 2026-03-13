<script setup lang="ts">
import type { FieldConfig, ContentTypeOptions } from '~~/lib/publisher/types'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const toast = useToast()
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
    toast.add({ title: 'Display name is required', color: 'error' })
    return
  }

  if (!formData.value.name.trim()) {
    toast.add({ title: 'Name is required', color: 'error' })
    return
  }

  if (!formData.value.pluralName.trim()) {
    toast.add({ title: 'Plural name is required', color: 'error' })
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

    toast.add({ title: 'Content type created', color: 'success' })
    await router.push('/admin/types')
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to create content type'
    toast.add({ title: message, color: 'error' })
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
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          to="/admin/types"
        />
        <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
          New Content Type
        </h2>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Main form -->
      <div class="lg:col-span-3 space-y-6">
        <!-- Basic info -->
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Basic Information</h3>

          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="Display Name" required>
                <UInput
                  v-model="formData.displayName"
                  placeholder="e.g., Article, Product, Author"
                />
              </UFormField>

              <UFormField label="Icon Class">
                <UInput
                  v-model="formData.icon"
                  placeholder="e.g., i-heroicons-document-text"
                />
              </UFormField>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <UFormField label="API Name" required hint="Used in API routes">
                <UInput
                  v-model="formData.name"
                  placeholder="e.g., article"
                />
              </UFormField>

              <UFormField label="Plural Name" required hint="API endpoint name">
                <UInput
                  v-model="formData.pluralName"
                  placeholder="e.g., articles"
                />
              </UFormField>
            </div>

            <UFormField label="Description">
              <UTextarea
                v-model="formData.description"
                placeholder="What is this content type for?"
                :rows="2"
              />
            </UFormField>
          </div>
        </div>

        <!-- Options -->
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Options</h3>

          <div class="space-y-3">
            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="formData.options.draftAndPublish"
                class="rounded border-stone-300 dark:border-stone-600"
              />
              <div>
                <span class="text-sm font-medium text-stone-900 dark:text-stone-100">Draft & Publish</span>
                <p class="text-xs text-stone-500 dark:text-stone-400">Add status and publishedAt fields</p>
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="formData.options.timestamps"
                class="rounded border-stone-300 dark:border-stone-600"
              />
              <div>
                <span class="text-sm font-medium text-stone-900 dark:text-stone-100">Timestamps</span>
                <p class="text-xs text-stone-500 dark:text-stone-400">Add createdAt and updatedAt fields</p>
              </div>
            </label>

            <label class="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                v-model="formData.options.softDelete"
                class="rounded border-stone-300 dark:border-stone-600"
              />
              <div>
                <span class="text-sm font-medium text-stone-900 dark:text-stone-100">Soft Delete</span>
                <p class="text-xs text-stone-500 dark:text-stone-400">Add deletedAt field, filter deleted from API</p>
              </div>
            </label>
          </div>
        </div>

        <!-- Fields -->
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Fields</h3>
          <PublisherFieldEditor v-model="formData.fields" mode="content" />
        </div>
      </div>

      <!-- Sidebar -->
      <div class="space-y-4">
        <!-- Actions -->
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <div class="space-y-3">
            <UButton block color="neutral" @click="save" :loading="isSaving">
              Create Content Type
            </UButton>
            <UButton
              block
              variant="ghost"
              color="neutral"
              to="/admin/types"
            >
              Cancel
            </UButton>
          </div>
        </div>

        <!-- API Preview -->
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">API Preview</h4>
          <div class="space-y-2 text-sm">
            <div>
              <span class="text-stone-500 dark:text-stone-400">List:</span>
              <code class="ml-2 text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono">
                GET /api/v1/{{ formData.pluralName || 'items' }}
              </code>
            </div>
            <div>
              <span class="text-stone-500 dark:text-stone-400">Create:</span>
              <code class="ml-2 text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono">
                POST /api/v1/{{ formData.pluralName || 'items' }}
              </code>
            </div>
            <div>
              <span class="text-stone-500 dark:text-stone-400">Get:</span>
              <code class="ml-2 text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono">
                GET /api/v1/{{ formData.pluralName || 'items' }}/:id
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
