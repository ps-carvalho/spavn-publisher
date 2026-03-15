<script setup lang="ts">
import { ArrowLeft, RefreshCw, File, FileText, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Card, CardContent } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const { toast } = useToast()

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

    toast({ title: 'Page created' })
    await navigateTo(`/admin/pages/${result.data.id}`)
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || e?.data?.error?.message || 'Failed to create page'
    toast({ title: message, variant: 'destructive' })
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
          <Button variant="ghost" as-child>
            <NuxtLink to="/admin/pages">
              <ArrowLeft class="h-4 w-4" />
            </NuxtLink>
          </Button>
          <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
            Create New Page
          </h2>
        </div>
      </div>

      <!-- Loading state -->
      <div v-if="pageTypesStatus === 'pending'" class="flex items-center justify-center py-12">
        <RefreshCw class="h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      </div>

      <!-- Page types grid -->
      <div v-else-if="pageTypes.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card
          v-for="pageType in pageTypes"
          :key="pageType.name"
          class="cursor-pointer hover:ring-2 hover:ring-primary transition-all"
          :class="{ 'ring-2 ring-primary': selectedPageType?.name === pageType.name }"
          @click="selectPageType(pageType)"
        >
          <CardContent class="pt-6">
            <div class="flex items-start gap-3">
              <File class="h-6 w-6 text-[hsl(var(--muted-foreground))] mt-0.5" />
              <div class="flex-1 min-w-0">
                <p class="font-semibold text-[hsl(var(--foreground))]">
                  {{ pageType.displayName }}
                </p>
                <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  {{ pageType.description || 'No description' }}
                </p>
                <p class="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                  {{ Object.keys(pageType.areas || {}).length }} areas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- Empty state -->
      <div v-else class="text-center py-12">
        <FileText class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
        <p class="text-[hsl(var(--muted-foreground))]">No page types available.</p>
      </div>
    </div>

    <!-- Step 2: Enter Page Details -->
    <div v-else-if="step === 2">
      <!-- Page header -->
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <Button variant="ghost" @click="goBack">
            <ArrowLeft class="h-4 w-4" />
          </Button>
          <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
            Page Details
          </h2>
        </div>
      </div>

      <!-- Selected page type info -->
      <div class="mb-6 p-4 rounded-lg bg-[hsl(var(--muted))] flex items-center gap-3">
        <File class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
        <div>
          <p class="font-medium text-[hsl(var(--foreground))]">
            {{ selectedPageType?.displayName }}
          </p>
          <p class="text-sm text-[hsl(var(--muted-foreground))]">
            {{ selectedPageType?.description || 'No description' }}
          </p>
        </div>
      </div>

      <!-- Form -->
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
        <form @submit.prevent="createPage" class="space-y-5">
          <!-- Title -->
          <div class="space-y-2">
            <label class="block text-sm font-medium text-[hsl(var(--foreground))]">
              Title <span class="text-[hsl(var(--destructive))]">*</span>
            </label>
            <Input
              v-model="title"
              placeholder="Enter page title"
              :disabled="isCreating"
            />
          </div>

          <!-- Auto-generated slug -->
          <div v-if="slug">
            <label class="block text-sm font-medium text-[hsl(var(--muted-foreground))] mb-1">
              Slug
            </label>
            <p class="font-mono text-sm text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-3 py-2 rounded">
              {{ slug }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-3 pt-4">
            <Button
              type="submit"
              :disabled="!title.trim() || isCreating"
            >
              <Loader2 v-if="isCreating" class="h-4 w-4 mr-2 animate-spin" />
              Create Page
            </Button>
            <Button
              variant="ghost"
              @click="goBack"
              :disabled="isCreating"
            >
              Back
            </Button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>
