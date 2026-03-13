<script setup lang="ts">
import { z } from 'zod'
import type { MenuItemType } from '~/lib/publisher/types'

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface MenuItem {
  id?: number
  label: string
  type: MenuItemType
  url?: string | null
  pageId?: number | null
  target?: '_blank' | '_self' | null
  icon?: string | null
  cssClass?: string | null
  visible?: boolean
  metadata?: Record<string, unknown> | null
  parentId?: number | null
  sortOrder?: number
}

export interface Page {
  id: number
  title: string
  slug: string
}

// ─── Props & Emits ─────────────────────────────────────────────────────────────

const props = defineProps<{
  menuId: number
  item?: MenuItem
  pages?: Page[]
  onSubmit: (data: any) => Promise<void> | void
  onCancel?: () => void
}>()

const emit = defineEmits<{
  cancel: []
  submitted: [data: any]
}>()

// ─── State ─────────────────────────────────────────────────────────────────────

const isSubmitting = ref(false)
const formErrors = ref<Record<string, string>>({})

const form = reactive({
  label: props.item?.label || '',
  type: props.item?.type || 'page' as MenuItemType,
  url: props.item?.url || '',
  pageId: props.item?.pageId || props.item?.metadata?.pageId || undefined as number | undefined,
  target: props.item?.target || '_self' as '_blank' | '_self',
  icon: props.item?.icon || '',
  cssClass: props.item?.cssClass || '',
  visible: props.item?.visible !== false,
})

// ─── Toast ────────────────────────────────────────────────────────────────────

const toast = useToast()

// ─── Options ──────────────────────────────────────────────────────────────────

const typeOptions = [
  { value: 'page', label: 'Internal Page' },
  { value: 'external', label: 'External URL' },
  { value: 'label', label: 'Label (No Link)' },
]

const targetOptions = [
  { value: '_self', label: 'Same Window' },
  { value: '_blank', label: 'New Window' },
]

// ─── Fetch Pages ───────────────────────────────────────────────────────────────

const { data: pagesData } = await useFetch<{ data: Page[] }>('/api/v1/pages', {
  query: { 'pagination[pageSize]': 500 },
  lazy: true,
})

const pages = computed(() => props.pages || pagesData.value?.data || [])

const pageOptions = computed(() =>
  pages.value.map(page => ({
    value: page.id,
    label: `${page.title} (${page.slug})`,
  })),
)

// ─── Validation Schema ─────────────────────────────────────────────────────────

const schema = z.object({
  label: z.string().min(1, 'Label is required').max(255, 'Label must be 255 characters or less'),
  type: z.enum(['page', 'external', 'label']),
  url: z.string().max(500, 'URL must be 500 characters or less').optional(),
  pageId: z.number().int().positive().optional(),
  target: z.enum(['_blank', '_self']).optional(),
  icon: z.string().max(100, 'Icon must be 100 characters or less').optional(),
  cssClass: z.string().max(100, 'CSS class must be 100 characters or less').optional(),
  visible: z.boolean(),
}).refine(
  (data) => {
    if (data.type === 'page' && !data.pageId) {
      return false
    }
    if (data.type === 'external' && !data.url) {
      return false
    }
    return true
  },
  {
    message: 'Page selection or URL is required based on type',
  },
)

// ─── Watch Type Changes ────────────────────────────────────────────────────────

watch(() => form.type, (newType) => {
  // Clear irrelevant fields when type changes
  if (newType !== 'page') {
    form.pageId = undefined
  }
  if (newType !== 'external') {
    form.url = ''
  }
  // Clear validation errors for type-specific fields
  delete formErrors.value.pageId
  delete formErrors.value.url
})

// ─── Validation ────────────────────────────────────────────────────────────────

function validateForm(): boolean {
  formErrors.value = {}

  // Basic schema validation
  const result = schema.safeParse(form)
  if (!result.success) {
    for (const issue of result.error.issues) {
      const field = issue.path[0] as string
      if (!formErrors.value[field]) {
        formErrors.value[field] = issue.message
      }
    }
    return false
  }

  // Additional type-specific validation
  if (form.type === 'page' && !form.pageId) {
    formErrors.value.pageId = 'Page selection is required for page type'
    return false
  }

  if (form.type === 'external' && !form.url) {
    formErrors.value.url = 'URL is required for external type'
    return false
  }

  // URL format validation for external type
  if (form.type === 'external' && form.url) {
    try {
      new URL(form.url)
    }
    catch {
      formErrors.value.url = 'Please enter a valid URL'
      return false
    }
  }

  return true
}

// ─── Submit Handler ────────────────────────────────────────────────────────────

