<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

/** Feature flags from runtime config */
const features = useRuntimeConfig().public.features as {
  enableMagicLinks: boolean
  enableWebAuthn: boolean
  enableTOTP: boolean
  requirePasswordless: boolean
} | undefined

interface WebAuthnCredential {
  id: string
  deviceName: string | null
  createdAt: string
  lastUsedAt: string | null
}

interface AuthPreferences {
  authMethod: string
  emailVerified: string | null
  hasPassword: boolean
  hasWebAuthn: boolean
  hasTOTP: boolean
  webauthnCredentials: number
}

interface AuditEntry {
  type: string
  userId: number
  performedBy: number
  timestamp: string
  ipAddress: string
  userAgent: string
  details: Record<string, unknown>
}

interface DeviceEntry {
  id: number
  deviceName: string | null
  ipAddress: string
  isTrusted: boolean
  isCurrent?: boolean
  lastUsedAt: string
  createdAt: string
}

const { registerPasskey, listCredentials, deleteCredential, isSupported, isLoading, error } = useWebAuthn()
const {
  setupTOTP,
  verifyTOTPSetup,
  disableTOTP,
  setupData: totpSetupData,
  isLoading: totpLoading,
  error: totpError,
} = useTOTP()
const {
  getPreferences,
  regenerateBackupCodes,
  getAuditLog,
  getDevices,
  revokeDevice,
  trustDevice,
  isLoading: authLoading,
  error: authError,
} = usePublisherAuth()

const credentials = ref<WebAuthnCredential[]>([])
const loadingCredentials = ref(true)
const showAddDialog = ref(false)
const newDeviceName = ref('')
const deletingId = ref<string | null>(null)
const successMessage = ref('')

// ─── Auth Preferences State ─────────────────────────────────────
const preferences = ref<AuthPreferences | null>(null)
const loadingPreferences = ref(true)

// ─── TOTP State ──────────────────────────────────────────────────
const totpEnabled = ref(false)
const totpSetupStep = ref<'idle' | 'qr' | 'verify' | 'done'>('idle')
const totpVerifyCode = ref('')
const totpDisableCode = ref('')
const showDisableDialog = ref(false)
const totpBackupCodes = ref<string[]>([])
const backupCodesCopied = ref(false)

// ─── Backup Codes Regeneration State ────────────────────────────
const showRegenDialog = ref(false)
const regenCode = ref('')
const regenLoading = ref(false)
const regenError = ref<string | null>(null)
const newBackupCodes = ref<string[]>([])
const regenBackupCodesCopied = ref(false)

// ─── Audit Log State ────────────────────────────────────────────
const auditEntries = ref<AuditEntry[]>([])
const loadingAudit = ref(true)

// ─── Device Management State ────────────────────────────────────
const devices = ref<DeviceEntry[]>([])
const loadingDevices = ref(true)
const revokingDeviceId = ref<number | null>(null)

// Load all data on mount
onMounted(async () => {
  await Promise.all([
    loadCredentials(),
    checkTOTPStatus(),
    loadPreferences(),
    loadAuditLog(),
    loadDevices(),
  ])
})

async function loadPreferences() {
  loadingPreferences.value = true
  try {
    preferences.value = await getPreferences()
  }
  finally {
    loadingPreferences.value = false
  }
}

async function loadAuditLog() {
  loadingAudit.value = true
  try {
    auditEntries.value = await getAuditLog(undefined, 10)
  }
  finally {
    loadingAudit.value = false
  }
}

async function checkTOTPStatus() {
  try {
    const data = await $fetch<{ enabled: boolean }>('/api/publisher/auth/totp/status')
    totpEnabled.value = data.enabled
  }
  catch {
    totpEnabled.value = false
  }
}

async function loadCredentials() {
  loadingCredentials.value = true
  try {
    credentials.value = await listCredentials()
  }
  finally {
    loadingCredentials.value = false
  }
}

async function handleAddPasskey() {
  successMessage.value = ''
  const credential = await registerPasskey(newDeviceName.value || undefined)

  if (credential) {
    successMessage.value = 'Passkey registered successfully'
    newDeviceName.value = ''
    showAddDialog.value = false
    await Promise.all([loadCredentials(), loadPreferences()])
  }
}

