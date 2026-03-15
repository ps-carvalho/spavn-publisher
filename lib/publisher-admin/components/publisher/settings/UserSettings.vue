<script setup lang="ts">
import type { UserSettings } from '~/server/utils/publisher/settings/types'
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Switch } from '@spavn/ui'
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { AlertTriangle, Check, RefreshCw, Loader2 } from 'lucide-vue-next'

// ─── State ─────────────────────────────────────────────────────────────────────

const loading = ref(true)
const saving = ref(false)
const settings = ref<UserSettings | null>(null)
const originalSettings = ref<UserSettings | null>(null)
const error = ref<string | null>(null)
const validationErrors = ref<Record<string, string[]>>({})

// ─── Toast ─────────────────────────────────────────────────────────────────────

const { toast } = useToast()

// ─── Options ───────────────────────────────────────────────────────────────────

// Theme options
const themeOptions = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

// Items per page options
const itemsPerPageOptions = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
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
  { value: '5', label: '5 seconds' },
  { value: '15', label: '15 seconds' },
  { value: '30', label: '30 seconds' },
  { value: '60', label: '1 minute' },
  { value: '120', label: '2 minutes' },
  { value: '300', label: '5 minutes' },
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
    await $fetch('/api/publisher/settings/user', {
      method: 'PUT',
      body: settings.value,
    })

    originalSettings.value = JSON.parse(JSON.stringify(settings.value))

    toast({
      title: 'Settings saved',
      description: 'Your preferences have been updated',
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
        My Preferences
      </h3>
      <p class="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
        Personalize your experience
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
      <!-- Profile -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Profile
        </h4>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="firstName">First Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="firstName" v-model="settings.profile.firstName" placeholder="John" />
              <p v-if="validationErrors['profile.firstName']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['profile.firstName'][0] }}</p>
            </div>
            <div class="space-y-2">
              <Label for="lastName">Last Name <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="lastName" v-model="settings.profile.lastName" placeholder="Doe" />
              <p v-if="validationErrors['profile.lastName']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['profile.lastName'][0] }}</p>
            </div>
          </div>
          <div class="space-y-2">
            <Label for="avatarUrl">Avatar URL</Label>
            <Input id="avatarUrl" v-model="settings.profile.avatarUrl" placeholder="https://example.com/avatar.jpg" />
            <p v-if="validationErrors['profile.avatarUrl']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['profile.avatarUrl'][0] }}</p>
          </div>
        </div>
      </section>

      <!-- UI Preferences -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          UI Preferences
        </h4>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label>Theme</Label>
              <Select v-model="settings.preferences.theme">
                <SelectTrigger><SelectValue placeholder="Select theme" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in themeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="validationErrors['preferences.theme']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['preferences.theme'][0] }}</p>
            </div>
            <div class="space-y-2">
              <Label>Items Per Page</Label>
              <Select v-model="settings.preferences.itemsPerPage">
                <SelectTrigger><SelectValue placeholder="Select items per page" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in itemsPerPageOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
              <p v-if="validationErrors['preferences.itemsPerPage']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['preferences.itemsPerPage'][0] }}</p>
            </div>
          </div>
          <div class="space-y-2">
            <Label>Sidebar Collapsed</Label>
            <div class="flex items-center gap-2">
              <Switch v-model:checked="settings.preferences.sidebarCollapsed" />
              <span class="text-sm text-[hsl(var(--muted-foreground))]">
                Start with sidebar collapsed
              </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Notifications -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Notifications
        </h4>
        <div class="space-y-4">
          <div class="flex items-center justify-between p-4 rounded-lg bg-[hsl(var(--background))]">
            <div>
              <p class="font-medium text-[hsl(var(--foreground))]">Email Notifications</p>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Receive email alerts for important events
              </p>
            </div>
            <Switch v-model:checked="settings.notifications.email.enabled" />
          </div>

          <div
            v-if="settings.notifications.email.enabled"
            class="space-y-2"
          >
            <Label>Email Digest Frequency</Label>
            <Select
              v-model="settings.notifications.email.digestFrequency"
            >
              <SelectTrigger><SelectValue placeholder="Select frequency" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in digestFrequencyOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="validationErrors['notifications.email.digestFrequency']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['notifications.email.digestFrequency'][0] }}</p>
          </div>

          <div class="flex items-center justify-between p-4 rounded-lg bg-[hsl(var(--background))]">
            <div>
              <p class="font-medium text-[hsl(var(--foreground))]">In-App Notifications</p>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Show notifications within the application
              </p>
            </div>
            <Switch v-model:checked="settings.notifications.inApp.enabled" />
          </div>
        </div>
      </section>

      <!-- Editor Preferences -->
      <section class="space-y-4">
        <h4 class="text-sm font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wide">
          Editor Preferences
        </h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <Label>Default Editor Mode</Label>
            <Select v-model="settings.editor.defaultMode">
              <SelectTrigger><SelectValue placeholder="Select editor mode" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in editorModeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="validationErrors['editor.defaultMode']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['editor.defaultMode'][0] }}</p>
          </div>
          <div class="space-y-2">
            <Label>Autosave Interval</Label>
            <Select v-model="settings.editor.autosaveInterval">
              <SelectTrigger><SelectValue placeholder="Select interval" /></SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in autosaveIntervalOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="validationErrors['editor.autosaveInterval']?.[0]" class="text-sm text-[hsl(var(--destructive))]">{{ validationErrors['editor.autosaveInterval'][0] }}</p>
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
