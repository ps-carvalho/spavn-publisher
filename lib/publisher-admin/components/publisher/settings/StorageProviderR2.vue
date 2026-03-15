<script setup lang="ts">
import type { R2StorageConfig } from '~/server/utils/publisher/storage/types'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Switch } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'

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
    <div class="space-y-2">
      <Label for="r2AccountId">Account ID <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Found in the Cloudflare dashboard under R2 overview. This identifies your Cloudflare account.</p>
      <Input
        id="r2AccountId"
        v-model="config.accountId"
        placeholder="your-account-id"
      />
    </div>

    <div class="space-y-2">
      <Label for="r2Bucket">Bucket Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">The name of your R2 bucket. Must match exactly as configured in Cloudflare R2.</p>
      <Input
        id="r2Bucket"
        v-model="config.bucket"
        placeholder="my-bucket"
      />
    </div>

    <div class="space-y-2">
      <Label for="r2AccessKeyId">Access Key ID</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Create an R2 API token in the Cloudflare dashboard. Can be omitted if set via environment variable.</p>
      <Input
        id="r2AccessKeyId"
        v-model="config.accessKeyId"
        type="password"
        placeholder="R2 access key"
        autocomplete="off"
      />
    </div>

    <div class="space-y-2">
      <Label for="r2SecretAccessKey">Secret Access Key</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">The secret key from your R2 API token. Can be omitted if set via environment variable.</p>
      <Input
        id="r2SecretAccessKey"
        v-model="config.secretAccessKey"
        type="password"
        placeholder="R2 secret key"
        autocomplete="off"
      />
    </div>

    <div class="space-y-2">
      <Label>Region</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">R2 uses 'auto' for automatic region selection. Override only if you need to target a specific region.</p>
      <Select v-model="config.region">
        <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="opt in regionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <Label for="r2CustomDomain">Custom Domain</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">If you've configured a custom domain for your R2 bucket, enter it here to use it for public URLs instead of the default R2 public URL.</p>
      <Input
        id="r2CustomDomain"
        v-model="config.customDomain"
        placeholder="https://cdn.example.com"
      />
    </div>

    <div class="space-y-2">
      <Label>Public Bucket</Label>
      <p class="text-xs text-[hsl(var(--muted-foreground))]">Enable if your R2 bucket has public access configured. This allows generating public URLs without signing.</p>
      <Switch v-model:checked="config.public" />
    </div>
  </div>
</template>
