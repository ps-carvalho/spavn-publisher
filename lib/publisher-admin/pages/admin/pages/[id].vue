<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const pageId = computed(() => route.params.id as string)

// Initialize page builder
const {
  page,
  blocks,
  pageType,
  blockTypes,
  selectedBlockId,
  selectedBlock,
  selectedBlockType,
  isDirty,
  isSaving,
  isLoading,
  error,
  pageTitle,
  currentStatus,
  loadPage,
  savePage,
  publishPage,
  unpublishPage,
  addBlock,
  updateBlock,
  saveBlock,
  deleteBlock,
  reorderBlocks,
  selectBlock,
  deselectBlock,
} = usePageBuilder(pageId)

// Load page on mount
onMounted(() => {
  loadPage()
})

// Track selected area for block library
const selectedArea = ref<string | null>(null)

// Editor mode: edit or preview
const mode = ref<'edit' | 'preview'>('edit')

// Handle adding a block
function handleAddBlock(areaName: string) {
  selectedArea.value = areaName
}

function handleAddBlockFromLibrary(blockTypeName: string) {
  if (selectedArea.value) {
    addBlock(selectedArea.value, blockTypeName)
  }
}

// Handle selecting a block
function handleSelectBlock(blockId: number) {
  selectBlock(blockId)
}

// Handle deleting a block
function handleDeleteBlock(blockId: number) {
  deleteBlock(blockId)
}

// Handle reordering blocks within an area
function handleReorderBlocks(areaName: string, blockIds: number[]) {
  reorderBlocks(areaName, blockIds)
}

// Handle updating a block
function handleUpdateBlock(blockId: number, data: Record<string, unknown>) {
  updateBlock(blockId, data) // Optimistic UI update
  saveBlock(blockId) // Persist to API
}

// Settings slideover
const showSettingsSlideover = ref(false)

// SEO form data
const seoForm = ref({
  metaTitle: '',
  metaDescription: '',
  metaImage: null as number | null,
  metaExtra: '',
  slug: '',
})

// Track original slug to show warning
const originalSlug = ref('')

// Watch page data to populate SEO form
watch(page, (newPage) => {
  if (newPage) {
    seoForm.value = {
      metaTitle: newPage.meta?.title || '',
      metaDescription: newPage.meta?.description || '',
      metaImage: newPage.meta?.image ? Number(newPage.meta.image) : null,
      metaExtra: newPage.meta?.extra ? JSON.stringify(newPage.meta.extra, null, 2) : '',
      slug: newPage.slug || '',
    }
    originalSlug.value = newPage.slug || ''
  }
}, { immediate: true })

// Check if slug has been changed
const slugChanged = computed(() => {
  return seoForm.value.slug !== originalSlug.value
})

// Save SEO settings
async function saveSeoSettings() {
  // Parse metaExtra if provided
  let metaExtraParsed: Record<string, unknown> | undefined
  if (seoForm.value.metaExtra.trim()) {
    try {
      metaExtraParsed = JSON.parse(seoForm.value.metaExtra)
    }
    catch {
      useToast().add({ title: 'Invalid JSON', description: 'Meta Extra must be valid JSON', color: 'error' })
      return
    }
  }

  await savePage({
    metaTitle: seoForm.value.metaTitle || null,
    metaDescription: seoForm.value.metaDescription || null,
    metaImage: seoForm.value.metaImage,
    metaExtra: metaExtraParsed,
    slug: seoForm.value.slug,
  })
  showSettingsSlideover.value = false
}

// Save page title
async function savePageTitle() {
  if (isDirty.value) {
    await savePage({ title: pageTitle.value })
  }
}

// Status badge classes
function getStatusDotClass(status: string): string {
  if (status === 'published') return 'bg-green-600 dark:bg-green-400'
  return 'bg-amber-500 dark:bg-amber-400'
}

function getStatusTextClass(status: string): string {
  if (status === 'published') return 'text-green-600 dark:text-green-400'
  return 'text-amber-500 dark:text-amber-400'
}

// Format date
function formatDate(dateStr: unknown): string {
  if (!dateStr || typeof dateStr !== 'string') return '—'
  return new Date(dateStr).toLocaleString()
}
</script>

