<script setup lang="ts">
import type { S3StorageConfig } from '~/server/utils/publisher/storage/types'

// ─── Model ─────────────────────────────────────────────────────────────────────

const config = defineModel<S3StorageConfig>('config', { required: true })

// ─── Emits ─────────────────────────────────────────────────────────────────────

const emit = defineEmits<{
  'update:valid': [value: boolean]
}>()

// ─── Region Options ────────────────────────────────────────────────────────────

const regionOptions = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-1', label: 'US West (N. California)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'EU (Ireland)' },
  { value: 'eu-west-2', label: 'EU (London)' },
  { value: 'eu-central-1', label: 'EU (Frankfurt)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-northeast-2', label: 'Asia Pacific (Seoul)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
  { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
  { value: 'sa-east-1', label: 'South America (São Paulo)' },
  { value: 'ca-central-1', label: 'Canada (Central)' },
]

// ─── Validation ────────────────────────────────────────────────────────────────

const isValid = computed(() => {
  const hasRequiredFields = !!(
    config.value.bucket &&
    config.value.region
  )
  // Credentials can come from environment variables, so they're not strictly required in the form
  return hasRequiredFields
})

// Emit validation state when it changes
watch(isValid, (valid) => emit('update:valid', valid), { immediate: true })

// ─── Computed ──────────────────────────────────────────────────────────────────

// Determine if this looks like a MinIO or custom S3-compatible endpoint
const isCustomEndpoint = computed(() => {
  return !!config.value.endpoint
})

const endpointHint = computed(() => {
  if (isCustomEndpoint.value) {
    return 'Custom S3-compatible endpoint (e.g., MinIO, DigitalOcean Spaces)'
  }
  return 'Leave empty for AWS S3. Required for MinIO, DigitalOcean Spaces, etc.'
})
</script>

<template>
  <div class="space-y-4">
    <UFormField
      label="Bucket Name"
      required
      hint="S3 bucket name"
      help="The name of your S3 bucket. Must match exactly as configured in your S3 provider."
    >
      <UInput
        v-model="config.bucket"
        placeholder="my-bucket"
      />
    </UFormField>

    <UFormField
      label="Region"
      required
      hint="AWS region"
      help="The AWS region where your bucket is located. For custom endpoints, enter the region expected by your provider."
    >
      <UInput
        v-model="config.region"
        placeholder="us-east-1"
      />
    </UFormField>

    <UFormField
      label="Access Key ID"
      hint="AWS access key (or use AWS_ACCESS_KEY_ID env var)"
      help="Your AWS or S3-compatible service access key. Can be omitted if set via environment variable or IAM role."
    >
      <UInput
        v-model="config.accessKeyId"
        type="password"
        placeholder="AWS access key"
        autocomplete="off"
      />
    </UFormField>

    <UFormField
      label="Secret Access Key"
      hint="AWS secret key (or use AWS_SECRET_ACCESS_KEY env var)"
      help="Your AWS or S3-compatible service secret key. Can be omitted if set via environment variable or IAM role."
    >
      <UInput
        v-model="config.secretAccessKey"
        type="password"
        placeholder="AWS secret key"
        autocomplete="off"
      />
    </UFormField>

    <UFormField
      label="Custom Endpoint"
      :hint="endpointHint"
      help="For S3-compatible services like MinIO or DigitalOcean Spaces, enter the service endpoint URL. Leave empty for standard AWS S3."
    >
      <UInput
        v-model="config.endpoint"
        placeholder="https://s3.example.com"
      />
    </UFormField>

    <UFormField
      label="Custom Domain"
      hint="Optional CDN domain for public URLs"
      help="If you've configured a custom domain or CDN for your bucket, enter it here to use it for public URLs."
    >
      <UInput
        v-model="config.customDomain"
        placeholder="https://cdn.example.com"
      />
    </UFormField>

    <UFormField
      label="Force Path Style"
      hint="Required for MinIO and some S3-compatible services"
      help="When enabled, uses path-style URLs (endpoint/bucket/key) instead of virtual-hosted style (bucket.endpoint/key). Required for MinIO."
    >
      <USwitch v-model:checked="config.forcePathStyle" />
    </UFormField>

    <UFormField
      label="Public Bucket"
      hint="Enable for public read access"
      help="Enable if your bucket has public access configured. This allows generating public URLs without signing."
    >
      <USwitch v-model:checked="config.public" />
    </UFormField>
  </div>
</template>
