<script setup lang="ts">
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Textarea } from '@spavn/ui'
import { Switch } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'

const props = defineProps<{
  fieldName: string
  fieldConfig: {
    type: string
    label?: string
    hint?: string
    required?: boolean
    maxLength?: number
    minLength?: number
    options?: string[]
    targetField?: string
    min?: number
    max?: number
    multiple?: boolean
    allowedTypes?: string[]
    allowFolderSelection?: boolean
    maxSelection?: number
  }
  modelValue: unknown
  /** Pass the full form data so uid fields can watch their target field */
  formData?: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:modelValue': [value: unknown]
}>()

// ─── Slug helper (client-side, matches server slugify) ──────────
function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// Track whether the user has manually edited the slug
const userEditedSlug = ref(false)

const stringValue = computed({
  get: () => {
    const val = props.modelValue
    // Guard against non-string values (e.g. Promise objects stored as {})
    if (val === null || val === undefined || val === '') return ''
    if (typeof val === 'object') return ''
    return String(val)
  },
  set: (v: string) => {
    // If user types in the slug field, mark it as manually edited
    if (props.fieldConfig.type === 'uid') {
      userEditedSlug.value = true
    }
    emit('update:modelValue', v)
  },
})

// ─── Auto-generate slug from target field as user types ─────────
if (props.fieldConfig.type === 'uid' && props.fieldConfig.targetField && props.formData) {
  watch(
    () => props.formData?.[props.fieldConfig.targetField!],
    (newTargetValue) => {
      // Only auto-generate if the user hasn't manually edited the slug
      if (userEditedSlug.value) return
      if (!newTargetValue || typeof newTargetValue !== 'string') return
      emit('update:modelValue', slugify(newTargetValue))
    },
  )
}

const numberValue = computed({
  get: () => Number(props.modelValue) || 0,
  set: (v: number) => emit('update:modelValue', v),
})

const booleanValue = computed({
  get: () => Boolean(props.modelValue),
  set: (v: boolean) => emit('update:modelValue', v),
})

const jsonString = computed({
  get: () => {
    if (typeof props.modelValue === 'object' && props.modelValue !== null) {
      return JSON.stringify(props.modelValue, null, 2)
    }
    return String(props.modelValue ?? '{}')
  },
  set: (v: string) => {
    try { emit('update:modelValue', JSON.parse(v)) }
    catch { /* invalid JSON, ignore */ }
  },
})

const mediaValue = computed({
  get: () => props.modelValue as number | number[] | null,
  set: (v: number | number[] | null) => emit('update:modelValue', v),
})

const label = computed(() => props.fieldConfig.label || props.fieldName)
</script>

<template>
  <div class="space-y-2">
    <Label :for="fieldName">
      {{ label }}
      <span v-if="fieldConfig.required" class="text-[hsl(var(--destructive))]">*</span>
    </Label>
    <p v-if="fieldConfig.hint" class="text-xs text-[hsl(var(--muted-foreground))]">{{ fieldConfig.hint }}</p>

    <!-- String / Email -->
    <Input
      v-if="fieldConfig.type === 'string' || fieldConfig.type === 'email'"
      :id="fieldName"
      v-model="stringValue"
      :type="fieldConfig.type === 'email' ? 'email' : 'text'"
      :placeholder="`Enter ${label.toLowerCase()}`"
      :maxlength="fieldConfig.maxLength"
      class="w-full"
    />

    <!-- Password -->
    <Input
      v-else-if="fieldConfig.type === 'password'"
      :id="fieldName"
      v-model="stringValue"
      type="password"
      :placeholder="`Enter ${label.toLowerCase()}`"
      class="w-full"
    />

    <!-- Text -->
    <Textarea
      v-else-if="fieldConfig.type === 'text'"
      :id="fieldName"
      v-model="stringValue"
      :placeholder="`Enter ${label.toLowerCase()}`"
      :rows="4"
      class="w-full"
    />

    <!-- Rich Text -->
    <Textarea
      v-else-if="fieldConfig.type === 'richtext'"
      :id="fieldName"
      v-model="stringValue"
      :placeholder="`Enter ${label.toLowerCase()} (supports HTML/Markdown)`"
      :rows="8"
      class="w-full font-mono text-sm"
    />

    <!-- Number -->
    <Input
      v-else-if="fieldConfig.type === 'number'"
      :id="fieldName"
      v-model="numberValue"
      type="number"
      :min="fieldConfig.min"
      :max="fieldConfig.max"
      :placeholder="`Enter ${label.toLowerCase()}`"
      class="w-full"
    />

    <!-- Boolean -->
    <Switch
      v-else-if="fieldConfig.type === 'boolean'"
      v-model="booleanValue"
    />

    <!-- Date / DateTime -->
    <Input
      v-else-if="fieldConfig.type === 'date'"
      :id="fieldName"
      v-model="stringValue"
      type="date"
      class="w-full"
    />
    <Input
      v-else-if="fieldConfig.type === 'datetime'"
      :id="fieldName"
      v-model="stringValue"
      type="datetime-local"
      class="w-full"
    />

    <!-- UID / Slug -->
    <Input
      v-else-if="fieldConfig.type === 'uid'"
      :id="fieldName"
      v-model="stringValue"
      :placeholder="'Auto-generated from ' + (fieldConfig.targetField || 'title')"
      class="w-full font-mono text-sm"
    />

    <!-- Enum -->
    <Select
      v-else-if="fieldConfig.type === 'enum'"
      v-model="stringValue"
    >
      <SelectTrigger class="w-full"><SelectValue :placeholder="`Select ${label.toLowerCase()}`" /></SelectTrigger>
      <SelectContent>
        <SelectItem v-for="o in (fieldConfig.options || [])" :key="o" :value="o">{{ o }}</SelectItem>
      </SelectContent>
    </Select>

    <!-- JSON -->
    <Textarea
      v-else-if="fieldConfig.type === 'json'"
      :id="fieldName"
      v-model="jsonString"
      :placeholder="'{ }'"
      :rows="6"
      class="w-full font-mono text-sm"
    />

    <!-- Media -->
    <PublisherMediaPicker
      v-else-if="fieldConfig.type === 'media'"
      v-model="mediaValue"
      :multiple="fieldConfig.multiple || false"
      :allowed-types="fieldConfig.allowedTypes || ['image/*']"
      :allow-folder-selection="fieldConfig.allowFolderSelection || false"
      :max-selection="fieldConfig.maxSelection || 10"
      :label="label"
    />

    <!-- Relation -->
    <Input
      v-else-if="fieldConfig.type === 'relation'"
      :id="fieldName"
      v-model="numberValue"
      placeholder="Related ID"
      type="number"
      class="w-full"
    />

    <!-- Fallback -->
    <Input
      v-else
      :id="fieldName"
      v-model="stringValue"
      :placeholder="`Enter ${label.toLowerCase()}`"
      class="w-full"
    />
  </div>
</template>
