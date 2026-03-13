<script setup lang="ts">
import type { FieldConfig, ContentTypeOptions } from '~~/lib/publisher/types'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const router = useRouter()
const toast = useToast()
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
    toast.add({ title: 'Display name is required', color: 'error' })
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
      toast.add({
        title: 'Content type updated',
        description: migration.added?.length > 0
          ? `Added columns: ${migration.added.join(', ')}`
          : undefined,
        color: 'success',
      })
    }
    else {
      toast.add({ title: 'Content type updated', color: 'success' })
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
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isSaving.value = false
  }
}

async function deleteType() {
  isDeleting.value = true

  try {
    await $fetch(`/api/publisher/types/${typeName.value}`, { method: 'DELETE' })
    toast.add({ title: 'Content type deleted', color: 'success' })
    await router.push('/admin/types')
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to delete content type'
    toast.add({ title: message, color: 'error' })
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
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          to="/admin/types"
        />
        <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
          Edit {{ contentType.displayName }}
        </h2>
        <UBadge v-if="contentType.isSystem" color="info" variant="subtle">
          System
        </UBadge>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Main form -->
      <div class="lg:col-span-3 space-y-6">
        <!-- Warning banner -->
        <UAlert
          color="warning"
          variant="subtle"
          icon="i-heroicons-exclamation-triangle"
          title="Schema Changes"
          description="Adding fields is safe. Removing fields hides them from the API but data is preserved."
        />

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
              Save Changes
            </UButton>
            <UButton
              block
              variant="ghost"
              color="neutral"
              to="/admin/types"
            >
              Cancel
            </UButton>

            <hr class="border-stone-200 dark:border-stone-700 my-4" />

            <UButton
              v-if="!contentType.isSystem"
              block
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click="showDeleteModal = true"
            >
              Delete Content Type
            </UButton>
          </div>
        </div>

        <!-- API Preview -->
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">API Endpoints</h4>
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
            <div>
              <span class="text-stone-500 dark:text-stone-400">Update:</span>
              <code class="ml-2 text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 px-1.5 py-0.5 rounded font-mono">
                PATCH /api/v1/{{ formData.pluralName || 'items' }}/:id
              </code>
            </div>
          </div>
        </div>

        <!-- Field count -->
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">Statistics</h4>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between">
              <span class="text-stone-500 dark:text-stone-400">Fields</span>
              <span class="font-medium text-stone-900 dark:text-stone-100">{{ Object.keys(formData.fields).length }}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-stone-500 dark:text-stone-400">Required</span>
              <span class="font-medium text-stone-900 dark:text-stone-100">
                {{ Object.values(formData.fields).filter(f => f.required).length }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Delete Content Type</h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">
            Are you sure you want to delete <span class="font-medium text-stone-700 dark:text-stone-300">{{ contentType.displayName }}</span>?
            This will disable the type but preserve existing data in the database.
          </p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="error" :loading="isDeleting" @click="deleteType">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>

  <!-- Loading state -->
  <div v-else class="text-center py-12">
    <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl text-stone-400" />
  </div>
</template>
