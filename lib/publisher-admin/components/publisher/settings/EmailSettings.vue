<script setup lang="ts">
import type { EmailSettings, EmailProviderType } from '~/server/utils/publisher/settings/types'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Badge } from '@spavn/ui'
import { Switch } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { AlertTriangle, Check, CheckCircle, XCircle, RefreshCw, Send, Loader2 } from 'lucide-vue-next'

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

const { toast } = useToast()

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
    toast({
      title: 'Failed to load email configuration',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
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

    toast({
      title: response.success ? 'Test email sent' : 'Test failed',
      description: response.success
        ? `Check your inbox at ${response.recipient}`
        : response.error || response.message,
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

    toast({
      title: 'Configuration saved',
      description: `Email settings updated for ${response.provider.toUpperCase()}`,
    })

    // Reload to get masked values
    await loadSettings()
  } catch (err: any) {
    if (err?.data?.error?.details) {
      validationErrors.value = err.data.error.details
    }

    toast({
      title: 'Failed to save configuration',
      description: err?.data?.error?.message || err.message || 'An unexpected error occurred',
      variant: 'destructive',
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
  <div class="max-w-3xl space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] tracking-tight">
          Email Configuration
        </h3>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Configure how emails are sent from the system
        </p>
      </div>
      <Badge v-if="configured" variant="default">
        Configured
      </Badge>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <RefreshCw class="mx-auto h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      <p class="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Loading configuration...</p>
    </div>

    <!-- Config form -->
    <div v-else class="space-y-6">
      <!-- Provider Selection -->
      <div class="space-y-2">
        <Label>Email Provider <span class="text-[hsl(var(--destructive))]">*</span></Label>
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
        <!-- Common Fields -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label for="fromName">From Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input id="fromName" v-model="formState.fromName" placeholder="Publisher CMS" />
            <p v-if="validationErrors.fromName?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.fromName[0] }}</p>
          </div>
          <div class="space-y-2">
            <Label for="fromAddress">From Address <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input id="fromAddress" v-model="formState.fromAddress" type="email" placeholder="noreply@example.com" />
            <p v-if="validationErrors.fromAddress?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.fromAddress[0] }}</p>
          </div>
        </div>

        <!-- SMTP Fields -->
        <template v-if="selectedProvider === 'smtp'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="smtpHost">SMTP Host <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="smtpHost" v-model="formState.host" placeholder="smtp.example.com" />
              <p v-if="validationErrors.host?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.host[0] }}</p>
            </div>
            <div class="space-y-2">
              <Label for="smtpPort">Port <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="smtpPort" v-model.number="formState.port" type="number" placeholder="587" />
              <p v-if="validationErrors.port?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.port[0] }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="smtpUsername">Username <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="smtpUsername" v-model="formState.username" placeholder="user@example.com" />
              <p v-if="validationErrors.username?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.username[0] }}</p>
            </div>
            <div class="space-y-2">
              <Label for="smtpPassword">Password <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="smtpPassword" v-model="formState.password" type="password" placeholder="••••••••" />
              <p v-if="validationErrors.password?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.password[0] }}</p>
            </div>
          </div>
          <div class="space-y-2">
            <Label>Use TLS/SSL</Label>
            <div class="flex items-center gap-2">
              <Switch v-model:checked="formState.secure" />
              <span class="text-sm text-[hsl(var(--muted-foreground))]">Enable for port 465</span>
            </div>
          </div>
        </template>

        <!-- SendGrid Fields -->
        <template v-else-if="selectedProvider === 'sendgrid'">
          <div class="space-y-2">
            <Label for="sgApiKey">API Key <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input id="sgApiKey" v-model="formState.apiKey" type="password" placeholder="SG.xxxxxxxxxxxxxxxx" />
            <p v-if="validationErrors.apiKey?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.apiKey[0] }}</p>
          </div>
        </template>

        <!-- AWS SES Fields -->
        <template v-else-if="selectedProvider === 'ses'">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="sesAccessKeyId">Access Key ID <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="sesAccessKeyId" v-model="formState.accessKeyId" placeholder="AKIAIOSFODNN7EXAMPLE" />
              <p v-if="validationErrors.accessKeyId?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.accessKeyId[0] }}</p>
            </div>
            <div class="space-y-2">
              <Label for="sesSecretAccessKey">Secret Access Key <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="sesSecretAccessKey" v-model="formState.secretAccessKey" type="password" placeholder="••••••••" />
              <p v-if="validationErrors.secretAccessKey?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.secretAccessKey[0] }}</p>
            </div>
          </div>
          <div class="space-y-2">
            <Label>AWS Region <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Select v-model="formState.region">
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in awsRegionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="validationErrors.region?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.region[0] }}</p>
          </div>
        </template>

        <!-- Mailgun Fields -->
        <template v-else-if="selectedProvider === 'mailgun'">
          <div class="space-y-4">
            <div class="space-y-2">
              <Label for="mgApiKey">API Key <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="mgApiKey" v-model="formState.apiKey" type="password" placeholder="key-xxxxxxxxxxxxxxxx" />
              <p v-if="validationErrors.apiKey?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.apiKey[0] }}</p>
            </div>
            <div class="space-y-2">
              <Label for="mgDomain">Domain <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="mgDomain" v-model="formState.domain" placeholder="mg.example.com" />
              <p v-if="validationErrors.domain?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.domain[0] }}</p>
            </div>
          </div>
          <div class="space-y-2">
            <Label>Region</Label>
            <Select v-model="formState.region">
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in mailgunRegionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="validationErrors.region?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.region[0] }}</p>
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
        v-if="hasUnsavedChanges && configured"
        class="p-3 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))]"
      >
        <div class="flex items-center gap-2">
          <AlertTriangle class="h-4 w-4 text-[hsl(var(--primary))]" />
          <span class="text-sm text-[hsl(var(--foreground))]">
            You may have unsaved changes
          </span>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-4 border-t border-[hsl(var(--border))]">
        <Button
          variant="outline"
          :disabled="saving || !configured"
          @click="testConnection"
        >
          <Loader2 v-if="testing" class="h-4 w-4 mr-2 animate-spin" />
          <Send v-else class="h-4 w-4 mr-2" />
          Send Test Email
        </Button>

        <Button
          :disabled="testing"
          @click="saveSettings"
        >
          <Loader2 v-if="saving" class="h-4 w-4 mr-2 animate-spin" />
          <Check v-else class="h-4 w-4 mr-2" />
          Save Configuration
        </Button>
      </div>
    </div>
  </div>
</template>
