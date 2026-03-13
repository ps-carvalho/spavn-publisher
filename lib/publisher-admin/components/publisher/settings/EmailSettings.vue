<script setup lang="ts">
import type { EmailSettings, EmailProviderType } from '~/server/utils/publisher/settings/types'

// ─── State ─────────────────────────────────────────────────────────────────────

const loading = ref(true)
const saving = ref(false)
const testing = ref(false)
const configured = ref(false)
const selectedProvider = ref<EmailProviderType>('smtp')
const formState = ref<Record<string, unknown>>({})
const testResult = ref<{ success: boolean; message: string; duration?: number } | null>(null)
const validationErrors = ref<Record<string, string[]>>({})

// ─── Toast ─────────────────────────────────────────────────────────────────────

const toast = useToast()

// ─── Provider Options ───────────────────────────────────────────────────────────

const providerOptions = [
  { value: 'smtp', label: 'SMTP' },
  { value: 'sendgrid', label: 'SendGrid' },
  { value: 'ses', label: 'AWS SES' },
  { value: 'mailgun', label: 'Mailgun' },
]

// AWS Region options for SES
const awsRegionOptions = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-west-2', label: 'EU (London)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
]

// Mailgun region options
const mailgunRegionOptions = [
  { value: 'us', label: 'US' },
  { value: 'eu', label: 'EU' },
]

// ─── Computed ──────────────────────────────────────────────────────────────────

const hasUnsavedChanges = computed(() => {
  // Simple check - if form has been modified beyond defaults
  if (!configured.value) return Object.keys(formState.value).length > 0
  return true
})

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadSettings()
})

// ─── API Functions ─────────────────────────────────────────────────────────────