async function handleSubmit() {
  if (!validateForm()) {
    toast.add({
      title: 'Validation failed',
      description: 'Please fix the errors in the form',
      color: 'error',
    })
    return
  }

  isSubmitting.value = true

  try {
    // Build payload
    const payload: Record<string, unknown> = {
      label: form.label,
      type: form.type,
      target: form.target || '_self',
      icon: form.icon || null,
      cssClass: form.cssClass || null,
      visible: form.visible,
    }

    if (form.type === 'page' && form.pageId) {
      payload.pageId = form.pageId
    }
    else if (form.type === 'external' && form.url) {
      payload.url = form.url
    }

    // Include parentId and sortOrder if editing
    if (props.item?.parentId !== undefined) {
      payload.parentId = props.item.parentId
    }
    if (props.item?.sortOrder !== undefined) {
      payload.sortOrder = props.item.sortOrder
    }

    await props.onSubmit(payload)
    emit('submitted', payload)

    toast.add({
      title: props.item ? 'Menu item updated' : 'Menu item created',
      color: 'success',
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save menu item'
    toast.add({
      title: 'Error',
      description: message,
      color: 'error',
    })
  }
  finally {
    isSubmitting.value = false
  }
}

// ─── Cancel Handler ────────────────────────────────────────────────────────────

function handleCancel() {
  emit('cancel')
  props.onCancel?.()
}
</script>

<template>
  <form class="space-y-4" @submit.prevent="handleSubmit">
    <!-- Type Selection -->
    <UFormField label="Type" required :error="formErrors.type">
      <USelect
        v-model="form.type"
        :items="typeOptions"
        value-key="value"
        placeholder="Select type"
        class="w-full"
      />
    </UFormField>

    <!-- Label (common to all types) -->
    <UFormField label="Label" required :error="formErrors.label">
      <UInput
        v-model="form.label"
        placeholder="e.g., About Us"
        class="w-full"
      />
      <template #hint>
        <span class="text-xs text-stone-400">The text displayed for this menu item</span>
      </template>
    </UFormField>

    <!-- Dynamic Fields Based on Type -->
    <template v-if="form.type === 'page'">
      <UFormField label="Page" required :error="formErrors.pageId">
        <USelectMenu
          v-model="form.pageId"
          :items="pageOptions"
          value-key="value"
          placeholder="Select a page"
          searchable
          class="w-full"
        />
        <template #hint>
          <span class="text-xs text-stone-400">Select the CMS page to link to</span>
        </template>
      </UFormField>
    </template>

    <template v-if="form.type === 'external'">
      <UFormField label="URL" required :error="formErrors.url">
        <UInput
          v-model="form.url"
          placeholder="https://example.com"
          class="w-full"
        />
        <template #hint>
          <span class="text-xs text-stone-400">Full URL including https://</span>
        </template>
      </UFormField>
    </template>

    <template v-if="form.type === 'label'">
      <div class="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700">
        <p class="text-sm text-stone-500 dark:text-stone-400">
          <UIcon name="i-heroicons-information-circle" class="mr-1" />
          Label items don't link anywhere. They're useful for grouping items under a heading.
        </p>
      </div>
    </template>

    <!-- Common Fields -->
    <UFormField label="Open in" :error="formErrors.target">
      <USelect
        v-model="form.target"
        :items="targetOptions"
        value-key="value"
        placeholder="Select target"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Icon" :error="formErrors.icon">
      <UInput
        v-model="form.icon"
        placeholder="e.g., i-heroicons-home"
        class="w-full"
      >
        <template v-if="form.icon" #leading>
          <UIcon :name="form.icon" class="text-stone-500" />
        </template>
      </UInput>
      <template #hint>
        <span class="text-xs text-stone-400">Iconify icon class (e.g., i-heroicons-home)</span>
      </template>
    </UFormField>

    <UFormField label="CSS Class" :error="formErrors.cssClass">
      <UInput
        v-model="form.cssClass"
        placeholder="e.g., nav-highlight featured"
        class="w-full"
      />
      <template #hint>
        <span class="text-xs text-stone-400">Additional CSS classes for styling</span>
      </template>
    </UFormField>

    <UFormField label="Visible">
      <USwitch v-model:checked="form.visible" />
      <template #hint>
        <span class="text-xs text-stone-400">Hidden items won't appear in the menu</span>
      </template>
    </UFormField>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-4 border-t border-stone-200 dark:border-stone-800">
      <UButton
        v-if="onCancel || $attrs.onCancel"
        variant="ghost"
        color="neutral"
        type="button"
        @click="handleCancel"
      >
        Cancel
      </UButton>
      <UButton
        type="submit"
        color="neutral"
        :loading="isSubmitting"
        :disabled="!form.label"
      >
        {{ item ? 'Update Item' : 'Create Item' }}
      </UButton>
    </div>
  </form>
</template>
