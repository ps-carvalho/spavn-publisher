<script setup lang="ts">
import type { GeneralSettings } from '~/server/utils/publisher/settings/types'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Textarea } from '@spavn/ui'
import { Switch } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { AlertTriangle, Check, RefreshCw, Loader2 } from 'lucide-vue-next'

// ─── State ─────────────────────────────────────────────────────────────────────

const loading = ref(true)
const saving = ref(false)
const settings = ref<GeneralSettings | null>(null)
const originalSettings = ref<GeneralSettings | null>(null)
const error = ref<string | null>(null)
const validationErrors = ref<Record<string, string[]>>({})

// ─── Toast ─────────────────────────────────────────────────────────────────────

const { toast } = useToast()

// ─── Options ───────────────────────────────────────────────────────────────────

// Timezone options (common timezones)
const timezoneOptions = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

// Locale options
const localeOptions = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'fr-FR', label: 'French (France)' },
  { value: 'de-DE', label: 'German (Germany)' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
]

// Date format options
const dateFormatOptions = [
  { value: 'MMM D, YYYY', label: 'Mar 8, 2026' },
  { value: 'D MMM YYYY', label: '8 Mar 2026' },
  { value: 'YYYY-MM-DD', label: '2026-03-08' },
  { value: 'MM/DD/YYYY', label: '03/08/2026' },
  { value: 'DD/MM/YYYY', label: '08/03/2026' },
]

// Time format options
const timeFormatOptions = [
  { value: 'h:mm A', label: '2:30 PM' },
  { value: 'HH:mm', label: '14:30' },
]

// ─── Computed ──────────────────────────────────────────────────────────────────

const hasChanges = computed(() => {
  if (!settings.value || !originalSettings.value) return false
  return JSON.stringify(settings.value) !== JSON.stringify(originalSettings.value)
})

// ─── Lifecycle ─────────────────────────────────────────────────────────────────

onMounted(async () => {
  await loadSettings()
})

// ─── API Functions ─────────────────────────────────────────────────────────────