async function loadSettings() {
  loading.value = true
  testResult.value = null

  try {
    const response = await $fetch<{
      settings: EmailSettings | null
      configured: boolean
    }>('/api/publisher/settings/email')

    configured.value = response.configured

    if (response.settings) {
      selectedProvider.value = response.settings.provider
      formState.value = { ...response.settings }
    } else {
      initializeFormState()
    }
  } catch (error) {
    toast.add({
      title: 'Failed to load email configuration',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

function initializeFormState() {
  formState.value = getDefaultConfigForProvider(selectedProvider.value)
}

function getDefaultConfigForProvider(provider: EmailProviderType): Record<string, unknown> {
  const base = {
    provider,
    fromName: '',
    fromAddress: '',
  }

  switch (provider) {
    case 'smtp':
      return { ...base, host: '', port: 587, secure: false, username: '', password: '' }
    case 'sendgrid':
      return { ...base, apiKey: '' }
    case 'ses':
      return { ...base, accessKeyId: '', secretAccessKey: '', region: 'us-east-1' }
    case 'mailgun':
      return { ...base, apiKey: '', domain: '', region: 'us' }
    default:
      return base
  }
}

async function testConnection() {
  testing.value = true
  testResult.value = null

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      recipient?: string
      provider?: string
      duration?: number
      error?: string
    }>('/api/publisher/settings/email/test', {
      method: 'POST',
      body: {}, // Uses current user's email as recipient
    })

    testResult.value = {
      success: response.success,
      message: response.success
        ? `Test email sent to ${response.recipient}`
        : response.error || response.message,
      duration: response.duration,
    }

    toast.add({
      title: response.success ? 'Test email sent' : 'Test failed',
      description: response.success
        ? `Check your inbox at ${response.recipient}`
        : response.error || response.message,
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

async function saveSettings() {
  saving.value = true
  validationErrors.value = {}

  try {
    const response = await $fetch<{
      success: boolean
      message: string
      provider: string
    }>('/api/publisher/settings/email', {
      method: 'PUT',
      body: formState.value,
    })

    configured.value = true

    toast.add({
      title: 'Configuration saved',
      description: `Email settings updated for ${response.provider.toUpperCase()}`,
      color: 'success',
    })

    // Reload to get masked values
    await loadSettings()
  } catch (err: any) {
    if (err?.data?.error?.details) {
      validationErrors.value = err.data.error.details
    }

    toast.add({
      title: 'Failed to save configuration',
      description: err?.data?.error?.message || err.message || 'An unexpected error occurred',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

// ─── Event Handlers ────────────────────────────────────────────────────────────

function handleProviderChange(value: string) {
  selectedProvider.value = value as EmailProviderType
  // Preserve common fields
  const fromName = formState.value.fromName
  const fromAddress = formState.value.fromAddress
  initializeFormState()
  formState.value.fromName = fromName || ''
  formState.value.fromAddress = fromAddress || ''
  testResult.value = null
}

// Watch for provider changes
watch(selectedProvider, () => {
  // Don't reset if loading
  if (!loading.value) {
    const fromName = formState.value.fromName
    const fromAddress = formState.value.fromAddress
    initializeFormState()
    formState.value.fromName = fromName || ''
    formState.value.fromAddress = fromAddress || ''
    testResult.value = null
  }
})
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
          Email Configuration
        </h3>
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Configure how emails are sent from the system
        </p>
      </div>
      <UBadge v-if="configured" color="success" variant="subtle">
        Configured
      </UBadge>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-stone-400" />
      <p class="mt-2 text-sm text-stone-500 dark:text-stone-400">Loading configuration...</p>
    </div>

    <!-- Config form -->
    <div v-else class="space-y-6">
      <!-- Provider Selection -->
      <UFormField label="Email Provider" required>
        <USelect
          :model-value="selectedProvider"
          :items="providerOptions"
          @update:model-value="handleProviderChange"
        />
      </UFormField>

      <!-- Dynamic Provider Form -->
      <div class="space-y-4 p-4 bg-stone-50 dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-800">
        <!-- Common Fields -->
        <div class="space-y-4">
          <UFormField label="From Name" required :error="validationErrors.fromName?.[0]">
            <UInput v-model="formState.fromName" placeholder="Publisher CMS" />
          </UFormField>
          <UFormField label="From Address" required :error="validationErrors.fromAddress?.[0]">
            <UInput v-model="formState.fromAddress" type="email" placeholder="noreply@example.com" />
          </UFormField>
        </div>

        <!-- SMTP Fields -->
        <template v-if="selectedProvider === 'smtp'">
          <div class="space-y-4">
            <UFormField label="SMTP Host" required :error="validationErrors.host?.[0]">
              <UInput v-model="formState.host" placeholder="smtp.example.com" />
            </UFormField>
            <UFormField label="Port" required :error="validationErrors.port?.[0]">
              <UInput v-model.number="formState.port" type="number" placeholder="587" />
            </UFormField>
          </div>
          <div class="space-y-4">
            <UFormField label="Username" required :error="validationErrors.username?.[0]">
              <UInput v-model="formState.username" placeholder="user@example.com" />
            </UFormField>
            <UFormField label="Password" required :error="validationErrors.password?.[0]">
              <UInput v-model="formState.password" type="password" placeholder="••••••••" />
            </UFormField>
          </div>
          <UFormField label="Use TLS/SSL">
            <USwitch v-model:checked="formState.secure" />
            <span class="ml-2 text-sm text-stone-500 dark:text-stone-400">Enable for port 465</span>
          </UFormField>
        </template>

        <!-- SendGrid Fields -->
        <template v-else-if="selectedProvider === 'sendgrid'">
          <UFormField label="API Key" required :error="validationErrors.apiKey?.[0]">
            <UInput v-model="formState.apiKey" type="password" placeholder="SG.xxxxxxxxxxxxxxxx" />
          </UFormField>
        </template>

        <!-- AWS SES Fields -->
        <template v-else-if="selectedProvider === 'ses'">
          <div class="space-y-4">
            <UFormField label="Access Key ID" required :error="validationErrors.accessKeyId?.[0]">
              <UInput v-model="formState.accessKeyId" placeholder="AKIAIOSFODNN7EXAMPLE" />
            </UFormField>
            <UFormField label="Secret Access Key" required :error="validationErrors.secretAccessKey?.[0]">
              <UInput v-model="formState.secretAccessKey" type="password" placeholder="••••••••" />
            </UFormField>
          </div>
          <UFormField label="AWS Region" required :error="validationErrors.region?.[0]">
            <USelect v-model="formState.region" :items="awsRegionOptions" />
          </UFormField>
        </template>

        <!-- Mailgun Fields -->
        <template v-else-if="selectedProvider === 'mailgun'">
          <div class="space-y-4">
            <UFormField label="API Key" required :error="validationErrors.apiKey?.[0]">
              <UInput v-model="formState.apiKey" type="password" placeholder="key-xxxxxxxxxxxxxxxx" />
            </UFormField>
            <UFormField label="Domain" required :error="validationErrors.domain?.[0]">
              <UInput v-model="formState.domain" placeholder="mg.example.com" />
            </UFormField>
          </div>
          <UFormField label="Region" :error="validationErrors.region?.[0]">
            <USelect v-model="formState.region" :items="mailgunRegionOptions" />
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
        v-if="hasUnsavedChanges && configured"
        class="p-3 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800"
      >
        <div class="flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-amber-600" />
          <span class="text-sm text-amber-700 dark:text-amber-300">
            You may have unsaved changes
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-4 border-t border-stone-200 dark:border-stone-800">
        <UButton
          variant="outline"
          color="neutral"
          :loading="testing"
          :disabled="saving || !configured"
          @click="testConnection"
        >
          <template v-if="!testing">
            <UIcon name="i-heroicons-paper-airplane" class="mr-1" />
          </template>
          Send Test Email
        </UButton>

        <UButton
          color="neutral"
          :loading="saving"
          :disabled="testing"
          @click="saveSettings"
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