<template>
  <div class="h-[calc(100vh-64px)] flex flex-col">
    <!-- Loading state -->
    <div v-if="isLoading" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-heroicons-arrow-path" class="text-3xl animate-spin text-stone-400 dark:text-stone-500 mb-3" />
        <p class="text-stone-500 dark:text-stone-400">Loading page...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <UIcon name="i-heroicons-exclamation-triangle" class="text-3xl text-red-500 dark:text-red-400 mb-3" />
        <p class="text-stone-500 dark:text-stone-400 mb-4">{{ error.message }}</p>
        <UButton color="neutral" @click="loadPage">
          Try Again
        </UButton>
      </div>
    </div>

    <!-- Main editor -->
    <template v-else-if="page">
      <!-- Top bar -->
      <div class="h-14 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center px-4 gap-4">
        <!-- Back button -->
        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-arrow-left"
          to="/admin/pages"
        />

        <!-- Page title (editable) -->
        <UInput
          v-model="pageTitle"
          placeholder="Page title"
          class="w-64"
          @blur="savePageTitle"
          @keyup.enter="savePageTitle"
        />

        <!-- Status badge -->
        <div class="flex items-center gap-2">
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

        <!-- Edit/Preview Toggle -->
        <div class="flex items-center gap-1 p-1 bg-stone-100 dark:bg-stone-800 rounded-lg">
          <UButton
            :variant="mode === 'edit' ? 'solid' : 'ghost'"
            size="xs"
            icon="i-heroicons-pencil-square"
            color="neutral"
            @click="mode = 'edit'"
          >
            Edit
          </UButton>
          <UButton
            :variant="mode === 'preview' ? 'solid' : 'ghost'"
            size="xs"
            icon="i-heroicons-eye"
            color="neutral"
            @click="mode = 'preview'"
          >
            Preview
          </UButton>
        </div>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Actions -->
        <UButton
          variant="outline"
          color="neutral"
          :loading="isSaving"
          :disabled="!isDirty"
          @click="savePage({ title: pageTitle })"
        >
          Save
        </UButton>

        <UButton
          v-if="currentStatus !== 'published'"
          color="primary"
          :loading="isSaving"
          @click="publishPage"
        >
          Publish
        </UButton>
        <UButton
          v-else
          variant="outline"
          color="primary"
          :loading="isSaving"
          @click="unpublishPage"
        >
          Unpublish
        </UButton>

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-cog-6-tooth"
          @click="showSettingsSlideover = true"
        />
      </div>

      <!-- Three-column layout -->
      <div class="flex-1 flex overflow-hidden">
        <!-- Left: Block Library (hidden in preview mode) -->
        <PublisherBlockLibrary
          v-if="mode === 'edit'"
          :block-types="blockTypes"
          :page-type="pageType"
          :selected-area="selectedArea"
          @add-block="handleAddBlockFromLibrary"
        />

        <!-- Center: Page Canvas -->
        <PublisherPageCanvas
          :blocks="blocks"
          :page-type="pageType"
          :block-types="blockTypes"
          :selected-block-id="selectedBlockId"
          :mode="mode"
          @select-block="handleSelectBlock"
          @delete-block="handleDeleteBlock"
          @add-block="handleAddBlock"
          @reorder-blocks="handleReorderBlocks"
        />

        <!-- Right: Block Settings (hidden in preview mode) -->
        <PublisherBlockSettings
          v-if="mode === 'edit'"
          :block="selectedBlock"
          :block-type="selectedBlockType"
          @update-block="handleUpdateBlock"
          @delete-block="handleDeleteBlock"
        />
      </div>
    </template>

    <!-- Settings Slideover -->
    <USlideover
      v-model:open="showSettingsSlideover"
      title="Page Settings"
      side="right"
    >
      <template #body>
        <div class="p-6 space-y-6">
          <!-- Page info -->
          <div class="space-y-2 text-sm text-stone-500 dark:text-stone-400">
            <p><span class="font-medium text-stone-700 dark:text-stone-300">ID:</span> {{ page?.id }}</p>
            <p><span class="font-medium text-stone-700 dark:text-stone-300">Type:</span> {{ pageType?.displayName || page?.pageType }}</p>
            <p v-if="page?.createdAt"><span class="font-medium text-stone-700 dark:text-stone-300">Created:</span> {{ formatDate(page.createdAt) }}</p>
            <p v-if="page?.updatedAt"><span class="font-medium text-stone-700 dark:text-stone-300">Updated:</span> {{ formatDate(page.updatedAt) }}</p>
            <p v-if="page?.publishedAt"><span class="font-medium text-stone-700 dark:text-stone-300">Published:</span> {{ formatDate(page.publishedAt) }}</p>
          </div>

          <USeparator />

          <!-- URL Settings -->
          <div>
            <h4 class="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">
              URL Settings
            </h4>
            <div class="space-y-4">
              <UFormField label="Slug" name="slug" hint="URL path for this page">
                <UInput
                  v-model="seoForm.slug"
                  placeholder="page-url-slug"
                  class="w-full"
                />
              </UFormField>
              <div v-if="slugChanged" class="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                <UIcon name="i-heroicons-exclamation-triangle" class="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <p class="text-sm text-amber-700 dark:text-amber-300">
                  <strong>Warning:</strong> Changing the slug will break existing URLs to this page. Make sure to set up redirects if needed.
                </p>
              </div>
            </div>
          </div>

          <USeparator />

          <!-- SEO Settings -->
          <div>
            <h4 class="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-4">
              SEO Settings
            </h4>
            <div class="space-y-4">
              <UFormField label="Meta Title" name="metaTitle" hint="Override page title for SEO">
                <UInput
                  v-model="seoForm.metaTitle"
                  placeholder="Page title for search engines"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Meta Description" name="metaDescription">
                <UTextarea
                  v-model="seoForm.metaDescription"
                  placeholder="Brief description for search results"
                  :rows="3"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="OG Image ID" name="metaImage" hint="Media ID for social sharing image">
                <UInput
                  v-model="seoForm.metaImage"
                  type="number"
                  placeholder="123"
                  class="w-full"
                />
              </UFormField>

              <UFormField label="Meta Extra" name="metaExtra" hint="Custom JSON for og:tags, twitter cards, etc.">
                <UTextarea
                  v-model="seoForm.metaExtra"
                  placeholder='{"og:type": "article", "twitter:card": "summary_large_image"}'
                  :rows="4"
                  class="w-full font-mono text-sm"
                />
              </UFormField>
            </div>
          </div>

          <!-- Save button -->
          <div class="pt-4">
            <UButton
              block
              color="primary"
              :loading="isSaving"
              @click="saveSeoSettings"
            >
              Save Settings
            </UButton>
          </div>
        </div>
      </template>
    </USlideover>
  </div>
</template>
