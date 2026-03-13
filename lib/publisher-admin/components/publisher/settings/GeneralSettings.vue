<script setup lang="ts">
import type { GeneralSettings } from '~/server/utils/publisher/settings/types'

// ─── State ─────────────────────────────────────────────────────────────────────

const loading = ref(true)
const saving = ref(false)
const settings = ref<GeneralSettings | null>(null)
const originalSettings = ref<GeneralSettings | null>(null)
const error = ref<string | null>(null)
const validationErrors = ref<Record<string, string[]>>({})

// ─── Toast ─────────────────────────────────────────────────────────────────────

const toast = useToast()

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
    toast.add({
      title: 'Failed to load settings',
      description: error.value,
      color: 'error',
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

    toast.add({
      title: 'Settings saved',
      description: 'General settings have been updated',
      color: 'success',
    })
  } catch (err: any) {
    if (err?.data?.error?.details) {
      validationErrors.value = err.data.error.details
    }

    toast.add({
      title: 'Failed to save settings',
      description: err?.data?.error?.message || err.message || 'An error occurred',
      color: 'error',
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
  <div class="max-w-2xl space-y-6">
    <!-- Header -->
    <div>
      <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
        General Settings
      </h3>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        Configure site-wide settings and defaults
      </p>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-8 text-center">
      <UIcon name="i-heroicons-arrow-path" class="text-2xl animate-spin text-stone-400" />
      <p class="mt-2 text-sm text-stone-500 dark:text-stone-400">
        Loading settings...
      </p>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="p-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
      <p class="text-red-700 dark:text-red-300">{{ error }}</p>
      <UButton variant="outline" size="sm" class="mt-2" @click="loadSettings">
        Try Again
      </UButton>
    </div>

    <!-- Settings form -->
    <form v-else-if="settings" @submit.prevent="saveSettings" class="space-y-8">
      <!-- Site Identity -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          Site Identity
        </h4>
        <div class="space-y-4">
          <UFormField label="Site Name" required :error="validationErrors.siteName?.[0]">
            <UInput v-model="settings.siteName" placeholder="Publisher CMS" />
          </UFormField>
          <UFormField label="Site Description" :error="validationErrors.siteDescription?.[0]">
            <UInput v-model="settings.siteDescription" placeholder="A brief description of your site" />
          </UFormField>
          <UFormField label="Logo URL" :error="validationErrors.logoUrl?.[0]">
            <UInput v-model="settings.logoUrl" placeholder="https://example.com/logo.png" />
          </UFormField>
          <UFormField label="Favicon URL" :error="validationErrors.faviconUrl?.[0]">
            <UInput v-model="settings.faviconUrl" placeholder="https://example.com/favicon.ico" />
          </UFormField>
        </div>
      </section>

      <!-- Regional Settings -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          Regional Settings
        </h4>
        <div class="space-y-4">
          <UFormField label="Timezone" :error="validationErrors.timezone?.[0]">
            <USelect v-model="settings.timezone" :items="timezoneOptions" />
          </UFormField>
          <UFormField label="Locale" :error="validationErrors.locale?.[0]">
            <USelect v-model="settings.locale" :items="localeOptions" />
          </UFormField>
          <UFormField label="Date Format" :error="validationErrors.dateFormat?.[0]">
            <USelect v-model="settings.dateFormat" :items="dateFormatOptions" />
          </UFormField>
          <UFormField label="Time Format" :error="validationErrors.timeFormat?.[0]">
            <USelect v-model="settings.timeFormat" :items="timeFormatOptions" />
          </UFormField>
        </div>
      </section>

      <!-- SEO Defaults -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          SEO Defaults
        </h4>
        <div class="space-y-4">
          <UFormField
            label="Title Template"
            hint="%s will be replaced with the page title"
            :error="validationErrors['seo.titleTemplate']?.[0]"
          >
            <UInput v-model="settings.seo.titleTemplate" placeholder="%s — My Site" />
          </UFormField>
          <UFormField
            label="Default Meta Description"
            :error="validationErrors['seo.defaultDescription']?.[0]"
          >
            <UTextarea
              v-model="settings.seo.defaultDescription"
              placeholder="A default description for pages without a custom description"
              :rows="2"
            />
          </UFormField>
        </div>
      </section>

      <!-- Maintenance Mode -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          Maintenance Mode
        </h4>
        <div class="p-4 rounded-lg bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800">
          <div class="flex items-center justify-between">
            <div>
              <p class="font-medium text-amber-800 dark:text-amber-200">Enable Maintenance Mode</p>
              <p class="text-sm text-amber-600 dark:text-amber-400">
                Visitors will see a maintenance message instead of the site
              </p>
            </div>
            <USwitch v-model:checked="settings.maintenance.enabled" />
          </div>
          <UFormField
            v-if="settings.maintenance.enabled"
            label="Maintenance Message"
            class="mt-4"
            :error="validationErrors['maintenance.message']?.[0]"
          >
            <UTextarea
              v-model="settings.maintenance.message"
              placeholder="Site is under maintenance. Please check back soon."
              :rows="2"
            />
          </UFormField>
        </div>
      </section>

      <!-- Analytics -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          Analytics
        </h4>
        <div class="space-y-4">
          <UFormField
            label="Google Tag ID"
            hint="e.g., G-XXXXXXXXXX"
            :error="validationErrors['analytics.googleTagId']?.[0]"
          >
            <UInput v-model="settings.analytics.googleTagId" placeholder="G-XXXXXXXXXX" />
          </UFormField>
          <UFormField
            label="Custom Scripts"
            hint="Additional scripts to include in the head (use with caution)"
            :error="validationErrors['analytics.customScripts']?.[0]"
          >
            <UTextarea
              v-model="settings.analytics.customScripts"
              placeholder="<script>...</script>"
              :rows="3"
            />
          </UFormField>
        </div>
      </section>

      <!-- Unsaved Changes Warning -->
      <div
        v-if="hasChanges"
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
          type="submit"
          :loading="saving"
          :disabled="!hasChanges"
        >
          <template v-if="!saving">
            <UIcon name="i-heroicons-check" class="mr-1" />
          </template>
          Save Changes
        </UButton>

        <UButton
          variant="outline"
          color="neutral"
          :disabled="!hasChanges || saving"
          @click="resetSettings"
        >
          Reset
        </UButton>
      </div>
    </form>
  </div>
</template>
