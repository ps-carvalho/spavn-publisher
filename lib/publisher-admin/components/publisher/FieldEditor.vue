<script setup lang="ts">
import type { FieldConfig, FieldType, RelationType } from '~~/lib/publisher/types'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { Check, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: Record<string, FieldConfig>
  mode: 'content' | 'block'
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Record<string, FieldConfig>]
}>()

const { toast } = useToast()
const showFieldModal = ref(false)
const editingFieldName = ref<string | null>(null)
const isSubmitting = ref(false)
const validationErrors = ref<Record<string, string>>({})

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

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

function getTypeVariant(type: FieldType): BadgeVariant {
  const variants: Record<string, BadgeVariant> = {
    string: 'secondary',
    text: 'secondary',
    richtext: 'secondary',
    number: 'default',
    boolean: 'outline',
    date: 'secondary',
    datetime: 'secondary',
    uid: 'outline',
    media: 'outline',
    relation: 'secondary',
    enum: 'outline',
    json: 'outline',
    email: 'secondary',
    password: 'destructive',
  }
  return variants[type] || 'outline'
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
  validationErrors.value = {}
  showFieldModal.value = true
}

function openEditModal(fieldName: string, config: FieldConfig) {
  editingFieldName.value = fieldName
  validationErrors.value = {}
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
  // Clear previous validation errors
  validationErrors.value = {}

  // Validate field name presence
  if (!fieldForm.value.name.trim()) {
    validationErrors.value.name = 'Field name is required'
  }
  // Validate field name format (alphanumeric + underscore)
  else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fieldForm.value.name)) {
    validationErrors.value.name = 'Must start with a letter or underscore and contain only alphanumeric characters'
  }
  // Check for duplicate names (unless editing the same field)
  else if (fieldForm.value.name !== editingFieldName.value && props.modelValue[fieldForm.value.name]) {
    validationErrors.value.name = 'A field with this name already exists'
  }

  // Type-specific validation
  if (fieldForm.value.type === 'uid' && !fieldForm.value.targetField) {
    validationErrors.value.targetField = 'UID field requires a target field'
  }

  if (fieldForm.value.type === 'relation' && !fieldForm.value.relationTo) {
    validationErrors.value.relationTo = 'Relation field requires a related content type'
  }

  if (fieldForm.value.type === 'enum' && !fieldForm.value.options.trim()) {
    validationErrors.value.options = 'Enum field requires at least one option'
  }

  // If there are any validation errors, show a summary toast and return
  if (Object.keys(validationErrors.value).length > 0) {
    toast({ title: 'Please fix the validation errors', variant: 'destructive' })
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
  toast({ title: editingFieldName.value ? 'Field updated' : 'Field added' })
}