async function loadSettings() {
  loading.value = true
  error.value = null

  try {
    const response = await $fetch<{ settings: GeneralSettings }>('/api/publisher/settings/general')
    settings.value = response.settings
    originalSettings.value = JSON.parse(JSON.stringify(response.settings))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load settings'
    toast({
      title: 'Failed to load settings',
      description: error.value ?? undefined,
      variant: 'destructive',
    })
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  if (!settings.value) return

  saving.value = true
  validationErrors.value = {}

  try {
    await $fetch('/api/publisher/settings/general', {
      method: 'PUT',
      body: settings.value,
    })

    originalSettings.value = JSON.parse(JSON.stringify(settings.value))

    toast({
      title: 'Settings saved',
      description: 'General settings have been updated',
    })
  } catch (err: any) {
    if (err?.data?.error?.details) {
      validationErrors.value = err.data.error.details
    }

    toast({
      title: 'Failed to save settings',
      description: err?.data?.error?.message || err.message || 'An error occurred',
      variant: 'destructive',
    })
  } finally {
    saving.value = false
  }
}

function resetSettings() {
  if (originalSettings.value) {
    settings.value = JSON.parse(JSON.stringify(originalSettings.value))
    validationErrors.value = {}
  }
}
</script>

<template>
  <div class="max-w-3xl space-y-6">
    <!-- Header -->
    <div>
      <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] tracking-tight">
        General Settings
      </h3>
      <p class="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
        Configure site-wide settings and defaults
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <RefreshCw class="mx-auto h-6 w-6 animate-spin text-[hsl(var(--muted-foreground))]" />
      <p class="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
        Loading settings...
      </p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-4 rounded-lg bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.3)]">
      <p class="text-[hsl(var(--destructive))]">{{ error }}</p>
      <Button variant="outline" size="sm" class="mt-2" @click="loadSettings">
        Try Again
      </Button>
    </div>

    <!-- Settings form -->
    <form v-else-if="settings" @submit.prevent="saveSettings" class="space-y-8">
      <!-- Site Identity -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Site Identity
        </h4>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="siteName">Site Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input id="siteName" v-model="settings.siteName" placeholder="Publisher CMS" />
            <p v-if="validationErrors.siteName?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.siteName[0] }}</p>
          </div>
          <div class="space-y-2">
            <Label for="siteDescription">Site Description</Label>
            <Textarea id="siteDescription" v-model="settings.siteDescription" placeholder="A brief description of your site" :rows="3" />
            <p v-if="validationErrors.siteDescription?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.siteDescription[0] }}</p>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="logoUrl">Logo URL</Label>
              <Input id="logoUrl" v-model="settings.logoUrl" placeholder="https://example.com/logo.png" />
              <p v-if="validationErrors.logoUrl?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.logoUrl[0] }}</p>
            </div>
            <div class="space-y-2">
              <Label for="faviconUrl">Favicon URL</Label>
              <Input id="faviconUrl" v-model="settings.faviconUrl" placeholder="https://example.com/favicon.ico" />
              <p v-if="validationErrors.faviconUrl?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.faviconUrl[0] }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Regional Settings -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Regional Settings
        </h4>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Timezone</Label>
              <Select v-model="settings.timezone">
                <SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in timezoneOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="validationErrors.timezone?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.timezone[0] }}</p>
            </div>
            <div class="space-y-2">
              <Label>Locale</Label>
              <Select v-model="settings.locale">
                <SelectTrigger><SelectValue placeholder="Select locale" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in localeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="validationErrors.locale?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.locale[0] }}</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Date Format</Label>
              <Select v-model="settings.dateFormat">
                <SelectTrigger><SelectValue placeholder="Select date format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in dateFormatOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="validationErrors.dateFormat?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.dateFormat[0] }}</p>
            </div>
            <div class="space-y-2">
              <Label>Time Format</Label>
              <Select v-model="settings.timeFormat">
                <SelectTrigger><SelectValue placeholder="Select time format" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in timeFormatOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="validationErrors.timeFormat?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors.timeFormat[0] }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- SEO Defaults -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          SEO Defaults
        </h4>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="seoTitleTemplate">Title Template</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">%s will be replaced with the page title</p>
            <Input id="seoTitleTemplate" v-model="settings.seo.titleTemplate" placeholder="%s — My Site" />
            <p v-if="validationErrors['seo.titleTemplate']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['seo.titleTemplate'][0] }}</p>
          </div>
          <div class="space-y-2">
            <Label for="seoDefaultDescription">Default Meta Description</Label>
            <Textarea
              id="seoDefaultDescription"
              v-model="settings.seo.defaultDescription"
              placeholder="A default description for pages without a custom description"
              :rows="4"
            />
            <p v-if="validationErrors['seo.defaultDescription']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['seo.defaultDescription'][0] }}</p>
          </div>
        </div>
      </section>

      <!-- Maintenance Mode -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Maintenance Mode
        </h4>
        <div class="p-4 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-[hsl(var(--foreground))]">Enable Maintenance Mode</p>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Visitors will see a maintenance message instead of the site
              </p>
            </div>
            <Switch v-model:checked="settings.maintenance.enabled" />
          </div>
          <div
            v-if="settings.maintenance.enabled"
            class="mt-4 space-y-2"
          >
            <Label for="maintenanceMessage">Maintenance Message</Label>
            <Textarea
              id="maintenanceMessage"
              v-model="settings.maintenance.message"
              placeholder="Site is under maintenance. Please check back soon."
              :rows="3"
            />
            <p v-if="validationErrors['maintenance.message']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['maintenance.message'][0] }}</p>
          </div>
        </div>
      </section>

      <!-- Analytics -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Analytics
        </h4>
        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="googleTagId">Google Tag ID</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">e.g., G-XXXXXXXXXX</p>
            <Input id="googleTagId" v-model="settings.analytics.googleTagId" placeholder="G-XXXXXXXXXX" />
            <p v-if="validationErrors['analytics.googleTagId']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['analytics.googleTagId'][0] }}</p>
          </div>
          <div class="space-y-2">
            <Label for="customScripts">Custom Scripts</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Additional scripts to include in the head (use with caution)</p>
            <Textarea
              id="customScripts"
              v-model="settings.analytics.customScripts"
              placeholder="<script>...</script>"
              :rows="5"
              class="font-mono text-sm"
            />
            <p v-if="validationErrors['analytics.customScripts']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['analytics.customScripts'][0] }}</p>
          </div>
        </div>
      </section>

      <!-- Unsaved Changes Warning -->
      <div
        v-if="hasChanges"
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
          type="submit"
          :disabled="!hasChanges || saving"
        >
          <Loader2 v-if="saving" class="h-4 w-4 mr-2 animate-spin" />
          <Check v-else class="h-4 w-4 mr-2" />
          Save Changes
        </Button>

        <Button
          variant="outline"
          :disabled="!hasChanges || saving"
          @click="resetSettings"
        >
          Reset
        </Button>
      </div>
    </form>
  </div>
</template>
