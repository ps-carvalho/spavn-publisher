<script setup lang="ts">
import type { StorageConfig, AnyStorageConfig } from '~/server/utils/publisher/storage/types'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Switch } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { AlertTriangle, Check, CheckCircle, XCircle, RefreshCw, Signal, Loader2 } from 'lucide-vue-next'

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

const { toast } = useToast()

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
    toast({
      title: 'Failed to load storage configuration',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
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

    toast({
      title: response.success ? 'Connection successful' : 'Connection failed',
      description: response.success
        ? `Test completed in ${response.duration}ms`
        : response.error || 'Please check your configuration',
      variant: response.success ? undefined : 'destructive',
    })
  } catch (error) {
    testResult.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    }

    toast({
      title: 'Connection test failed',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
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
      toast({
        title: 'Configuration saved',
        description: response.validation.warnings?.length
          ? `${response.validation.warnings.length} warning(s) found`
          : 'Storage settings have been updated',
      })

      // Reload config to get masked values
      await loadConfig()
    } else {
      // Show validation errors
      const errorMessages = response.validation.errors
        ?.map(e => `${e.field}: ${e.message}`)
        .join(', ') || response.message

      toast({
        title: 'Validation failed',
        description: errorMessages,
        variant: 'destructive',
      })
    }
  } catch (error) {
    toast({
      title: 'Failed to save configuration',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
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
  <div class="max-w-3xl space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] tracking-tight">
          Storage Configuration
        </h3>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Configure where media files are stored
        </p>
      </div>
      <Badge
        v-if="config?.defaultProvider"
        variant="outline"
      >
        Default: {{ config.defaultProvider }}
      </Badge>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <RefreshCw class="mx-auto h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      <p class="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
        Loading configuration...
      </p>
    </div>

    <!-- Config form -->
    <div v-else class="space-y-6">
      <!-- Provider Selection -->
      <div class="space-y-2">
        <Label>Storage Provider <span class="text-[hsl(var(--destructive))]">*</span></Label>
        <Select
          :model-value="selectedProvider"
          @update:model-value="handleProviderChange"
        >
          <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
          <SelectContent>
            <SelectItem v-for="opt in providerOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Dynamic Provider Form -->
      <div class="space-y-4 p-4 bg-[hsl(var(--background))] rounded-lg border border-[hsl(var(--border))]">
        <!-- Local Provider Fields -->
        <template v-if="selectedProvider === 'local'">
          <div class="space-y-2">
            <Label for="basePath">Base Path</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Directory where files are stored</p>
            <Input
              id="basePath"
              v-model="formState.basePath"
              placeholder="./public/uploads"
            />
          </div>

          <div class="space-y-2">
            <Label for="baseUrl">Base URL</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">URL path for serving files</p>
            <Input
              id="baseUrl"
              v-model="formState.baseUrl"
              placeholder="/uploads"
            />
          </div>

          <div class="space-y-2">
            <Label>Create Directories</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Automatically create directories</p>
            <Switch v-model:checked="formState.createDirectories" />
          </div>
        </template>

        <!-- R2 Provider Fields -->
        <template v-else-if="selectedProvider === 'r2'">
          <div class="space-y-2">
            <Label for="accountId">Account ID <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="accountId"
              v-model="formState.accountId"
              placeholder="Your Cloudflare account ID"
            />
          </div>

          <div class="space-y-2">
            <Label for="bucket">Bucket Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="bucket"
              v-model="formState.bucket"
              placeholder="my-bucket"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="accessKeyId">Access Key ID <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input
                id="accessKeyId"
                v-model="formState.accessKeyId"
                type="password"
                placeholder="R2 access key"
              />
            </div>

            <div class="space-y-2">
              <Label for="secretAccessKey">Secret Access Key <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input
                id="secretAccessKey"
                v-model="formState.secretAccessKey"
                type="password"
                placeholder="R2 secret key"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label>Region</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Usually 'auto' for R2</p>
            <Select v-model="formState.region">
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in regionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label for="customDomain">Custom Domain</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Optional CDN domain</p>
            <Input
              id="customDomain"
              v-model="formState.customDomain"
              placeholder="https://cdn.example.com"
            />
          </div>

          <div class="space-y-2">
            <Label>Public Bucket</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Enable for public read access</p>
            <Switch v-model:checked="formState.public" />
          </div>
        </template>

        <!-- S3 Provider Fields -->
        <template v-else-if="selectedProvider === 's3'">
          <div class="space-y-2">
            <Label for="s3Bucket">Bucket Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="s3Bucket"
              v-model="formState.bucket"
              placeholder="my-bucket"
            />
          </div>

          <div class="space-y-2">
            <Label for="s3Region">Region <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input
              id="s3Region"
              v-model="formState.region"
              placeholder="us-east-1"
            />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="s3AccessKeyId">Access Key ID <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input
                id="s3AccessKeyId"
                v-model="formState.accessKeyId"
                type="password"
                placeholder="AWS access key"
              />
            </div>

            <div class="space-y-2">
              <Label for="s3SecretAccessKey">Secret Access Key <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input
                id="s3SecretAccessKey"
                v-model="formState.secretAccessKey"
                type="password"
                placeholder="AWS secret key"
              />
            </div>
          </div>

          <div class="space-y-2">
            <Label for="s3Endpoint">Custom Endpoint</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">For MinIO, DigitalOcean Spaces, etc.</p>
            <Input
              id="s3Endpoint"
              v-model="formState.endpoint"
              placeholder="https://s3.example.com"
            />
          </div>

          <div class="space-y-2">
            <Label for="s3CustomDomain">Custom Domain</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Optional CDN domain</p>
            <Input
              id="s3CustomDomain"
              v-model="formState.customDomain"
              placeholder="https://cdn.example.com"
            />
          </div>

          <div class="space-y-2">
            <Label>Force Path Style</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Required for MinIO</p>
            <Switch v-model:checked="formState.forcePathStyle" />
          </div>

          <div class="space-y-2">
            <Label>Public Bucket</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Enable for public read access</p>
            <Switch v-model:checked="formState.public" />
          </div>
        </template>
      </div>

      <!-- Test Result -->
      <div
        v-if="testResult"
        :class="[
          'p-4 rounded-lg border',
          testResult.success
            ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800'
            : 'bg-[hsl(var(--destructive)/0.1)] border-[hsl(var(--destructive)/0.3)]'
        ]"
      >
        <div class="flex items-center gap-2">
          <CheckCircle v-if="testResult.success" class="h-5 w-5 text-green-600" />
          <XCircle v-else class="h-5 w-5 text-[hsl(var(--destructive))]" />
          <span
            :class="testResult.success ? 'text-green-700 dark:text-green-300' : 'text-[hsl(var(--destructive))]'"
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
        class="p-3 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))]"
      >
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-4 w-4 text-[hsl(var(--primary))]" />
          <span class="text-sm text-[hsl(var(--foreground))]">
            You have unsaved changes
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
        <Button
          variant="outline"
          :disabled="saving"
          @click="testConnection"
        >
          <Loader2 v-if="testing" class="h-4 w-4 mr-2 animate-spin" />
          <Signal v-else class="h-4 w-4 mr-2" />
          Test Connection
        </Button>

        <Button
          :disabled="testing"
          @click="saveConfig"
        >
          <Loader2 v-if="saving" class="h-4 w-4 mr-2 animate-spin" />
          <Check v-else class="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  </div>
</template>
