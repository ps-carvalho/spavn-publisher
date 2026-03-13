<script setup lang="ts">
import type { StorageConfig, AnyStorageConfig } from '~/server/utils/publisher/storage/types'

// ─── State ─────────────────────────────────────────────────────────────────────

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const config = ref<StorageConfig | null>(null)
const providerNames = ref<string[]>([])
const selectedProvider = ref('local')
const formState = ref<Record<string, unknown>>({})
const testResult = ref<{ success: boolean; message: string; duration?: number } | null>(null)

// ─── Toast ─────────────────────────────────────────────────────────────────────

const toast = useToast()

// ─── Provider Options ───────────────────────────────────────────────────────────

const providerOptions = [
  { value: 'local', label: 'Local Filesystem' },
  { value: 'r2', label: 'Cloudflare R2' },
  { value: 's3', label: 'AWS S3 / S3-Compatible' },
]

const regionOptions = [
  { value: 'auto', label: 'Auto' },
  { value: 'wnam', label: 'Western North America' },
  { value: 'enam', label: 'Eastern North America' },
  { value: 'weur', label: 'Western Europe' },
  { value: 'eeur', label: 'Eastern Europe' },
  { value: 'apac', label: 'Asia Pacific' },
]

// ─── Computed ──────────────────────────────────────────────────────────────────

const hasUnsavedChanges = computed(() => {
  if (!config.value?.providers) return Object.keys(formState.value).length > 0
  
  const currentConfig = config.value.providers[selectedProvider.value]
  if (!currentConfig) return Object.keys(formState.value).length > 0
  
  return JSON.stringify(formState.value) !== JSON.stringify(currentConfig)
})

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadConfig()
})

// ─── API Functions ─────────────────────────────────────────────────────────────

