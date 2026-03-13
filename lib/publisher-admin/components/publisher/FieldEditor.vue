<script setup lang="ts">
import type { FieldConfig, FieldType, RelationType } from '~~/lib/publisher/types'

const props = defineProps<{
  modelValue: Record<string, FieldConfig>
  mode: 'content' | 'block'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, FieldConfig>]
}>()

const toast = useToast()
const showFieldModal = ref(false)
const editingFieldName = ref<string | null>(null)
const isSubmitting = ref(false)

// Form state for new/edit field
const fieldForm = ref({
  name: '',
  type: 'string' as FieldType,
  required: false,
  unique: false,
  label: '',
  hint: '',
  // String/text fields
  maxLength: undefined as number | undefined,
  minLength: undefined as number | undefined,
  // Number fields
  min: undefined as number | undefined,
  max: undefined as number | undefined,
  // Enum fields
  options: '' as string,
  // UID fields
  targetField: '' as string,
  // Media fields
  multiple: false,
  allowedTypes: [] as string[],
  allowFolderSelection: false,
  // Relation fields
  relationTo: '' as string,
  relationType: 'oneToOne' as RelationType,
})

const fieldTypes: { label: string, value: FieldType }[] = [
  { label: 'String', value: 'string' },
  { label: 'Text (Long)', value: 'text' },
  { label: 'Rich Text', value: 'richtext' },
  { label: 'Number', value: 'number' },
  { label: 'Boolean', value: 'boolean' },
  { label: 'Date', value: 'date' },
  { label: 'Date & Time', value: 'datetime' },
  { label: 'UID (Slug)', value: 'uid' },
  { label: 'Media', value: 'media' },
  { label: 'Relation', value: 'relation' },
  { label: 'Enum', value: 'enum' },
  { label: 'JSON', value: 'json' },
  { label: 'Email', value: 'email' },
  { label: 'Password', value: 'password' },
]

const relationTypes: { label: string, value: RelationType }[] = [
  { label: 'One to One', value: 'oneToOne' },
  { label: 'One to Many', value: 'oneToMany' },
  { label: 'Many to One', value: 'manyToOne' },
  { label: 'Many to Many', value: 'manyToMany' },
]