async function handleDeletePasskey(credentialId: string) {
  deletingId.value = credentialId
  successMessage.value = ''

  const success = await deleteCredential(credentialId)
  if (success) {
    successMessage.value = 'Passkey removed successfully'
    credentials.value = credentials.value.filter(c => c.id !== credentialId)
    await loadPreferences()
  }

  deletingId.value = null
}

// ─── TOTP Handlers ──────────────────────────────────────────────

async function handleStartTOTPSetup() {
  successMessage.value = ''
  const data = await setupTOTP()
  if (data) {
    totpBackupCodes.value = data.backupCodes
    totpSetupStep.value = 'qr'
  }
}

async function handleVerifyTOTPSetup() {
  if (!totpVerifyCode.value) return

  const success = await verifyTOTPSetup(totpVerifyCode.value)
  if (success) {
    totpSetupStep.value = 'done'
    totpEnabled.value = true
    totpVerifyCode.value = ''
    successMessage.value = 'Authenticator app has been set up successfully'
    await loadPreferences()
  }
}

function handleFinishSetup() {
  totpSetupStep.value = 'idle'
  totpSetupData.value = null
  totpBackupCodes.value = []
  backupCodesCopied.value = false
}

async function handleDisableTOTP() {
  if (!totpDisableCode.value) return

  const success = await disableTOTP(totpDisableCode.value)
  if (success) {
    totpEnabled.value = false
    totpDisableCode.value = ''
    showDisableDialog.value = false
    successMessage.value = 'Authenticator app has been disabled'
    await loadPreferences()
  }
}

async function copyBackupCodes() {
  const text = totpBackupCodes.value.join('\n')
  await navigator.clipboard.writeText(text)
  backupCodesCopied.value = true
  setTimeout(() => { backupCodesCopied.value = false }, 2000)
}