async function loadConfig() {
  loading.value = true
  testResult.value = null
  
  try {
    const response = await $fetch<{
      providers: Record<string, AnyStorageConfig>
      providerNames: string[]
      defaultProvider: string | null
      defaults: StorageConfig['defaults'] | null
    }>('/api/publisher/storage/config')
    
    config.value = {
      providers: response.providers,
      defaultProvider: response.defaultProvider || undefined,
      defaults: response.defaults || undefined,
    }
    providerNames.value = response.providerNames
    selectedProvider.value = response.defaultProvider || 'local'
    
    initializeFormState()
  } catch (error) {
    toast.add({
      title: 'Failed to load storage configuration',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

function initializeFormState() {
  // Reset form state
  formState.value = {}
  
  if (config.value?.providers?.[selectedProvider.value]) {
    // Copy current provider config to form state
    formState.value = { ...config.value.providers[selectedProvider.value] }
  } else {
    // Initialize with default values based on provider type
    formState.value = getDefaultConfigForProvider(selectedProvider.value as 'local' | 'r2' | 's3')
  }
}

function getDefaultConfigForProvider(type: 'local' | 'r2' | 's3'): Record<string, unknown> {
  switch (type) {
    case 'local':
      return {
        type: 'local',
        basePath: './public/uploads',
        baseUrl: '/uploads',
        createDirectories: true,
      }
    case 'r2':
      return {
        type: 'r2',
        accountId: '',
        bucket: '',
        accessKeyId: '',
        secretAccessKey: '',
        customDomain: '',
        region: 'auto',
        public: false,
      }
    case 's3':
      return {
        type: 's3',
        bucket: '',
        region: 'us-east-1',
        accessKeyId: '',
        secretAccessKey: '',
        endpoint: '',
        customDomain: '',
        forcePathStyle: false,
        public: false,
      }
    default:
      return { type }
  }
}

async function testConnection() {
  testing.value = true
  testResult.value = null
  
  try {
    const response = await $fetch<{
      success: boolean
      provider: string
      duration?: number
      error?: string
      timestamp: string
    }>('/api/publisher/storage/health-check', {
      method: 'POST',
      body: { provider: selectedProvider.value },
    })
    
    testResult.value = {
      success: response.success,
      message: response.success
        ? `Connection successful`
        : response.error || 'Connection failed',
      duration: response.duration,
    }
    
    toast.add({
      title: response.success ? 'Connection successful' : 'Connection failed',
      description: response.success 
        ? `Test completed in ${response.duration}ms`
        : response.error || 'Please check your configuration',
      color: response.success ? 'success' : 'error',
    })
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    }
    
    toast.add({
      title: 'Connection test failed',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      color: 'error',
    })
  } finally {
    testing.value = false
  }
}

async function saveConfig() {
  saving.value = true
  
  try {
    // Build the provider config with correct type
    const providerConfig = {
      ...formState.value,
      type: selectedProvider.value,
    } as AnyStorageConfig
    
    // Build new config preserving existing providers
    const newConfig: StorageConfig = {
      providers: {
        ...config.value?.providers,
        [selectedProvider.value]: providerConfig,
      },
      defaultProvider: selectedProvider.value,
      defaults: config.value?.defaults,
    }
    
    const response = await $fetch<{
      success: boolean
      message: string
      validation: {
        valid: boolean
        warnings?: Array<{ field: string; message: string }>
        errors?: Array<{ field: string; message: string }>
      }
      connectivity?: Array<{
        provider: string
        success: boolean
        error?: string
        duration?: number
      }>
    }>('/api/publisher/storage/config', {
      method: 'PUT',
      body: {
        ...newConfig,
        testConnectivity: true,
      },
    })
    
    if (response.success) {
      toast.add({
        title: 'Configuration saved',
        description: response.validation.warnings?.length
          ? `${response.validation.warnings.length} warning(s) found`
          : 'Storage settings have been updated',
        color: 'success',
      })
      
      // Reload config to get masked values
      await loadConfig()
    } else {
      // Show validation errors
      const errorMessages = response.validation.errors
        ?.map(e => `${e.field}: ${e.message}`)
        .join(', ') || response.message
        
      toast.add({
        title: 'Validation failed',
        description: errorMessages,
        color: 'error',
      })
    }
  } catch (error) {
    toast.add({
      title: 'Failed to save configuration',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

// ─── Event Handlers ────────────────────────────────────────────────────────────

function handleProviderChange(value: string) {
  selectedProvider.value = value
  initializeFormState()
  testResult.value = null
}

// Watch for provider changes
watch(selectedProvider, () => {
  initializeFormState()
  testResult.value = null
})
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Storage Configuration
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Configure where media files are stored
        </p>
      </div>
      <UBadge
        v-if="config?.defaultProvider"
        color="neutral"
        variant="subtle"
      >
        Default: {{ config.defaultProvider }}
      </UBadge>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-stone-400" />
      <p class="mt-2 text-sm text-stone-500 dark:text-stone-400">
        Loading configuration...
      </p>
    </div>

    <!-- Config form -->
    <div v-else class="space-y-6">
      <!-- Provider Selection -->
      <UFormField label="Storage Provider" required>
        <USelect
          :model-value="selectedProvider"
          :items="providerOptions"
          @update:model-value="handleProviderChange"
        />
      </UFormField>

      <!-- Dynamic Provider Form -->
      <div class="space-y-4 p-4 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
        <!-- Local Provider Fields -->
        <template v-if="selectedProvider === 'local'">
          <UFormField label="Base Path" hint="Directory where files are stored">
            <UInput
              v-model="formState.basePath"
              placeholder="./public/uploads"
            />
          </UFormField>
          
          <UFormField label="Base URL" hint="URL path for serving files">
            <UInput
              v-model="formState.baseUrl"
              placeholder="/uploads"
            />
          </UFormField>
          
          <UFormField label="Create Directories" hint="Automatically create directories">
            <USwitch v-model:checked="formState.createDirectories" />
          </UFormField>
        </template>

        <!-- R2 Provider Fields -->
        <template v-else-if="selectedProvider === 'r2'">
          <UFormField label="Account ID" required>
            <UInput
              v-model="formState.accountId"
              placeholder="Your Cloudflare account ID"
            />
          </UFormField>
          
          <UFormField label="Bucket Name" required>
            <UInput
              v-model="formState.bucket"
              placeholder="my-bucket"
            />
          </UFormField>
          
          <UFormField label="Access Key ID" required>
            <UInput
              v-model="formState.accessKeyId"
              type="password"
              placeholder="R2 access key"
            />
          </UFormField>
          
          <UFormField label="Secret Access Key" required>
            <UInput
              v-model="formState.secretAccessKey"
              type="password"
              placeholder="R2 secret key"
            />
          </UFormField>
          
          <UFormField label="Region" hint="Usually 'auto' for R2">
            <USelect
              v-model="formState.region"
              :items="regionOptions"
            />
          </UFormField>
          
          <UFormField label="Custom Domain" hint="Optional CDN domain">
            <UInput
              v-model="formState.customDomain"
              placeholder="https://cdn.example.com"
            />
          </UFormField>
          
          <UFormField label="Public Bucket" hint="Enable for public read access">
            <USwitch v-model:checked="formState.public" />
          </UFormField>
        </template>

        <!-- S3 Provider Fields -->
        <template v-else-if="selectedProvider === 's3'">
          <UFormField label="Bucket Name" required>
            <UInput
              v-model="formState.bucket"
              placeholder="my-bucket"
            />
          </UFormField>
          
          <UFormField label="Region" required>
            <UInput
              v-model="formState.region"
              placeholder="us-east-1"
            />
          </UFormField>
          
          <UFormField label="Access Key ID" required>
            <UInput
              v-model="formState.accessKeyId"
              type="password"
              placeholder="AWS access key"
            />
          </UFormField>
          
          <UFormField label="Secret Access Key" required>
            <UInput
              v-model="formState.secretAccessKey"
              type="password"
              placeholder="AWS secret key"
            />
          </UFormField>
          
          <UFormField label="Custom Endpoint" hint="For MinIO, DigitalOcean Spaces, etc.">
            <UInput
              v-model="formState.endpoint"
              placeholder="https://s3.example.com"
            />
          </UFormField>
          
          <UFormField label="Custom Domain" hint="Optional CDN domain">
            <UInput
              v-model="formState.customDomain"
              placeholder="https://cdn.example.com"
            />
          </UFormField>
          
          <UFormField label="Force Path Style" hint="Required for MinIO">
            <USwitch v-model:checked="formState.forcePathStyle" />
          </UFormField>
          
          <UFormField label="Public Bucket" hint="Enable for public read access">
            <USwitch v-model:checked="formState.public" />
          </UFormField>
        </template>
      </div>

      <!-- Test Result -->
      <div
        v-if="testResult"
        :class="[
          'p-4 rounded-lg border',
          testResult.success
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'
        ]"
      >
        <div class="flex items-center gap-2">
          <UIcon
            :name="testResult.success ? 'i-heroicons-check-circle' : 'i-heroicons-x-circle'"
            :class="testResult.success ? 'text-green-600' : 'text-red-600'"
          />
          <span
            :class="testResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'"
          >
            {{ testResult.message }}
            <span v-if="testResult.duration" class="text-sm opacity-75">
              ({{ testResult.duration }}ms)
            </span>
          </span>
        </div>
      </div>

      <!-- Unsaved Changes Warning -->
      <div
        v-if="hasUnsavedChanges"
        class="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-amber-600" />
          <span class="text-sm text-amber-700 dark:text-amber-300">
            You have unsaved changes
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
        <UButton
          variant="outline"
          color="neutral"
          :loading="testing"
          :disabled="saving"
          @click="testConnection"
        >
          <template v-if="!testing">
            <UIcon name="i-heroicons-signal" class="mr-1" />
          </template>
          Test Connection
        </UButton>
        
        <UButton
          color="neutral"
          :loading="saving"
          :disabled="testing"
          @click="saveConfig"
        >
          <template v-if="!saving">
            <UIcon name="i-heroicons-check" class="mr-1" />
          </template>
          Save Configuration
        </UButton>
      </div>
    </div>
  </div>
</template>