const mediaTypeOptions = [
  { label: 'Images', value: 'image/*' },
  { label: 'Videos', value: 'video/*' },
  { label: 'Audio', value: 'audio/*' },
  { label: 'PDFs', value: 'application/pdf' },
  { label: 'Documents', value: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
]

const fields = computed(() => Object.entries(props.modelValue || {}))

const availableFieldsForTarget = computed(() => {
  // Get other string/text fields that could be used for UID generation
  return fields.value
    .filter(([name, config]) =>
      name !== editingFieldName.value
      && (config.type === 'string' || config.type === 'text'),
    )
    .map(([name]) => name)
})

type BadgeColor = 'error' | 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'neutral'

function getTypeColor(type: FieldType): BadgeColor {
  const colors: Record<string, BadgeColor> = {
    string: 'info',
    text: 'info',
    richtext: 'info',
    number: 'success',
    boolean: 'warning',
    date: 'info',
    datetime: 'info',
    uid: 'warning',
    media: 'warning',
    relation: 'info',
    enum: 'warning',
    json: 'neutral',
    email: 'info',
    password: 'error',
  }
  return colors[type] || 'neutral'
}

function resetForm() {
  fieldForm.value = {
    name: '',
    type: 'string',
    required: false,
    unique: false,
    label: '',
    hint: '',
    maxLength: undefined,
    minLength: undefined,
    min: undefined,
    max: undefined,
    options: '',
    targetField: '',
    multiple: false,
    allowedTypes: [],
    allowFolderSelection: false,
    relationTo: '',
    relationType: 'oneToOne',
  }
}

function openAddModal() {
  editingFieldName.value = null
  resetForm()
  showFieldModal.value = true
}

function openEditModal(fieldName: string, config: FieldConfig) {
  editingFieldName.value = fieldName
  fieldForm.value = {
    name: fieldName,
    type: config.type,
    required: config.required || false,
    unique: config.unique || false,
    label: config.label || '',
    hint: config.hint || '',
    maxLength: (config as any).maxLength,
    minLength: (config as any).minLength,
    min: (config as any).min,
    max: (config as any).max,
    options: (config as any).options?.join(', ') || '',
    targetField: (config as any).targetField || '',
    multiple: (config as any).multiple || false,
    allowedTypes: (config as any).allowedTypes || [],
    allowFolderSelection: (config as any).allowFolderSelection || false,
    relationTo: (config as any).relationTo || '',
    relationType: (config as any).relationType || 'oneToOne',
  }
  showFieldModal.value = true
}

function saveField() {
  if (!fieldForm.value.name.trim()) {
    toast.add({ title: 'Field name is required', color: 'error' })
    return
  }

  // Validate field name (alphanumeric + underscore)
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldForm.value.name)) {
    toast.add({ title: 'Field name must start with a letter or underscore and contain only alphanumeric characters', color: 'error' })
    return
  }

  // Check for duplicate names (unless editing the same field)
  if (fieldForm.value.name !== editingFieldName.value && props.modelValue[fieldForm.value.name]) {
    toast.add({ title: 'A field with this name already exists', color: 'error' })
    return
  }

  // Type-specific validation
  if (fieldForm.value.type === 'uid' && !fieldForm.value.targetField) {
    toast.add({ title: 'UID field requires a target field', color: 'error' })
    return
  }

  if (fieldForm.value.type === 'relation' && !fieldForm.value.relationTo) {
    toast.add({ title: 'Relation field requires a related content type', color: 'error' })
    return
  }

  if (fieldForm.value.type === 'enum' && !fieldForm.value.options.trim()) {
    toast.add({ title: 'Enum field requires at least one option', color: 'error' })
    return
  }

  // Build the field config
  const config: Record<string, any> = {
    type: fieldForm.value.type,
    required: fieldForm.value.required || undefined,
    unique: fieldForm.value.unique || undefined,
    label: fieldForm.value.label || undefined,
    hint: fieldForm.value.hint || undefined,
  }

  // Add type-specific options
  if (['string', 'text', 'richtext', 'email', 'password'].includes(fieldForm.value.type)) {
    if (fieldForm.value.maxLength) config.maxLength = fieldForm.value.maxLength
    if (fieldForm.value.minLength) config.minLength = fieldForm.value.minLength
  }

  if (fieldForm.value.type === 'number') {
    if (fieldForm.value.min !== undefined) config.min = fieldForm.value.min
    if (fieldForm.value.max !== undefined) config.max = fieldForm.value.max
  }

  if (fieldForm.value.type === 'enum') {
    config.options = fieldForm.value.options.split(',').map(s => s.trim()).filter(Boolean)
  }

  if (fieldForm.value.type === 'uid') {
    config.targetField = fieldForm.value.targetField
  }

  if (fieldForm.value.type === 'media') {
    if (fieldForm.value.multiple) config.multiple = true
    if (fieldForm.value.allowedTypes.length > 0) config.allowedTypes = fieldForm.value.allowedTypes
    if (fieldForm.value.allowFolderSelection) config.allowFolderSelection = true
  }

  if (fieldForm.value.type === 'relation') {
    config.relationTo = fieldForm.value.relationTo
    config.relationType = fieldForm.value.relationType
  }

  // Clean up undefined values
  for (const key of Object.keys(config)) {
    if (config[key] === undefined) delete config[key]
  }

  // Update the model
  const updated = { ...props.modelValue }

  // If editing and name changed, remove old key
  if (editingFieldName.value && editingFieldName.value !== fieldForm.value.name) {
    delete updated[editingFieldName.value]
  }

  updated[fieldForm.value.name] = config as FieldConfig
  emit('update:modelValue', updated)

  showFieldModal.value = false
  toast.add({ title: editingFieldName.value ? 'Field updated' : 'Field added', color: 'success' })
}

