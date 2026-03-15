<script setup lang="ts">
import { z } from 'zod'
import type { MenuItemType } from '~/lib/publisher/types'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Switch } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { Info } from 'lucide-vue-next'

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

const { toast } = useToast()

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
    value: String(page.id),
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
    toast({
      title: 'Validation failed',
      description: 'Please fix the errors in the form',
      variant: 'destructive',
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

    toast({
      title: props.item ? 'Menu item updated' : 'Menu item created',
    })
  }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save menu item'
    toast({
      title: 'Error',
      description: message,
      variant: 'destructive',
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
    <div class="space-y-2">
      <Label>Type <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <Select v-model="form.type">
        <SelectTrigger class="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in typeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
        </SelectContent>
      </Select>
      <p v-if="formErrors.type" class="text-sm text-[hsl(var(--destructive))]">{{ formErrors.type }}</p>
    </div>

    <!-- Label (common to all types) -->
    <div class="space-y-2">
      <Label for="menuLabel">Label <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <Input
        id="menuLabel"
        v-model="form.label"
        placeholder="e.g., About Us"
        class="w-full"
      />
      <p class="text-xs text-[hsl(var(--muted-foreground))]">The text displayed for this menu item</p>
      <p v-if="formErrors.label" class="text-sm text-[hsl(var(--destructive))]">{{ formErrors.label }}</p>
    </div>

    <!-- Dynamic Fields Based on Type -->
    <template v-if="form.type === 'page'">
      <div class="space-y-2">
        <Label>Page <span class="text-[hsl(var(--destructive))]">*</span></Label>
        <Select v-model="form.pageId">
          <SelectTrigger class="w-full"><SelectValue placeholder="Select a page" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in pageOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-[hsl(var(--muted-foreground))]">Select the CMS page to link to</p>
        <p v-if="formErrors.pageId" class="text-sm text-[hsl(var(--destructive))]">{{ formErrors.pageId }}</p>
      </div>
    </template>

    <template v-if="form.type === 'external'">
      <div class="space-y-2">
        <Label for="menuUrl">URL <span class="text-[hsl(var(--destructive))]">*</span></Label>
        <Input
          id="menuUrl"
          v-model="form.url"
          placeholder="https://example.com"
          class="w-full"
        />
        <p class="text-xs text-[hsl(var(--muted-foreground))]">Full URL including https://</p>
        <p v-if="formErrors.url" class="text-sm text-[hsl(var(--destructive))]">{{ formErrors.url }}</p>
      </div>
    </template>

    <template v-if="form.type === 'label'">
      <div class="p-3 rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))]">
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          <Info class="inline-block h-4 w-4 mr-1" />
          Label items don't link anywhere. They're useful for grouping items under a heading.
        </p>
      </div>
    </template>

    <!-- Common Fields -->
    <div class="space-y-2">
      <Label>Open in</Label>
      <Select v-model="form.target">
        <SelectTrigger class="w-full"><SelectValue placeholder="Select target" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in targetOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
        </SelectContent>
      </Select>
      <p v-if="formErrors.target" class="text-sm text-[hsl(var(--destructive))]">{{ formErrors.target }}</p>
    </div>

    <div class="space-y-2">
      <Label for="menuIcon">Icon</Label>
      <Input
        id="menuIcon"
        v-model="form.icon"
        placeholder="e.g., Home"
        class="w-full"
      />
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Lucide icon name (e.g., Home, Settings, File)</p>
      <p v-if="formErrors.icon" class="text-sm text-[hsl(var(--destructive))]">{{ formErrors.icon }}</p>
    </div>

    <div class="space-y-2">
      <Label for="menuCssClass">CSS Class</Label>
      <Input
        id="menuCssClass"
        v-model="form.cssClass"
        placeholder="e.g., nav-highlight featured"
        class="w-full"
      />
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Additional CSS classes for styling</p>
      <p v-if="formErrors.cssClass" class="text-sm text-[hsl(var(--destructive))]">{{ formErrors.cssClass }}</p>
    </div>

    <div class="space-y-2">
      <Label>Visible</Label>
      <div class="flex items-center gap-2">
        <Switch v-model:checked="form.visible" />
        <span class="text-xs text-[hsl(var(--muted-foreground))]">Hidden items won't appear in the menu</span>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex justify-end gap-2 pt-4 border-t border-[hsl(var(--border))]">
      <Button
        v-if="onCancel || $attrs.onCancel"
        variant="ghost"
        type="button"
        @click="handleCancel"
      >
        Cancel
      </Button>
      <Button
        type="submit"
        :disabled="!form.label || isSubmitting"
      >
        {{ item ? 'Update Item' : 'Create Item' }}
      </Button>
    </div>
  </form>
</template>
