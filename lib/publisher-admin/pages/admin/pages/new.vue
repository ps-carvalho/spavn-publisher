<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const toast = useToast()

// Step state
const step = ref(1)
const selectedPageType = ref<{ name: string; displayName: string; description?: string; icon?: string; areas: Record<string, unknown> } | null>(null)

// Form state
const title = ref('')
const isCreating = ref(false)

// Fetch page types
const { data: pageTypesData, status: pageTypesStatus } = await useFetch<{ data: Array<{ name: string; displayName: string; description?: string; icon?: string; areas: Record<string, unknown> }> }>('/api/publisher/page-types')
const pageTypes = computed(() => pageTypesData.value?.data || [])

// Auto-generated slug
const slug = computed(() => slugify(title.value))

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function selectPageType(pageType: typeof selectedPageType.value) {
  selectedPageType.value = pageType
  step.value = 2
}

function goBack() {
  step.value = 1
}

async function createPage() {
  if (!title.value.trim() || !selectedPageType.value) return

  isCreating.value = true

  try {
    const result = await $fetch<{ data: { id: number } }>('/api/v1/pages', {
      method: 'POST',
      body: {
        title: title.value,
        pageType: selectedPageType.value.name,
      },
    })

    toast.add({ title: 'Page created', color: 'success' })
    await navigateTo(`/admin/pages/${result.data.id}`)
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || e?.data?.error?.message || 'Failed to create page'
    toast.add({ title: message, color: 'error' })
  }
  finally {
    isCreating.value = false
  }
}
</script>

<template>
  <div>
    <!-- Step 1: Select Page Type -->
    <div v-if="step === 1">
      <!-- Page header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-arrow-left"
            to="/admin/pages"
          />
          <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Create New Page
          </h2>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="pageTypesStatus === 'pending'" class="flex items-center justify-center py-12">
        <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-stone-400" />
      </div>

      <!-- Page types grid -->
      <div v-else-if="pageTypes.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard
          v-for="pageType in pageTypes"
          :key="pageType.name"
          class="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          :class="{ 'ring-2 ring-primary': selectedPageType?.name === pageType.name }"
          @click="selectPageType(pageType)"
        >
          <div class="flex items-start gap-3">
            <UIcon :name="pageType.icon || 'i-heroicons-document'" class="text-2xl text-stone-600 dark:text-stone-400 mt-0.5" />
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-stone-900 dark:text-stone-100">
                {{ pageType.displayName }}
              </p>
              <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
                {{ pageType.description || 'No description' }}
              </p>
              <p class="text-xs text-stone-400 dark:text-stone-500 mt-2">
                {{ Object.keys(pageType.areas || {}).length }} areas
              </p>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <UIcon
          name="i-heroicons-document-text"
          class="text-4xl text-stone-400 dark:text-stone-500 mb-3"
        />
        <p class="text-stone-500 dark:text-stone-400">No page types available.</p>
      </div>
    </div>

    <!-- Step 2: Enter Page Details -->
    <div v-else-if="step === 2">
      <!-- Page header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-arrow-left"
            @click="goBack"
          />
          <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">
            Page Details
          </h2>
        </div>
      </div>

      <!-- Selected page type info -->
      <div class="mb-6 p-4 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center gap-3">
        <UIcon :name="selectedPageType?.icon || 'i-heroicons-document'" class="text-xl text-stone-600 dark:text-stone-400" />
        <div>
          <p class="font-medium text-stone-900 dark:text-stone-100">
            {{ selectedPageType?.displayName }}
          </p>
          <p class="text-sm text-stone-500 dark:text-stone-400">
            {{ selectedPageType?.description || 'No description' }}
          </p>
        </div>
      </div>

      <!-- Form -->
      <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6">
        <form @submit.prevent="createPage" class="space-y-5">
          <!-- Title -->
          <div>
            <label class="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Title <span class="text-red-500">*</span>
            </label>
            <UInput
              v-model="title"
              placeholder="Enter page title"
              size="lg"
              :disabled="isCreating"
            />
          </div>

          <!-- Auto-generated slug -->
          <div v-if="slug">
            <label class="block text-sm font-medium text-stone-500 dark:text-stone-400 mb-1">
              Slug
            </label>
            <p class="font-mono text-sm text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded">
              {{ slug }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-4">
            <UButton
              type="submit"
              color="primary"
              :loading="isCreating"
              :disabled="!title.trim()"
            >
              Create Page
            </UButton>
            <UButton
              variant="ghost"
              color="neutral"
              @click="goBack"
              :disabled="isCreating"
            >
              Back
            </UButton>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
