<script setup lang="ts">
import { ArrowLeft, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { useToast } from '@spavn/ui'

definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

const route = useRoute()
const { toast } = useToast()
const typeName = computed(() => route.params.type as string)
const isSaving = ref(false)

// Fetch content type config
const { data: typeData } = await useFetch<{ data: any[] }>('/api/publisher/types')
const contentType = computed(() => typeData.value?.data?.find((t: any) => t.pluralName === typeName.value))

// Form state
const formData = ref<Record<string, unknown>>({})

// Initialize defaults
watch(contentType, (ct) => {
  if (!ct) return
  const defaults: Record<string, unknown> = {}
  for (const [name, config] of Object.entries(ct.fields) as [string, any][]) {
    defaults[name] = config.default ?? (config.type === 'boolean' ? false : config.type === 'number' ? null : '')
  }
  formData.value = defaults
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

// Status for draftAndPublish
const entryStatus = ref('draft')

async function save(publish = false) {
  isSaving.value = true

  try {
    const body = { ...formData.value }

    // Remove empty strings and null values for non-required fields
    for (const [key, value] of Object.entries(body)) {
      if (value === '' || value === null) {
        const fieldConfig = contentType.value?.fields[key]
        if (!fieldConfig?.required) {
          delete body[key]
        }
      }
    }

    const result = await $fetch<{ data: any }>(`/api/v1/${typeName.value}`, {
      method: 'POST',
      body,
    })

    // Publish if requested
    if (publish && contentType.value?.options?.draftAndPublish && result.data?.id) {
      await $fetch(`/api/v1/${typeName.value}/${result.data.id}`, {
        method: 'PATCH',
        body: { status: 'published' },
      })
    }

    toast({ title: publish ? 'Published!' : 'Saved as draft' })
    await navigateTo(`/admin/content/${typeName.value}/${result.data.id}`)
  }
  catch (e: any) {
    const message = e?.data?.data?.error?.message || 'Failed to save'
    toast({ title: message, variant: 'destructive' })
  }
  finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div v-if="contentType">
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center gap-3">
        <Button variant="ghost" as-child>
          <NuxtLink :to="`/admin/content/${typeName}`">
            <ArrowLeft class="h-4 w-4" />
          </NuxtLink>
        </Button>
        <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">
          New {{ contentType.displayName }}
        </h2>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <!-- Main form (70%) -->
      <div class="lg:col-span-3">
        <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6">
          <form @submit.prevent="save(false)" class="space-y-5">
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
            <Button class="w-full" variant="outline" @click="save(false)" :disabled="isSaving">
              <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
              Save Draft
            </Button>
            <Button
              v-if="contentType.options?.draftAndPublish"
              class="w-full"
              variant="outline"
              @click="save(true)"
              :disabled="isSaving"
            >
              <Loader2 v-if="isSaving" class="h-4 w-4 mr-2 animate-spin" />
              Save & Publish
            </Button>
          </div>
        </div>

        <!-- Boolean fields in sidebar -->
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
      </div>
    </div>
  </div>
</template>