function deleteField(fieldName: string) {
  if (!confirm(`Delete field "${fieldName}"?`)) return

  const updated = { ...props.modelValue }
  delete updated[fieldName]
  emit('update:modelValue', updated)
  toast({ title: 'Field deleted' })
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
    <div v-if="fields.length > 0" class="border border-[hsl(var(--border))] rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-[hsl(var(--background))]">
          <tr>
            <th class="text-left px-4 py-2 font-medium text-[hsl(var(--muted-foreground))]">Name</th>
            <th class="text-left px-4 py-2 font-medium text-[hsl(var(--muted-foreground))]">Type</th>
            <th class="text-center px-4 py-2 font-medium text-[hsl(var(--muted-foreground))]">Required</th>
            <th class="text-right px-4 py-2 font-medium text-[hsl(var(--muted-foreground))]">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[hsl(var(--border))]">
          <tr v-for="[name, config] in fields" :key="name" class="hover:bg-[hsl(var(--background))]">
            <td class="px-4 py-2">
              <div class="font-medium text-[hsl(var(--foreground))]">{{ name }}</div>
              <div v-if="config.label" class="text-xs text-[hsl(var(--muted-foreground))]">{{ config.label }}</div>
            </td>
            <td class="px-4 py-2">
              <Badge :variant="getTypeVariant(config.type)">
                {{ config.type }}
              </Badge>
            </td>
            <td class="px-4 py-2 text-center">
              <Check
                v-if="config.required"
                class="inline-block h-4 w-4 text-green-600 dark:text-green-400"
              />
              <span v-else class="text-[hsl(var(--muted-foreground))]">&mdash;</span>
            </td>
            <td class="px-4 py-2 text-right">
              <Button
                size="sm"
                variant="ghost"
                @click="openEditModal(name, config)"
              >
                <Pencil class="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                @click="deleteField(name)"
              >
                <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Empty state -->
    <div v-else class="text-center py-8 border border-dashed border-[hsl(var(--border))] rounded-lg">
      <LayoutGrid class="mx-auto h-8 w-8 text-[hsl(var(--muted-foreground))] mb-2" />
      <p class="text-[hsl(var(--muted-foreground))] text-sm">No fields defined yet</p>
    </div>

    <!-- Add field button -->
    <Button
      variant="outline"
      @click="openAddModal"
    >
      <Plus class="h-4 w-4 mr-2" />
      Add Field
    </Button>

    <!-- Field modal -->
    <Dialog v-model:open="showFieldModal">
      <DialogContent class="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{{ editingFieldName ? 'Edit Field' : 'Add Field' }}</DialogTitle>
        </DialogHeader>

        <form @submit.prevent="saveField" class="space-y-4">
          <!-- Field name -->
          <div class="space-y-2">
            <Label for="fieldName">Field Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="fieldName"
              v-model="fieldForm.name"
              placeholder="e.g., title, body, price"
              :disabled="!!editingFieldName"
            />
            <p v-if="validationErrors.name" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.name }}</p>
          </div>

          <!-- Field type -->
          <div class="space-y-2">
            <Label>Type <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Select v-model="fieldForm.type">
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="ft in fieldTypes" :key="ft.value" :value="ft.value">{{ ft.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="validationErrors.type" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.type }}</p>
          </div>

          <!-- Label & Hint -->
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="fieldLabel">Label</Label>
              <Input id="fieldLabel" v-model="fieldForm.label" placeholder="Display name" />
            </div>
            <div class="space-y-2">
              <Label for="fieldHint">Hint</Label>
              <Input id="fieldHint" v-model="fieldForm.hint" placeholder="Help text" />
            </div>
          </div>

          <!-- Required & Unique -->
          <div class="flex gap-6">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="fieldForm.required"
                class="rounded border-[hsl(var(--border))]"
              />
              <span class="text-sm text-[hsl(var(--foreground))]">Required</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                v-model="fieldForm.unique"
                class="rounded border-[hsl(var(--border))]"
              />
              <span class="text-sm text-[hsl(var(--foreground))]">Unique</span>
            </label>
          </div>

          <!-- String/Text options -->
          <template v-if="showTypeOptions.string">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="minLength">Min Length</Label>
                <Input id="minLength" v-model.number="fieldForm.minLength" type="number" min="0" />
              </div>
              <div class="space-y-2">
                <Label for="maxLength">Max Length</Label>
                <Input id="maxLength" v-model.number="fieldForm.maxLength" type="number" min="1" />
              </div>
            </div>
          </template>

          <!-- Number options -->
          <template v-if="showTypeOptions.number">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="minValue">Min Value</Label>
                <Input id="minValue" v-model.number="fieldForm.min" type="number" />
              </div>
              <div class="space-y-2">
                <Label for="maxValue">Max Value</Label>
                <Input id="maxValue" v-model.number="fieldForm.max" type="number" />
              </div>
            </div>
          </template>

          <!-- Enum options -->
          <template v-if="showTypeOptions.enum">
            <div class="space-y-2">
              <Label for="enumOptions">Options</Label>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">Comma-separated values</p>
              <Input
                id="enumOptions"
                v-model="fieldForm.options"
                placeholder="draft, published, archived"
              />
              <p v-if="validationErrors.options" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.options }}</p>
            </div>
          </template>

          <!-- UID options -->
          <template v-if="showTypeOptions.uid">
            <div class="space-y-2">
              <Label>Target Field</Label>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">Field to generate slug from</p>
              <Select v-model="fieldForm.targetField">
                <SelectTrigger><SelectValue placeholder="Select a field" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="f in availableFieldsForTarget" :key="f" :value="f">{{ f }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="validationErrors.targetField" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.targetField }}</p>
            </div>
          </template>

          <!-- Media options -->
          <template v-if="showTypeOptions.media">
            <div class="space-y-3">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="fieldForm.multiple"
                  class="rounded border-[hsl(var(--border))]"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">Allow Multiple</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  v-model="fieldForm.allowFolderSelection"
                  class="rounded border-[hsl(var(--border))]"
                />
                <span class="text-sm text-[hsl(var(--foreground))]">Allow Folder Selection</span>
              </label>
              <div class="space-y-2">
                <Label>Allowed Types</Label>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="opt in mediaTypeOptions"
                    :key="opt.value"
                    class="flex items-center gap-1.5 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      :checked="fieldForm.allowedTypes.includes(opt.value)"
                      class="rounded border-[hsl(var(--border))]"
                      @change="(e: Event) => {
                        const checked = (e.target as HTMLInputElement).checked
                        if (checked) fieldForm.allowedTypes.push(opt.value)
                        else fieldForm.allowedTypes = fieldForm.allowedTypes.filter(t => t !== opt.value)
                      }"
                    />
                    <span class="text-[hsl(var(--foreground))]">{{ opt.label }}</span>
                  </label>
                </div>
              </div>
            </div>
          </template>

          <!-- Relation options -->
          <template v-if="showTypeOptions.relation">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="relationTo">Related Content Type</Label>
                <Input
                  id="relationTo"
                  v-model="fieldForm.relationTo"
                  placeholder="e.g., author, category"
                />
                <p v-if="validationErrors.relationTo" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.relationTo }}</p>
              </div>
              <div class="space-y-2">
                <Label>Relation Type</Label>
                <Select v-model="fieldForm.relationType">
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="rt in relationTypes" :key="rt.value" :value="rt.value">{{ rt.label }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </template>

          <!-- Actions -->
          <div class="flex justify-end gap-2 pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="ghost" @click="showFieldModal = false">
              Cancel
            </Button>
            <Button type="submit">
              {{ editingFieldName ? 'Update' : 'Add' }} Field
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
