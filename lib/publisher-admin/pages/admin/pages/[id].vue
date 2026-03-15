<script setup lang="ts">
import { ArrowLeft, RefreshCw, AlertTriangle, PenSquare, Eye, Settings, Loader2 } from 'lucide-vue-next'
import { Button, Input, Textarea, Label, Separator, Sheet, SheetContent, SheetHeader, SheetTitle, useToast } from '@spavn/ui'

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

const { toast } = useToast()

// Save SEO settings
async function saveSeoSettings() {
  // Parse metaExtra if provided
  let metaExtraParsed: Record<string, unknown> | undefined
  if (seoForm.value.metaExtra.trim()) {
    try {
      metaExtraParsed = JSON.parse(seoForm.value.metaExtra)
    }
    catch {
      toast({ title: 'Invalid JSON', description: 'Meta Extra must be valid JSON', variant: 'destructive' })
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
  if (status === 'published') return 'bg-[hsl(var(--accent))]'
  return 'bg-[hsl(var(--muted-foreground))]'
}

function getStatusTextClass(status: string): string {
  if (status === 'published') return 'text-[hsl(var(--accent-foreground))]'
  return 'text-[hsl(var(--muted-foreground))]'
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
        <RefreshCw class="h-8 w-8 animate-spin text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">Loading page...</p>
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="flex-1 flex items-center justify-center">
      <div class="text-center">
        <AlertTriangle class="h-8 w-8 text-[hsl(var(--destructive))] mx-auto mb-3" />
        <p class="text-[hsl(var(--muted-foreground))] mb-4">{{ error.message }}</p>
        <Button variant="outline" @click="loadPage">
          Try Again
        </Button>
      </div>
    </div>

    <!-- Main editor -->
    <template v-else-if="page">
      <!-- Top bar -->
      <div class="h-14 border-b border-[hsl(var(--border))] bg-[hsl(var(--card))] flex items-center px-4 gap-4">
        <!-- Back button -->
        <Button variant="ghost" as-child>
          <NuxtLink to="/admin/pages">
            <ArrowLeft class="h-4 w-4" />
          </NuxtLink>
        </Button>

        <!-- Page title (editable) -->
        <Input
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
        <div class="flex items-center gap-1 p-1 bg-[hsl(var(--muted))] rounded-lg">
          <Button
            :variant="mode === 'edit' ? 'default' : 'ghost'"
            size="sm"
            @click="mode = 'edit'"
          >
            <PenSquare class="h-4 w-4 mr-1" />
            Edit
          </Button>
          <Button
            :variant="mode === 'preview' ? 'default' : 'ghost'"
            size="sm"
            @click="mode = 'preview'"
          >
            <Eye class="h-4 w-4 mr-1" />
            Preview
          </Button>
        </div>

        <!-- Spacer -->
        <div class="flex-1" />

        <!-- Actions -->
        <Button
          variant="outline"
          :disabled="!isDirty || isSaving"
          @click="savePage({ title: pageTitle })"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
          Save
        </Button>

        <Button
          v-if="currentStatus !== 'published'"
          :disabled="isSaving"
          @click="publishPage"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
          Publish
        </Button>
        <Button
          v-else
          variant="outline"
          :disabled="isSaving"
          @click="unpublishPage"
        >
          <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
          Unpublish
        </Button>

        <Button
          variant="ghost"
          @click="showSettingsSlideover = true"
        >
          <Settings class="h-4 w-4" />
        </Button>
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
    <Sheet v-model:open="showSettingsSlideover">
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Page Settings</SheetTitle>
        </SheetHeader>
        <div class="p-6 space-y-6">
          <!-- Page info -->
          <div class="space-y-2 text-sm text-[hsl(var(--muted-foreground))]">
            <p><span class="font-medium text-[hsl(var(--foreground))]">ID:</span> {{ page?.id }}</p>
            <p><span class="font-medium text-[hsl(var(--foreground))]">Type:</span> {{ pageType?.displayName || page?.pageType }}</p>
            <p v-if="page?.createdAt"><span class="font-medium text-[hsl(var(--foreground))]">Created:</span> {{ formatDate(page.createdAt) }}</p>
            <p v-if="page?.updatedAt"><span class="font-medium text-[hsl(var(--foreground))]">Updated:</span> {{ formatDate(page.updatedAt) }}</p>
            <p v-if="page?.publishedAt"><span class="font-medium text-[hsl(var(--foreground))]">Published:</span> {{ formatDate(page.publishedAt) }}</p>
          </div>

          <Separator />

          <!-- URL Settings -->
          <div>
            <h4 class="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
              URL Settings
            </h4>
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="slug">Slug</Label>
                <Input
                  id="slug"
                  v-model="seoForm.slug"
                  placeholder="page-url-slug"
                  class="w-full"
                />
                <p class="text-xs text-[hsl(var(--muted-foreground))]">URL path for this page</p>
              </div>
              <div v-if="slugChanged" class="flex items-start gap-2 p-3 bg-[hsl(var(--accent))] rounded-lg border border-[hsl(var(--border))]">
                <AlertTriangle class="h-4 w-4 text-[hsl(var(--muted-foreground))] mt-0.5 flex-shrink-0" />
                <p class="text-sm text-[hsl(var(--foreground))]">
                  <strong>Warning:</strong> Changing the slug will break existing URLs to this page. Make sure to set up redirects if needed.
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <!-- SEO Settings -->
          <div>
            <h4 class="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">
              SEO Settings
            </h4>
            <div class="space-y-4">
              <div class="space-y-2">
                <Label for="metaTitle">Meta Title</Label>
                <Input
                  id="metaTitle"
                  v-model="seoForm.metaTitle"
                  placeholder="Page title for search engines"
                  class="w-full"
                />
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Override page title for SEO</p>
              </div>

              <div class="space-y-2">
                <Label for="metaDescription">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  v-model="seoForm.metaDescription"
                  placeholder="Brief description for search results"
                  :rows="3"
                  class="w-full"
                />
              </div>

              <div class="space-y-2">
                <Label for="metaImage">OG Image ID</Label>
                <Input
                  id="metaImage"
                  v-model="seoForm.metaImage"
                  type="number"
                  placeholder="123"
                  class="w-full"
                />
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Media ID for social sharing image</p>
              </div>

              <div class="space-y-2">
                <Label for="metaExtra">Meta Extra</Label>
                <Textarea
                  id="metaExtra"
                  v-model="seoForm.metaExtra"
                  placeholder='{"og:type": "article", "twitter:card": "summary_large_image"}'
                  :rows="4"
                  class="w-full font-mono text-sm"
                />
                <p class="text-xs text-[hsl(var(--muted-foreground))]">Custom JSON for og:tags, twitter cards, etc.</p>
              </div>
            </div>
          </div>

          <!-- Save button -->
          <div class="pt-4">
            <Button
              class="w-full"
              :disabled="isSaving"
              @click="saveSeoSettings"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
              Save Settings
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  </div>
</template>
