<script setup lang="ts">
import type { R2StorageConfig } from '~/server/utils/publisher/storage/types'

// ─── Model ─────────────────────────────────────────────────────────────────────

const config = defineModel<R2StorageConfig>('config', { required: true })

// ─── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  'update:valid': [value: boolean]
}>()

// ─── Region Options ────────────────────────────────────────────────────────────

const regionOptions = [
  { value: 'auto', label: 'Auto (Recommended)' },
  { value: 'wnam', label: 'Western North America' },
  { value: 'enam', label: 'Eastern North America' },
  { value: 'weur', label: 'Western Europe' },
  { value: 'eeur', label: 'Eastern Europe' },
  { value: 'apac', label: 'Asia Pacific' },
]

// ─── Validation ────────────────────────────────────────────────────────────────

const isValid = computed(() => {
  const hasRequiredFields = !!(
    config.value.accountId &&
    config.value.bucket
  )
  // Credentials can come from environment variables, so they're not strictly required in the form
  return hasRequiredFields
})

// Emit validation state when it changes
watch(isValid, (valid) => emit('update:valid', valid), { immediate: true })

// ─── Initialize Defaults ───────────────────────────────────────────────────────

// Ensure region has a default value
if (!config.value.region) {
  config.value.region = 'auto'
}
</script>

<template>
  <div class="space-y-4">
    <UFormField
      label="Account ID"
      required
      hint="Your Cloudflare account ID"
      help="Found in the Cloudflare dashboard under R2 overview. This identifies your Cloudflare account."
    >
      <UInput
        v-model="config.accountId"
        placeholder="your-account-id"
      />
    </UFormField>

    <UFormField
      label="Bucket Name"
      required
      hint="R2 bucket name"
      help="The name of your R2 bucket. Must match exactly as configured in Cloudflare R2."
    >
      <UInput
        v-model="config.bucket"
        placeholder="my-bucket"
      />
    </UFormField>

    <UFormField
      label="Access Key ID"
      hint="R2 access key (or use R2_ACCESS_KEY_ID env var)"
      help="Create an R2 API token in the Cloudflare dashboard. Can be omitted if set via environment variable."
    >
      <UInput
        v-model="config.accessKeyId"
        type="password"
        placeholder="R2 access key"
        autocomplete="off"
      />
    </UFormField>

    <UFormField
      label="Secret Access Key"
      hint="R2 secret key (or use R2_SECRET_ACCESS_KEY env var)"
      help="The secret key from your R2 API token. Can be omitted if set via environment variable."
    >
      <UInput
        v-model="config.secretAccessKey"
        type="password"
        placeholder="R2 secret key"
        autocomplete="off"
      />
    </UFormField>

    <UFormField
      label="Region"
      hint="Usually 'auto' for automatic selection"
      help="R2 uses 'auto' for automatic region selection. Override only if you need to target a specific region."
    >
      <USelect
        v-model="config.region"
        :items="regionOptions"
      />
    </UFormField>

    <UFormField
      label="Custom Domain"
      hint="Optional CDN domain for public URLs"
      help="If you've configured a custom domain for your R2 bucket, enter it here to use it for public URLs instead of the default R2 public URL."
    >
      <UInput
        v-model="config.customDomain"
        placeholder="https://cdn.example.com"
      />
    </UFormField>

    <UFormField
      label="Public Bucket"
      hint="Enable for public read access"
      help="Enable if your R2 bucket has public access configured. This allows generating public URLs without signing."
    >
      <USwitch v-model:checked="config.public" />
    </UFormField>
  </div>
</template>
