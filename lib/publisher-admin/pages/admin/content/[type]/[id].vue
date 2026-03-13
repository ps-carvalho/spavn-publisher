<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const toast = useToast()
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
  if (status === 'published') return 'bg-green-600 dark:bg-green-400'
  return 'bg-amber-500 dark:bg-amber-400'
}

function getStatusTextClass(status: string): string {
  if (status === 'published') return 'text-green-600 dark:text-green-400'
  return 'text-amber-500 dark:text-amber-400'
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
    toast.add({ title: 'Saved', color: 'success' })
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to save'
    toast.add({ title: message, color: 'error' })
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
    toast.add({ title: 'Published!', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.data?.error?.message || 'Failed to publish', color: 'error' })
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
    toast.add({ title: 'Unpublished', color: 'success' })
  }
  catch {
    toast.add({ title: 'Failed to unpublish', color: 'error' })
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
    toast.add({ title: 'Deleted', color: 'success' })
    await navigateTo(`/admin/content/${typeName.value}`)
  }
  catch {
    toast.add({ title: 'Failed to delete', color: 'error' })
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
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          :to="`/admin/content/${typeName}`"
        />
        <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
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
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
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
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <div class="space-y-3">
            <UButton block color="neutral" @click="save" :loading="isSaving">
              Save
            </UButton>

            <template v-if="contentType.options?.draftAndPublish">
              <UButton
                v-if="currentStatus !== 'published'"
                block
                color="primary"
                variant="soft"
                @click="publish"
                :loading="isSaving"
              >
                Publish
              </UButton>
              <UButton
                v-else
                block
                color="primary"
                variant="outline"
                @click="unpublish"
                :loading="isSaving"
              >
                Unpublish
              </UButton>
            </template>

            <UButton
              block
              color="error"
              variant="ghost"
              icon="i-heroicons-trash"
              @click="showDeleteModal = true"
            >
              Delete
            </UButton>
          </div>
        </div>

        <!-- Boolean fields -->
        <div
          v-if="sidebarFields.length > 0"
          class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6"
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
        <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
          <h4 class="text-sm font-medium text-stone-900 dark:text-stone-100 mb-3">Details</h4>
          <div class="space-y-2 text-sm text-stone-500 dark:text-stone-400">
            <p><span class="font-medium text-stone-700 dark:text-stone-300">ID:</span> {{ entryData.data.id }}</p>
            <p v-if="entryData.data.createdAt"><span class="font-medium text-stone-700 dark:text-stone-300">Created:</span> {{ formatDate(entryData.data.createdAt) }}</p>
            <p v-if="entryData.data.updatedAt"><span class="font-medium text-stone-700 dark:text-stone-300">Updated:</span> {{ formatDate(entryData.data.updatedAt) }}</p>
            <p v-if="entryData.data.publishedAt"><span class="font-medium text-stone-700 dark:text-stone-300">Published:</span> {{ formatDate(entryData.data.publishedAt) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete confirmation -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">Delete Entry</h3>
          <p class="text-stone-500 dark:text-stone-400 mb-4">Are you sure? This cannot be undone.</p>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" color="neutral" @click="showDeleteModal = false">Cancel</UButton>
            <UButton color="error" @click="deleteEntry">Delete</UButton>
          </div>
        </div>
      </template>
    </UModal>
  </div>
</template>