function downloadBackupCodes() {
  const text = `Publisher CMS - Backup Codes\n${'='.repeat(30)}\n\nSave these codes in a safe place.\nEach code can only be used once.\n\n${totpBackupCodes.value.join('\n')}\n`
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'publisher-backup-codes.txt'
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Backup Code Regeneration Handlers ──────────────────────────

async function handleRegenerateBackupCodes() {
  if (!regenCode.value || regenCode.value.length !== 6) return

  regenLoading.value = true
  regenError.value = null

  const codes = await regenerateBackupCodes(regenCode.value)
  regenLoading.value = false

  if (codes) {
    newBackupCodes.value = codes
    regenCode.value = ''
    successMessage.value = 'Backup codes have been regenerated'
    await loadAuditLog()
  }
  else {
    regenError.value = authError.value?.message || 'Failed to regenerate backup codes'
  }
}

function closeRegenDialog() {
  showRegenDialog.value = false
  regenCode.value = ''
  regenError.value = null
  newBackupCodes.value = []
  regenBackupCodesCopied.value = false
}

async function copyRegenBackupCodes() {
  const text = newBackupCodes.value.join('\n')
  await navigator.clipboard.writeText(text)
  regenBackupCodesCopied.value = true
  setTimeout(() => { regenBackupCodesCopied.value = false }, 2000)
}

function downloadRegenBackupCodes() {
  const text = `Publisher CMS - Backup Codes (Regenerated)\n${'='.repeat(42)}\n\nSave these codes in a safe place.\nEach code can only be used once.\nPrevious backup codes are no longer valid.\n\n${newBackupCodes.value.join('\n')}\n`
  const blob = new Blob([text], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'publisher-backup-codes.txt'
  a.click()
  URL.revokeObjectURL(url)
}

async function loadDevices() {
  loadingDevices.value = true
  try {
    devices.value = await getDevices()
  }
  finally {
    loadingDevices.value = false
  }
}

async function handleRevokeDevice(deviceId: number) {
  revokingDeviceId.value = deviceId
  successMessage.value = ''

  const success = await revokeDevice(deviceId)
  if (success) {
    successMessage.value = 'Device has been revoked'
    devices.value = devices.value.filter(d => d.id !== deviceId)
    await loadAuditLog()
  }

  revokingDeviceId.value = null
}

async function handleToggleTrust(device: DeviceEntry) {
  const newTrust = !device.isTrusted
  const success = await trustDevice(device.id, newTrust)
  if (success) {
    device.isTrusted = newTrust
    successMessage.value = newTrust ? 'Device marked as trusted' : 'Device marked as untrusted'
  }
}

function getDeviceIcon(deviceName: string | null): string {
  if (!deviceName) return 'i-heroicons-computer-desktop'
  const name = deviceName.toLowerCase()
  if (name.includes('ios') || name.includes('iphone') || name.includes('ipad')) return 'i-heroicons-device-phone-mobile'
  if (name.includes('android')) return 'i-heroicons-device-phone-mobile'
  if (name.includes('mobile')) return 'i-heroicons-device-phone-mobile'
  return 'i-heroicons-computer-desktop'
}

function handlePreferenceUpdated() {
  loadPreferences()
  loadAuditLog()
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function truncateId(id: string): string {
  if (id.length <= 16) return id
  return `${id.slice(0, 8)}...${id.slice(-8)}`
}

function getAuditEventLabel(type: string): string {
  const labels: Record<string, string> = {
    auth_method_change: 'Auth method changed',
    backup_codes_regenerated: 'Backup codes regenerated',
    password_changed: 'Password changed',
    totp_enabled: 'TOTP enabled',
    totp_disabled: 'TOTP disabled',
    passkey_added: 'Passkey added',
    passkey_removed: 'Passkey removed',
    magic_link_requested: 'Magic link requested',
    login_success: 'Login successful',
    login_failed: 'Login failed',
    admin_force_auth_method: 'Auth method forced by admin',
    preference_updated: 'Preference updated',
  }
  return labels[type] || type
}

function getAuditEventIcon(type: string): string {
  const icons: Record<string, string> = {
    auth_method_change: 'i-heroicons-arrow-path',
    backup_codes_regenerated: 'i-heroicons-key',
    password_changed: 'i-heroicons-lock-closed',
    totp_enabled: 'i-heroicons-shield-check',
    totp_disabled: 'i-heroicons-shield-exclamation',
    passkey_added: 'i-heroicons-finger-print',
    passkey_removed: 'i-heroicons-finger-print',
    login_success: 'i-heroicons-check-circle',
    login_failed: 'i-heroicons-x-circle',
    admin_force_auth_method: 'i-heroicons-exclamation-triangle',
    preference_updated: 'i-heroicons-cog-6-tooth',
  }
  return icons[type] || 'i-heroicons-information-circle'
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Security</h2>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Manage your authentication methods, passkeys, and security settings
        </p>
      </div>
      <NuxtLink to="/admin/settings">
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-heroicons-arrow-left"
          size="sm"
        >
          Back to Settings
        </UButton>
      </NuxtLink>
    </div>

    <!-- Success Alert -->
    <UAlert
      v-if="successMessage"
      color="success"
      variant="subtle"
      icon="i-heroicons-check-circle"
      :title="successMessage"
      :close-button="{ onClick: () => successMessage = '' }"
    />

    <!-- Error Alert -->
    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-heroicons-exclamation-triangle"
      :title="error"
    />

    <!-- Authentication Methods Section -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div class="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <UIcon name="i-heroicons-cog-6-tooth" class="text-xl text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Authentication Methods</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Magic Link + Second Factor (Passkey or TOTP)
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading -->
        <div v-if="loadingPreferences" class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="text-2xl text-stone-400 animate-spin" />
        </div>

        <!-- Preferences loaded -->
        <div v-else-if="preferences" class="space-y-6">
          <!-- Current Status Overview -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-center">
              <UIcon
                name="i-heroicons-envelope"
                class="text-xl mb-1 text-green-500"
              />
              <p class="text-xs font-medium text-stone-700 dark:text-stone-300">Magic Link</p>
              <p class="text-xs text-green-600 dark:text-green-400">Primary Method</p>
            </div>
            <div v-if="features?.enableWebAuthn !== false" class="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-center">
              <UIcon
                name="i-heroicons-finger-print"
                class="text-xl mb-1"
                :class="preferences.hasWebAuthn ? 'text-green-500' : 'text-stone-300 dark:text-stone-600'"
              />
              <p class="text-xs font-medium text-stone-700 dark:text-stone-300">Passkeys</p>
              <p class="text-xs" :class="preferences.hasWebAuthn ? 'text-green-600 dark:text-green-400' : 'text-stone-400'">
                {{ preferences.webauthnCredentials > 0 ? `${preferences.webauthnCredentials} registered` : 'None' }}
              </p>
            </div>
            <div v-if="features?.enableTOTP !== false" class="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-center">
              <UIcon
                name="i-heroicons-shield-check"
                class="text-xl mb-1"
                :class="preferences.hasTOTP ? 'text-green-500' : 'text-stone-300 dark:text-stone-600'"
              />
              <p class="text-xs font-medium text-stone-700 dark:text-stone-300">TOTP</p>
              <p class="text-xs" :class="preferences.hasTOTP ? 'text-green-600 dark:text-green-400' : 'text-stone-400'">
                {{ preferences.hasTOTP ? 'Enabled' : 'Not set up' }}
              </p>
            </div>
          </div>

          <p class="text-sm text-stone-500 dark:text-stone-400">
            <UIcon name="i-heroicons-information-circle" class="inline-block mr-1" />
            Magic Link is always the first step. Passkeys and TOTP are used as second factors for additional security.
          </p>
        </div>
      </div>
    </div>

    <!-- Passkeys Section (only shown when WebAuthn feature is enabled) -->
    <div v-if="features?.enableWebAuthn !== false" class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <UIcon name="i-heroicons-finger-print" class="text-xl text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Passkeys</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Use passkeys for fast, secure passwordless sign-in
            </p>
          </div>
        </div>
        <UButton
          v-if="isSupported"
          icon="i-heroicons-plus"
          size="sm"
          @click="showAddDialog = true"
        >
          Add Passkey
        </UButton>
      </div>

      <!-- Browser Not Supported -->
      <div v-if="!isSupported" class="p-6">
        <div class="text-center py-8">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
          <p class="text-stone-500 dark:text-stone-400">
            Your browser does not support passkeys (WebAuthn).
          </p>
          <p class="text-sm text-stone-400 dark:text-stone-500 mt-1">
            Try using a modern browser like Chrome, Safari, or Firefox.
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="loadingCredentials" class="p-6">
        <div class="flex items-center justify-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="text-2xl text-stone-400 animate-spin" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="credentials.length === 0" class="p-6">
        <div class="text-center py-8">
          <UIcon name="i-heroicons-finger-print" class="text-4xl text-stone-300 dark:text-stone-600 mb-3" />
          <p class="text-stone-500 dark:text-stone-400 font-medium">No passkeys registered</p>
          <p class="text-sm text-stone-400 dark:text-stone-500 mt-1">
            Add a passkey to enable fast, secure passwordless sign-in.
          </p>
          <UButton
            class="mt-4"
            icon="i-heroicons-plus"
            size="sm"
            @click="showAddDialog = true"
          >
            Add Your First Passkey
          </UButton>
        </div>
      </div>

      <!-- Credentials List -->
      <div v-else class="divide-y divide-stone-200 dark:divide-stone-800">
        <div
          v-for="credential in credentials"
          :key="credential.id"
          class="flex items-center justify-between p-4 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800">
              <UIcon name="i-heroicons-key" class="text-lg text-stone-500 dark:text-stone-400" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                {{ credential.deviceName || 'Unnamed Passkey' }}
              </p>
              <div class="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500">
                <span>Added {{ formatDate(credential.createdAt) }}</span>
                <span v-if="credential.lastUsedAt" class="flex items-center gap-1">
                  <UIcon name="i-heroicons-clock" class="text-xs" />
                  Last used {{ formatDate(credential.lastUsedAt) }}
                </span>
              </div>
              <p class="text-xs text-stone-300 dark:text-stone-600 font-mono mt-0.5">
                {{ truncateId(credential.id) }}
              </p>
            </div>
          </div>
          <UButton
            color="error"
            variant="ghost"
            icon="i-heroicons-trash"
            size="xs"
            :loading="deletingId === credential.id"
            @click="handleDeletePasskey(credential.id)"
          />
        </div>
      </div>
    </div>

    <!-- Authenticator App Section (only shown when TOTP feature is enabled) -->
    <div v-if="features?.enableTOTP !== false" class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <UIcon name="i-heroicons-shield-check" class="text-xl text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Authenticator App</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Use an authenticator app for two-factor authentication
            </p>
          </div>
        </div>
      </div>

      <!-- TOTP Error -->
      <UAlert
        v-if="totpError"
        color="error"
        variant="subtle"
        icon="i-heroicons-exclamation-triangle"
        :title="totpError"
        class="m-4"
      />

      <div class="p-6">
        <!-- Already Enabled -->
        <div v-if="totpEnabled && totpSetupStep === 'idle'" class="space-y-4">
          <div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <UIcon name="i-heroicons-check-circle" class="text-xl text-green-600 dark:text-green-500" />
            <div>
              <p class="text-sm font-medium text-green-800 dark:text-green-200">Authenticator app is enabled</p>
              <p class="text-xs text-green-600 dark:text-green-400">Your account is protected with two-factor authentication.</p>
            </div>
          </div>
          <div class="flex gap-2">
            <UButton
              variant="soft"
              icon="i-heroicons-key"
              size="sm"
              @click="showRegenDialog = true"
            >
              Regenerate Backup Codes
            </UButton>
            <UButton
              color="error"
              variant="soft"
              icon="i-heroicons-shield-exclamation"
              size="sm"
              @click="showDisableDialog = true"
            >
              Disable Authenticator
            </UButton>
          </div>
        </div>

        <!-- Not Set Up -->
        <div v-else-if="!totpEnabled && totpSetupStep === 'idle'" class="text-center py-6">
          <UIcon name="i-heroicons-shield-check" class="text-4xl text-stone-300 dark:text-stone-600 mb-3" />
          <p class="text-stone-500 dark:text-stone-400 font-medium">No authenticator app configured</p>
          <p class="text-sm text-stone-400 dark:text-stone-500 mt-1">
            Add an authenticator app like Google Authenticator, Authy, or 1Password for extra security.
          </p>
          <UButton
            class="mt-4"
            icon="i-heroicons-shield-check"
            size="sm"
            :loading="totpLoading"
            @click="handleStartTOTPSetup"
          >
            Set Up Authenticator
          </UButton>
        </div>

        <!-- Setup Step 1: QR Code -->
        <div v-else-if="totpSetupStep === 'qr'" class="space-y-5">
          <div class="space-y-2">
            <h4 class="text-base font-semibold text-stone-900 dark:text-stone-100">Step 1: Scan QR Code</h4>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Open your authenticator app and scan this QR code to add your account.
            </p>
          </div>

          <!-- QR Code -->
          <div v-if="totpSetupData?.qrCodeUrl" class="flex justify-center">
            <div class="p-4 bg-white rounded-xl shadow-sm border border-stone-200">
              <img :src="totpSetupData.qrCodeUrl" alt="TOTP QR Code" class="w-[200px] h-[200px]" />
            </div>
          </div>

          <!-- Manual Entry -->
          <div v-if="totpSetupData?.secret" class="space-y-1">
            <p class="text-xs text-stone-400 dark:text-stone-500">
              Can't scan? Enter this code manually:
            </p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 bg-stone-100 dark:bg-stone-800 rounded-lg text-sm font-mono text-stone-700 dark:text-stone-300 break-all select-all">
                {{ totpSetupData.secret }}
              </code>
            </div>
          </div>

          <!-- Backup Codes -->
          <div class="space-y-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <div class="flex items-start gap-2">
              <UIcon name="i-heroicons-exclamation-triangle" class="text-lg text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p class="text-sm font-semibold text-amber-800 dark:text-amber-200">Save your backup codes</p>
                <p class="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  These codes can be used to access your account if you lose your authenticator app.
                  Each code can only be used once. Store them in a safe place.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-1.5">
              <code
                v-for="code in totpBackupCodes"
                :key="code"
                class="px-2 py-1 bg-white dark:bg-stone-800 rounded text-sm font-mono text-stone-700 dark:text-stone-300 text-center"
              >
                {{ code }}
              </code>
            </div>

            <div class="flex gap-2">
              <UButton
                size="xs"
                variant="soft"
                :icon="backupCodesCopied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                @click="copyBackupCodes"
              >
                {{ backupCodesCopied ? 'Copied!' : 'Copy' }}
              </UButton>
              <UButton
                size="xs"
                variant="soft"
                icon="i-heroicons-arrow-down-tray"
                @click="downloadBackupCodes"
              >
                Download
              </UButton>
            </div>
          </div>

          <!-- Next Step -->
          <div class="flex justify-end">
            <UButton
              icon="i-heroicons-arrow-right"
              @click="totpSetupStep = 'verify'"
            >
              Continue to Verification
            </UButton>
          </div>
        </div>

        <!-- Setup Step 2: Verify -->
        <div v-else-if="totpSetupStep === 'verify'" class="space-y-5">
          <div class="space-y-2">
            <h4 class="text-base font-semibold text-stone-900 dark:text-stone-100">Step 2: Verify Code</h4>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Enter the 6-digit code from your authenticator app to complete setup.
            </p>
          </div>

          <UFormField label="Verification Code" name="totp-verify">
            <UInput
              v-model="totpVerifyCode"
              type="text"
              placeholder="000000"
              icon="i-heroicons-shield-check"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              size="lg"
              class="w-full"
              @keyup.enter="handleVerifyTOTPSetup"
            />
          </UFormField>

          <div class="flex justify-between">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-heroicons-arrow-left"
              @click="totpSetupStep = 'qr'"
            >
              Back
            </UButton>
            <UButton
              icon="i-heroicons-check"
              :loading="totpLoading"
              :disabled="totpVerifyCode.length !== 6"
              @click="handleVerifyTOTPSetup"
            >
              Verify & Enable
            </UButton>
          </div>
        </div>

        <!-- Setup Complete -->
        <div v-else-if="totpSetupStep === 'done'" class="space-y-4 text-center py-4">
          <UIcon name="i-heroicons-check-circle" class="text-5xl text-green-500" />
          <div>
            <p class="text-lg font-semibold text-stone-900 dark:text-stone-100">Setup Complete!</p>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
              Your authenticator app is now configured. You can use it to sign in to your account.
            </p>
          </div>
          <UButton @click="handleFinishSetup">
            Done
          </UButton>
        </div>
      </div>
    </div>

    <!-- Active Devices Section -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div class="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <UIcon name="i-heroicons-device-phone-mobile" class="text-xl text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Active Devices</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Devices that have signed in to your account
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading -->
        <div v-if="loadingDevices" class="flex items-center justify-center py-6">
          <UIcon name="i-heroicons-arrow-path" class="text-2xl text-stone-400 animate-spin" />
        </div>

        <!-- Empty -->
        <div v-else-if="devices.length === 0" class="text-center py-6">
          <UIcon name="i-heroicons-device-phone-mobile" class="text-4xl text-stone-300 dark:text-stone-600 mb-3" />
          <p class="text-stone-500 dark:text-stone-400">No devices tracked yet</p>
          <p class="text-sm text-stone-400 dark:text-stone-500 mt-1">
            Devices will appear here after your next sign-in.
          </p>
        </div>

        <!-- Device List -->
        <div v-else class="space-y-3">
          <div
            v-for="device in devices"
            :key="device.id"
            class="flex items-center justify-between p-4 rounded-lg border transition-colors"
            :class="device.isCurrent
              ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
              : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50'"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-stone-100 dark:bg-stone-800">
                <UIcon :name="getDeviceIcon(device.deviceName)" class="text-lg text-stone-500 dark:text-stone-400" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                    {{ device.deviceName || 'Unknown Device' }}
                  </p>
                  <span
                    v-if="device.isCurrent"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                  >
                    Current
                  </span>
                  <span
                    v-if="device.isTrusted"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  >
                    Trusted
                  </span>
                </div>
                <div class="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  <span>IP: {{ device.ipAddress }}</span>
                  <span class="flex items-center gap-1">
                    <UIcon name="i-heroicons-clock" class="text-xs" />
                    Last active {{ formatDate(device.lastUsedAt) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0 ml-3">
              <UButton
                :color="device.isTrusted ? 'neutral' : 'primary'"
                variant="ghost"
                :icon="device.isTrusted ? 'i-heroicons-shield-check' : 'i-heroicons-shield-exclamation'"
                size="xs"
                :title="device.isTrusted ? 'Remove trust' : 'Trust this device'"
                @click="handleToggleTrust(device)"
              />
              <UButton
                v-if="!device.isCurrent"
                color="error"
                variant="ghost"
                icon="i-heroicons-trash"
                size="xs"
                :loading="revokingDeviceId === device.id"
                title="Revoke device"
                @click="handleRevokeDevice(device.id)"
              />
            </div>
          </div>

          <p class="text-xs text-stone-400 dark:text-stone-500 mt-2">
            Trusted devices won't trigger new device sign-in email alerts.
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Auth Activity Section -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <div class="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
            <UIcon name="i-heroicons-clock" class="text-xl text-amber-600 dark:text-amber-500" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Recent Activity</h3>
            <p class="text-sm text-stone-500 dark:text-stone-400">
              Recent authentication and security events
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading -->
        <div v-if="loadingAudit" class="flex items-center justify-center py-6">
          <UIcon name="i-heroicons-arrow-path" class="text-2xl text-stone-400 animate-spin" />
        </div>

        <!-- Empty -->
        <div v-else-if="auditEntries.length === 0" class="text-center py-6">
          <UIcon name="i-heroicons-clock" class="text-4xl text-stone-300 dark:text-stone-600 mb-3" />
          <p class="text-stone-500 dark:text-stone-400">No recent activity</p>
        </div>

        <!-- Entries -->
        <div v-else class="space-y-3">
          <div
            v-for="(entry, idx) in auditEntries"
            :key="idx"
            class="flex items-start gap-3 p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50"
          >
            <UIcon
              :name="getAuditEventIcon(entry.type)"
              class="text-lg text-stone-500 dark:text-stone-400 mt-0.5 shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-stone-900 dark:text-stone-100">
                {{ getAuditEventLabel(entry.type) }}
              </p>
              <div class="flex items-center gap-3 text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                <span>{{ formatDate(entry.timestamp) }}</span>
                <span v-if="entry.ipAddress && entry.ipAddress !== 'unknown'">
                  IP: {{ entry.ipAddress }}
                </span>
              </div>
              <p
                v-if="entry.details && Object.keys(entry.details).length > 0"
                class="text-xs text-stone-400 dark:text-stone-500 mt-0.5"
              >
                <template v-if="entry.details.oldMethod && entry.details.newMethod">
                  {{ entry.details.oldMethod }} &rarr; {{ entry.details.newMethod }}
                </template>
                <template v-else-if="entry.details.field">
                  {{ entry.details.field }} updated
                </template>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Add Passkey Dialog -->
    <UModal v-model:open="showAddDialog">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <UIcon name="i-heroicons-finger-print" class="text-xl text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Add Passkey</h3>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                Register a new passkey for this account
              </p>
            </div>
          </div>

          <UFormField label="Device Name" name="deviceName" hint="Optional">
            <UInput
              v-model="newDeviceName"
              placeholder="e.g., MacBook Pro, iPhone, YubiKey"
              icon="i-heroicons-device-phone-mobile"
              size="lg"
              class="w-full"
            />
          </UFormField>

          <p class="text-sm text-stone-500 dark:text-stone-400">
            Your browser will prompt you to create a passkey using your device's biometrics,
            security key, or screen lock.
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showAddDialog = false"
            >
              Cancel
            </UButton>
            <UButton
              icon="i-heroicons-finger-print"
              :loading="isLoading"
              @click="handleAddPasskey"
            >
              Register Passkey
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Disable TOTP Dialog -->
    <UModal v-model:open="showDisableDialog">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/20">
              <UIcon name="i-heroicons-shield-exclamation" class="text-xl text-red-600 dark:text-red-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Disable Authenticator</h3>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                Enter your current authenticator code to confirm
              </p>
            </div>
          </div>

          <UAlert
            v-if="totpError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="totpError"
          />

          <UFormField label="Authenticator Code" name="disable-totp">
            <UInput
              v-model="totpDisableCode"
              type="text"
              placeholder="000000"
              icon="i-heroicons-shield-check"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              size="lg"
              class="w-full"
              @keyup.enter="handleDisableTOTP"
            />
          </UFormField>

          <p class="text-sm text-stone-500 dark:text-stone-400">
            This will remove the authenticator app from your account. You will no longer be able
            to sign in using authenticator codes.
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <UButton
              color="neutral"
              variant="ghost"
              @click="showDisableDialog = false; totpDisableCode = ''"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              icon="i-heroicons-shield-exclamation"
              :loading="totpLoading"
              :disabled="totpDisableCode.length !== 6"
              @click="handleDisableTOTP"
            >
              Disable
            </UButton>
          </div>
        </div>
      </template>
    </UModal>

    <!-- Regenerate Backup Codes Dialog -->
    <UModal v-model:open="showRegenDialog" @close="closeRegenDialog">
      <template #content>
        <div class="p-6 space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <UIcon name="i-heroicons-key" class="text-xl text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Regenerate Backup Codes</h3>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                {{ newBackupCodes.length > 0 ? 'Save your new backup codes' : 'Verify your identity to continue' }}
              </p>
            </div>
          </div>

          <!-- Error -->
          <UAlert
            v-if="regenError"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="regenError"
          />

          <!-- Step 1: Verify TOTP code -->
          <template v-if="newBackupCodes.length === 0">
            <UAlert
              color="warning"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
              title="This will invalidate all existing backup codes."
            />

            <UFormField label="Authenticator Code" name="regen-totp">
              <UInput
                v-model="regenCode"
                type="text"
                placeholder="000000"
                icon="i-heroicons-shield-check"
                maxlength="6"
                autocomplete="one-time-code"
                inputmode="numeric"
                size="lg"
                class="w-full"
                @keyup.enter="handleRegenerateBackupCodes"
              />
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                color="neutral"
                variant="ghost"
                @click="closeRegenDialog"
              >
                Cancel
              </UButton>
              <UButton
                icon="i-heroicons-key"
                :loading="regenLoading"
                :disabled="regenCode.length !== 6"
                @click="handleRegenerateBackupCodes"
              >
                Regenerate
              </UButton>
            </div>
          </template>

          <!-- Step 2: Show new backup codes -->
          <template v-else>
            <div class="space-y-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div class="flex items-start gap-2">
                <UIcon name="i-heroicons-exclamation-triangle" class="text-lg text-amber-600 dark:text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p class="text-sm font-semibold text-amber-800 dark:text-amber-200">Save your new backup codes</p>
                  <p class="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    These codes replace your previous backup codes. Store them in a safe place.
                    Each code can only be used once.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-1.5">
                <code
                  v-for="code in newBackupCodes"
                  :key="code"
                  class="px-2 py-1 bg-white dark:bg-stone-800 rounded text-sm font-mono text-stone-700 dark:text-stone-300 text-center"
                >
                  {{ code }}
                </code>
              </div>

              <div class="flex gap-2">
                <UButton
                  size="xs"
                  variant="soft"
                  :icon="regenBackupCodesCopied ? 'i-heroicons-check' : 'i-heroicons-clipboard-document'"
                  @click="copyRegenBackupCodes"
                >
                  {{ regenBackupCodesCopied ? 'Copied!' : 'Copy' }}
                </UButton>
                <UButton
                  size="xs"
                  variant="soft"
                  icon="i-heroicons-arrow-down-tray"
                  @click="downloadRegenBackupCodes"
                >
                  Download
                </UButton>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <UButton @click="closeRegenDialog">
                Done
              </UButton>
            </div>
          </template>
        </div>
      </template>
    </UModal>
  </div>
</template>
