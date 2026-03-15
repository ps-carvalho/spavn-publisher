<script setup lang="ts">
import type { S3StorageConfig } from '~/server/utils/publisher/storage/types'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Switch } from '@spavn/ui'

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
  { value: 'sa-east-1', label: 'South America (Sao Paulo)' },
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
    <div class="space-y-2">
      <Label for="s3BucketName">Bucket Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">The name of your S3 bucket. Must match exactly as configured in your S3 provider.</p>
      <Input
        id="s3BucketName"
        v-model="config.bucket"
        placeholder="my-bucket"
      />
    </div>

    <div class="space-y-2">
      <Label for="s3Region">Region <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">The AWS region where your bucket is located. For custom endpoints, enter the region expected by your provider.</p>
      <Input
        id="s3Region"
        v-model="config.region"
        placeholder="us-east-1"
      />
    </div>

    <div class="space-y-2">
      <Label for="s3AccessKeyId">Access Key ID</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Your AWS or S3-compatible service access key. Can be omitted if set via environment variable or IAM role.</p>
      <Input
        id="s3AccessKeyId"
        v-model="config.accessKeyId"
        type="password"
        placeholder="AWS access key"
        autocomplete="off"
      />
    </div>

    <div class="space-y-2">
      <Label for="s3SecretAccessKey">Secret Access Key</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Your AWS or S3-compatible service secret key. Can be omitted if set via environment variable or IAM role.</p>
      <Input
        id="s3SecretAccessKey"
        v-model="config.secretAccessKey"
        type="password"
        placeholder="AWS secret key"
        autocomplete="off"
      />
    </div>

    <div class="space-y-2">
      <Label for="s3Endpoint">Custom Endpoint</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">{{ endpointHint }}</p>
      <Input
        id="s3Endpoint"
        v-model="config.endpoint"
        placeholder="https://s3.example.com"
      />
    </div>

    <div class="space-y-2">
      <Label for="s3CustomDomain">Custom Domain</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">If you've configured a custom domain or CDN for your bucket, enter it here to use it for public URLs.</p>
      <Input
        id="s3CustomDomain"
        v-model="config.customDomain"
        placeholder="https://cdn.example.com"
      />
    </div>

    <div class="space-y-2">
      <Label>Force Path Style</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">When enabled, uses path-style URLs (endpoint/bucket/key) instead of virtual-hosted style (bucket.endpoint/key). Required for MinIO.</p>
      <Switch v-model:checked="config.forcePathStyle" />
    </div>

    <div class="space-y-2">
      <Label>Public Bucket</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Enable if your bucket has public access configured. This allows generating public URLs without signing.</p>
      <Switch v-model:checked="config.public" />
    </div>
  </div>
</template>
