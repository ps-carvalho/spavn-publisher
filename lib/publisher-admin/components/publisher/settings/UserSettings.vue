<script setup lang="ts">
import type { UserSettings } from '~/server/utils/publisher/settings/types'

// ─── State ─────────────────────────────────────────────────────────────────────

const loading = ref(true)
const saving = ref(false)
const settings = ref<UserSettings | null>(null)
const originalSettings = ref<UserSettings | null>(null)
const error = ref<string | null>(null)
const validationErrors = ref<Record<string, string[]>>({})

// ─── Toast ─────────────────────────────────────────────────────────────────────

const toast = useToast()

// ─── Options ───────────────────────────────────────────────────────────────────

// Theme options
const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Items per page options
const itemsPerPageOptions = [
  { value: 10, label: '10' },
  { value: 25, label: '25' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
]

// Digest frequency options
const digestFrequencyOptions = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'daily', label: 'Daily Digest' },
  { value: 'weekly', label: 'Weekly Digest' },
]

// Editor mode options
const editorModeOptions = [
  { value: 'visual', label: 'Visual Editor' },
  { value: 'code', label: 'Code Editor' },
]

// Autosave interval options (in seconds)
const autosaveIntervalOptions = [
  { value: 5, label: '5 seconds' },
  { value: 15, label: '15 seconds' },
  { value: 30, label: '30 seconds' },
  { value: 60, label: '1 minute' },
  { value: 120, label: '2 minutes' },
  { value: 300, label: '5 minutes' },
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
    const response = await $fetch<{ settings: UserSettings }>('/api/publisher/settings/user')
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
    await $fetch('/api/publisher/settings/user', {
      method: 'PUT',
      body: settings.value,
    })

    originalSettings.value = JSON.parse(JSON.stringify(settings.value))

    toast.add({
      title: 'Settings saved',
      description: 'Your preferences have been updated',
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
        My Preferences
      </h3>
      <p class="text-sm text-stone-500 dark:text-stone-400">
        Personalize your experience
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
      <!-- Profile -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          Profile
        </h4>
        <div class="space-y-4">
          <UFormField label="First Name" required :error="validationErrors['profile.firstName']?.[0]">
            <UInput v-model="settings.profile.firstName" placeholder="John" />
          </UFormField>
          <UFormField label="Last Name" required :error="validationErrors['profile.lastName']?.[0]">
            <UInput v-model="settings.profile.lastName" placeholder="Doe" />
          </UFormField>
          <UFormField label="Avatar URL"  :error="validationErrors['profile.avatarUrl']?.[0]">
            <UInput v-model="settings.profile.avatarUrl" placeholder="https://example.com/avatar.jpg" />
          </UFormField>
        </div>
      </section>

      <!-- UI Preferences -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          UI Preferences
        </h4>
        <div class="space-y-4">
          <UFormField label="Theme" :error="validationErrors['preferences.theme']?.[0]">
            <USelect v-model="settings.preferences.theme" :items="themeOptions" />
          </UFormField>
          <UFormField label="Items Per Page" :error="validationErrors['preferences.itemsPerPage']?.[0]">
            <USelect v-model="settings.preferences.itemsPerPage" :items="itemsPerPageOptions" />
          </UFormField>
          <UFormField label="Sidebar Collapsed" >
            <div class="flex items-center gap-2">
              <USwitch v-model:checked="settings.preferences.sidebarCollapsed" />
              <span class="text-sm text-stone-600 dark:text-stone-400">
                Start with sidebar collapsed
              </span>
            </div>
          </UFormField>
        </div>
      </section>

      <!-- Notifications -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          Notifications
        </h4>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-lg bg-stone-50 dark:bg-stone-800">
            <div>
              <p class="font-medium text-stone-900 dark:text-stone-100">Email Notifications</p>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                Receive email alerts for important events
              </p>
            </div>
            <USwitch v-model:checked="settings.notifications.email.enabled" />
          </div>

          <UFormField
            v-if="settings.notifications.email.enabled"
            label="Email Digest Frequency"
            :error="validationErrors['notifications.email.digestFrequency']?.[0]"
          >
            <USelect
              v-model="settings.notifications.email.digestFrequency"
              :items="digestFrequencyOptions"
            />
          </UFormField>

          <div class="flex items-center justify-between p-4 rounded-lg bg-stone-50 dark:bg-stone-800">
            <div>
              <p class="font-medium text-stone-900 dark:text-stone-100">In-App Notifications</p>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                Show notifications within the application
              </p>
            </div>
            <USwitch v-model:checked="settings.notifications.inApp.enabled" />
          </div>
        </div>
      </section>

      <!-- Editor Preferences -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-stone-700 dark:text-stone-300 uppercase tracking-wide">
          Editor Preferences
        </h4>
        <div class="space-y-4">
          <UFormField label="Default Editor Mode" :error="validationErrors['editor.defaultMode']?.[0]">
            <USelect v-model="settings.editor.defaultMode" :items="editorModeOptions" />
          </UFormField>
          <UFormField label="Autosave Interval" :error="validationErrors['editor.autosaveInterval']?.[0]">
            <USelect v-model="settings.editor.autosaveInterval" :items="autosaveIntervalOptions" />
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