function deleteField(fieldName: string) {
  if (!confirm(`Delete field "${fieldName}"?`)) return

  const updated = { ...props.modelValue }
  delete updated[fieldName]
  emit('update:modelValue', updated)
  toast.add({ title: 'Field deleted', color: 'success' })
}

const showTypeOptions = computed(() => {
  const type = fieldForm.value.type
  return {
    string: ['string', 'text', 'richtext', 'email', 'password'].includes(type),
    number: type === 'number',
    enum: type === 'enum',
    uid: type === 'uid',
    media: type === 'media',
    relation: type === 'relation',
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Field list -->
    <div v-if="fields.length > 0" class="border border-stone-200 dark:border-stone-700 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-stone-50 dark:bg-stone-800/50">
          <tr>
            <th class="text-left px-4 py-2 font-medium text-stone-700 dark:text-stone-300">Name</th>
            <th class="text-left px-4 py-2 font-medium text-stone-700 dark:text-stone-300">Type</th>
            <th class="text-center px-4 py-2 font-medium text-stone-700 dark:text-stone-300">Required</th>
            <th class="text-right px-4 py-2 font-medium text-stone-700 dark:text-stone-300">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-stone-200 dark:divide-stone-700">
          <tr v-for="[name, config] in fields" :key="name" class="hover:bg-stone-50 dark:hover:bg-stone-800/30">
            <td class="px-4 py-2">
              <div class="font-medium text-stone-900 dark:text-stone-100">{{ name }}</div>
              <div v-if="config.label" class="text-xs text-stone-500 dark:text-stone-400">{{ config.label }}</div>
            </td>
            <td class="px-4 py-2">
              <UBadge :color="getTypeColor(config.type)" variant="subtle" size="xs">
                {{ config.type }}
              </UBadge>
            </td>
            <td class="px-4 py-2 text-center">
              <UIcon
                v-if="config.required"
                name="i-heroicons-check"
                class="text-green-600 dark:text-green-400"
              />
              <span v-else class="text-stone-300 dark:text-stone-600">—</span>
            </td>
            <td class="px-4 py-2 text-right">
              <UButton
                size="xs"
                variant="ghost"
                color="neutral"
                icon="i-heroicons-pencil"
                @click="openEditModal(name, config)"
              />
              <UButton
                size="xs"
                variant="ghost"
                color="error"
                icon="i-heroicons-trash"
                @click="deleteField(name)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-8 border border-dashed border-stone-300 dark:border-stone-700 rounded-lg">
      <UIcon name="i-heroicons-squares-2x2" class="text-3xl text-stone-400 dark:text-stone-500 mb-2" />
      <p class="text-stone-500 dark:text-stone-400 text-sm">No fields defined yet</p>
    </div>

    <!-- Add field button -->
    <UButton
      variant="outline"
      color="neutral"
      icon="i-heroicons-plus"
      @click="openAddModal"
    >
      Add Field
    </UButton>

    <!-- Field modal -->
    <UModal v-model:open="showFieldModal">
      <template #content>
        <div class="p-6 max-h-[85vh] overflow-y-auto">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">
            {{ editingFieldName ? 'Edit Field' : 'Add Field' }}
          </h3>

          <form @submit.prevent="saveField" class="space-y-4">
            <!-- Field name -->
            <UFormField label="Field Name" required>
              <UInput
                v-model="fieldForm.name"
                placeholder="e.g., title, body, price"
                :disabled="!!editingFieldName"
              />
            </UFormField>

            <!-- Field type -->
            <UFormField label="Type" required>
              <USelect
                v-model="fieldForm.type"
                :items="fieldTypes"
                value-key="value"
                label-key="label"
              />
            </UFormField>

            <!-- Label & Hint -->
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Label">
                <UInput v-model="fieldForm.label" placeholder="Display name" />
              </UFormField>
              <UFormField label="Hint">
                <UInput v-model="fieldForm.hint" placeholder="Help text" />
              </UFormField>
            </div>

            <!-- Required & Unique -->
            <div class="flex gap-6">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="fieldForm.required"
                  class="rounded border-stone-300 dark:border-stone-600"
                />
                <span class="text-sm text-stone-700 dark:text-stone-300">Required</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="fieldForm.unique"
                  class="rounded border-stone-300 dark:border-stone-600"
                />
                <span class="text-sm text-stone-700 dark:text-stone-300">Unique</span>
              </label>
            </div>

            <!-- String/Text options -->
            <template v-if="showTypeOptions.string">
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Min Length">
                  <UInput v-model.number="fieldForm.minLength" type="number" min="0" />
                </UFormField>
                <UFormField label="Max Length">
                  <UInput v-model.number="fieldForm.maxLength" type="number" min="1" />
                </UFormField>
              </div>
            </template>

            <!-- Number options -->
            <template v-if="showTypeOptions.number">
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Min Value">
                  <UInput v-model.number="fieldForm.min" type="number" />
                </UFormField>
                <UFormField label="Max Value">
                  <UInput v-model.number="fieldForm.max" type="number" />
                </UFormField>
              </div>
            </template>

            <!-- Enum options -->
            <template v-if="showTypeOptions.enum">
              <UFormField label="Options" hint="Comma-separated values">
                <UInput
                  v-model="fieldForm.options"
                  placeholder="draft, published, archived"
                />
              </UFormField>
            </template>

            <!-- UID options -->
            <template v-if="showTypeOptions.uid">
              <UFormField label="Target Field" hint="Field to generate slug from">
                <USelect
                  v-model="fieldForm.targetField"
                  :items="availableFieldsForTarget.map(f => ({ label: f, value: f }))"
                  placeholder="Select a field"
                />
              </UFormField>
            </template>

            <!-- Media options -->
            <template v-if="showTypeOptions.media">
              <div class="space-y-3">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="fieldForm.multiple"
                    class="rounded border-stone-300 dark:border-stone-600"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">Allow Multiple</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    v-model="fieldForm.allowFolderSelection"
                    class="rounded border-stone-300 dark:border-stone-600"
                  />
                  <span class="text-sm text-stone-700 dark:text-stone-300">Allow Folder Selection</span>
                </label>
                <UFormField label="Allowed Types">
                  <div class="flex flex-wrap gap-2">
                    <label
                      v-for="opt in mediaTypeOptions"
                      :key="opt.value"
                      class="flex items-center gap-1.5 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        :checked="fieldForm.allowedTypes.includes(opt.value)"
                        class="rounded border-stone-300 dark:border-stone-600"
                        @change="(e: Event) => {
                          const checked = (e.target as HTMLInputElement).checked
                          if (checked) fieldForm.allowedTypes.push(opt.value)
                          else fieldForm.allowedTypes = fieldForm.allowedTypes.filter(t => t !== opt.value)
                        }"
                      />
                      <span class="text-stone-700 dark:text-stone-300">{{ opt.label }}</span>
                    </label>
                  </div>
                </UFormField>
              </div>
            </template>

            <!-- Relation options -->
            <template v-if="showTypeOptions.relation">
              <div class="grid grid-cols-2 gap-4">
                <UFormField label="Related Content Type">
                  <UInput
                    v-model="fieldForm.relationTo"
                    placeholder="e.g., author, category"
                  />
                </UFormField>
                <UFormField label="Relation Type">
                  <USelect
                    v-model="fieldForm.relationType"
                    :items="relationTypes"
                    value-key="value"
                    label-key="label"
                  />
                </UFormField>
              </div>
            </template>

            <!-- Actions -->
            <div class="flex justify-end gap-2 pt-4 border-t border-stone-200 dark:border-stone-700">
              <UButton variant="ghost" color="neutral" @click="showFieldModal = false">
                Cancel
              </UButton>
              <UButton type="submit" color="neutral">
                {{ editingFieldName ? 'Update' : 'Add' }} Field
              </UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
