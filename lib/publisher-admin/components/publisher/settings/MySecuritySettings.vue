<script setup lang="ts">
import { Button } from '@spavn/ui'
import { Input } from '@spavn/ui'
import { Label } from '@spavn/ui'
import { Alert, AlertTitle, AlertDescription } from '@spavn/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@spavn/ui'
import {
  AlertTriangle, ArrowLeft, ArrowRight, Check, CheckCircle, ClipboardCopy,
  Clock, Download, Fingerprint, Info, Key, Lock, Mail, RefreshCw,
  Settings, ShieldAlert, ShieldCheck, Smartphone, Trash2, XCircle, Loader2,
} from 'lucide-vue-next'

// Invalidate the onboarding cache when 2FA methods change so the middleware re-checks
function invalidateOnboardingCache() {
  useState<boolean>('security-onboarding-checked').value = false
  useState<boolean>('security-onboarding-required').value = false
}

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

const route = useRoute()
const showOnboardingBanner = computed(() => route.query.onboarding === 'required')

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
    invalidateOnboardingCache()
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
    invalidateOnboardingCache()
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
    invalidateOnboardingCache()
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
    invalidateOnboardingCache()
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

function getDeviceIconComponent(deviceName: string | null) {
  // All device types use Smartphone or a generic icon
  if (!deviceName) return Smartphone
  const name = deviceName.toLowerCase()
  if (name.includes('ios') || name.includes('iphone') || name.includes('ipad')) return Smartphone
  if (name.includes('android')) return Smartphone
  if (name.includes('mobile')) return Smartphone
  return Smartphone
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

function getAuditEventIconComponent(type: string) {
  const icons: Record<string, any> = {
    auth_method_change: RefreshCw,
    backup_codes_regenerated: Key,
    password_changed: Lock,
    totp_enabled: ShieldCheck,
    totp_disabled: ShieldAlert,
    passkey_added: Fingerprint,
    passkey_removed: Fingerprint,
    login_success: CheckCircle,
    login_failed: XCircle,
    admin_force_auth_method: AlertTriangle,
    preference_updated: Settings,
  }
  return icons[type] || Info
}
</script>

<template>
  <div class="max-w-2xl space-y-6">
    <!-- Security Onboarding Banner -->
    <div v-if="showOnboardingBanner" class="rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))] p-4">
      <div class="flex gap-3">
        <ShieldAlert class="w-5 h-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
        <div>
          <p class="font-medium text-[hsl(var(--foreground))]">Two-factor authentication required</p>
          <p class="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
            Your organization requires two-factor authentication for your role. Please set up a passkey or authenticator app below to continue.
          </p>
        </div>
      </div>
    </div>

    <!-- Success Alert -->
    <Alert v-if="successMessage" variant="default">
      <CheckCircle class="h-4 w-4" />
      <AlertTitle>{{ successMessage }}</AlertTitle>
      <button class="absolute top-2 right-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" @click="successMessage = ''">
        <XCircle class="h-4 w-4" />
      </button>
    </Alert>

    <!-- Error Alert -->
    <Alert v-if="error" variant="destructive">
      <AlertTriangle class="h-4 w-4" />
      <AlertTitle>{{ error }}</AlertTitle>
    </Alert>

    <!-- Authentication Methods Section -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div class="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
            <Settings class="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">Authentication Methods</h3>
            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              Magic Link + Second Factor (Passkey or TOTP)
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading -->
        <div v-if="loadingPreferences" class="flex items-center justify-center py-8">
          <RefreshCw class="h-6 w-6 text-[hsl(var(--muted-foreground))] animate-spin" />
        </div>

        <!-- Preferences loaded -->
        <div v-else-if="preferences" class="space-y-6">
          <!-- Current Status Overview -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="p-3 rounded-lg bg-[hsl(var(--background))] text-center">
              <Mail class="mx-auto h-5 w-5 mb-1 text-green-500" />
              <p class="text-xs font-medium text-[hsl(var(--foreground))]">Magic Link</p>
              <p class="text-xs text-green-600 dark:text-green-400">Primary Method</p>
            </div>
            <div class="p-3 rounded-lg bg-[hsl(var(--background))] text-center">
              <Fingerprint
                class="mx-auto h-5 w-5 mb-1"
                :class="preferences.hasWebAuthn ? 'text-green-500' : 'text-[hsl(var(--muted-foreground))]'"
              />
              <p class="text-xs font-medium text-[hsl(var(--foreground))]">Passkeys</p>
              <p class="text-xs" :class="preferences.hasWebAuthn ? 'text-green-600 dark:text-green-400' : 'text-[hsl(var(--muted-foreground))]'">
                {{ preferences.webauthnCredentials > 0 ? `${preferences.webauthnCredentials} registered` : 'None' }}
              </p>
            </div>
            <div class="p-3 rounded-lg bg-[hsl(var(--background))] text-center">
              <ShieldCheck
                class="mx-auto h-5 w-5 mb-1"
                :class="preferences.hasTOTP ? 'text-green-500' : 'text-[hsl(var(--muted-foreground))]'"
              />
              <p class="text-xs font-medium text-[hsl(var(--foreground))]">TOTP</p>
              <p class="text-xs" :class="preferences.hasTOTP ? 'text-green-600 dark:text-green-400' : 'text-[hsl(var(--muted-foreground))]'">
                {{ preferences.hasTOTP ? 'Enabled' : 'Not set up' }}
              </p>
            </div>
          </div>

          <p class="text-sm text-[hsl(var(--muted-foreground))]">
            <Info class="inline-block h-4 w-4 mr-1" />
            Magic Link is always the first step. Passkeys and TOTP are used as second factors for additional security.
          </p>
        </div>
      </div>
    </div>

    <!-- Passkeys Section -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
            <Fingerprint class="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">Passkeys</h3>
            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              Use passkeys for fast, secure passwordless sign-in
            </p>
          </div>
        </div>
        <Button
          v-if="isSupported"
          size="sm"
          @click="showAddDialog = true"
        >
          <Fingerprint class="h-4 w-4 mr-2" />
          Add Passkey
        </Button>
      </div>

      <!-- Browser Not Supported -->
      <div v-if="!isSupported" class="p-6">
        <div class="text-center py-8">
          <AlertTriangle class="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-3" />
          <p class="text-[hsl(var(--muted-foreground))]">
            Your browser does not support passkeys (WebAuthn).
          </p>
          <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Try using a modern browser like Chrome, Safari, or Firefox.
          </p>
        </div>
      </div>

      <!-- Loading State -->
      <div v-else-if="loadingCredentials" class="p-6">
        <div class="flex items-center justify-center py-8">
          <RefreshCw class="h-6 w-6 text-[hsl(var(--muted-foreground))] animate-spin" />
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="credentials.length === 0" class="p-6">
        <div class="text-center py-8">
          <Fingerprint class="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-3" />
          <p class="text-[hsl(var(--muted-foreground))] font-medium">No passkeys registered</p>
          <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Add a passkey to enable fast, secure passwordless sign-in.
          </p>
          <Button
            class="mt-4"
            size="sm"
            @click="showAddDialog = true"
          >
            <Fingerprint class="h-4 w-4 mr-2" />
            Add Your First Passkey
          </Button>
        </div>
      </div>

      <!-- Credentials List -->
      <div v-else class="divide-y divide-[hsl(var(--border))]">
        <div
          v-for="credential in credentials"
          :key="credential.id"
          class="flex items-center justify-between p-4 hover:bg-[hsl(var(--background))] transition-colors"
        >
          <div class="flex items-center gap-3 min-w-0">
            <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--background))]">
              <Key class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div class="min-w-0">
              <p class="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                {{ credential.deviceName || 'Unnamed Passkey' }}
              </p>
              <div class="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))]">
                <span>Added {{ formatDate(credential.createdAt) }}</span>
                <span v-if="credential.lastUsedAt" class="flex items-center gap-1">
                  <Clock class="h-3 w-3" />
                  Last used {{ formatDate(credential.lastUsedAt) }}
                </span>
              </div>
              <p class="text-xs text-[hsl(var(--muted-foreground))] font-mono mt-0.5">
                {{ truncateId(credential.id) }}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            :disabled="deletingId === credential.id"
            @click="handleDeletePasskey(credential.id)"
          >
            <Loader2 v-if="deletingId === credential.id" class="h-4 w-4 animate-spin" />
            <Trash2 v-else class="h-4 w-4 text-[hsl(var(--destructive))]" />
          </Button>
        </div>
      </div>
    </div>

    <!-- Authenticator App Section -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
            <ShieldCheck class="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">Authenticator App</h3>
            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              Use an authenticator app for two-factor authentication
            </p>
          </div>
        </div>
      </div>

      <!-- TOTP Error -->
      <Alert
        v-if="totpError"
        variant="destructive"
        class="m-4"
      >
        <AlertTriangle class="h-4 w-4" />
        <AlertTitle>{{ totpError }}</AlertTitle>
      </Alert>

      <div class="p-6">
        <!-- Already Enabled -->
        <div v-if="totpEnabled && totpSetupStep === 'idle'" class="space-y-4">
          <div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <CheckCircle class="h-5 w-5 text-green-600 dark:text-green-500" />
            <div>
              <p class="text-sm font-medium text-green-800 dark:text-green-200">Authenticator app is enabled</p>
              <p class="text-xs text-green-600 dark:text-green-400">Your account is protected with two-factor authentication.</p>
            </div>
          </div>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              @click="showRegenDialog = true"
            >
              <Key class="h-4 w-4 mr-2" />
              Regenerate Backup Codes
            </Button>
            <Button
              variant="destructive"
              size="sm"
              @click="showDisableDialog = true"
            >
              <ShieldAlert class="h-4 w-4 mr-2" />
              Disable Authenticator
            </Button>
          </div>
        </div>

        <!-- Not Set Up -->
        <div v-else-if="!totpEnabled && totpSetupStep === 'idle'" class="text-center py-6">
          <ShieldCheck class="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-3" />
          <p class="text-[hsl(var(--muted-foreground))] font-medium">No authenticator app configured</p>
          <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Add an authenticator app like Google Authenticator, Authy, or 1Password for extra security.
          </p>
          <Button
            class="mt-4"
            size="sm"
            :disabled="totpLoading"
            @click="handleStartTOTPSetup"
          >
            <Loader2 v-if="totpLoading" class="h-4 w-4 mr-2 animate-spin" />
            <ShieldCheck v-else class="h-4 w-4 mr-2" />
            Set Up Authenticator
          </Button>
        </div>

        <!-- Setup Step 1: QR Code -->
        <div v-else-if="totpSetupStep === 'qr'" class="space-y-5">
          <div class="space-y-2">
            <h4 class="text-base font-semibold text-[hsl(var(--foreground))]">Step 1: Scan QR Code</h4>
            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              Open your authenticator app and scan this QR code to add your account.
            </p>
          </div>

          <!-- QR Code -->
          <div v-if="totpSetupData?.qrCodeUrl" class="flex justify-center">
            <div class="p-4 bg-white rounded-xl shadow-sm border border-[hsl(var(--border))]">
              <img :src="totpSetupData.qrCodeUrl" alt="TOTP QR Code" class="w-[200px] h-[200px]" />
            </div>
          </div>

          <!-- Manual Entry -->
          <div v-if="totpSetupData?.secret" class="space-y-1">
            <p class="text-xs text-[hsl(var(--muted-foreground))]">
              Can't scan? Enter this code manually:
            </p>
            <div class="flex items-center gap-2">
              <code class="flex-1 px-3 py-2 bg-[hsl(var(--background))] rounded-lg text-sm font-mono text-[hsl(var(--foreground))] break-all select-all">
                {{ totpSetupData.secret }}
              </code>
            </div>
          </div>

          <!-- Backup Codes -->
          <div class="space-y-3 p-4 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
            <div class="flex items-start gap-2">
              <AlertTriangle class="h-5 w-5 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
              <div>
                <p class="text-sm font-semibold text-[hsl(var(--foreground))]">Save your backup codes</p>
                <p class="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  These codes can be used to access your account if you lose your authenticator app.
                  Each code can only be used once. Store them in a safe place.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-1.5">
              <code
                v-for="code in totpBackupCodes"
                :key="code"
                class="px-2 py-1 bg-[hsl(var(--card))] rounded text-sm font-mono text-[hsl(var(--foreground))] text-center"
              >
                {{ code }}
              </code>
            </div>

            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                @click="copyBackupCodes"
              >
                <Check v-if="backupCodesCopied" class="h-4 w-4 mr-2" />
                <ClipboardCopy v-else class="h-4 w-4 mr-2" />
                {{ backupCodesCopied ? 'Copied!' : 'Copy' }}
              </Button>
              <Button
                size="sm"
                variant="outline"
                @click="downloadBackupCodes"
              >
                <Download class="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          <!-- Next Step -->
          <div class="flex justify-end">
            <Button
              @click="totpSetupStep = 'verify'"
            >
              <ArrowRight class="h-4 w-4 mr-2" />
              Continue to Verification
            </Button>
          </div>
        </div>

        <!-- Setup Step 2: Verify -->
        <div v-else-if="totpSetupStep === 'verify'" class="space-y-5">
          <div class="space-y-2">
            <h4 class="text-base font-semibold text-[hsl(var(--foreground))]">Step 2: Verify Code</h4>
            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              Enter the 6-digit code from your authenticator app to complete setup.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="totp-verify">Verification Code</Label>
            <Input
              id="totp-verify"
              v-model="totpVerifyCode"
              type="text"
              placeholder="000000"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              class="w-full"
              @keyup.enter="handleVerifyTOTPSetup"
            />
          </div>

          <div class="flex justify-between">
            <Button
              variant="ghost"
              @click="totpSetupStep = 'qr'"
            >
              <ArrowLeft class="h-4 w-4 mr-2" />
              Back
            </Button>
            <Button
              :disabled="totpVerifyCode.length !== 6"
              @click="handleVerifyTOTPSetup"
            >
              <Loader2 v-if="totpLoading" class="h-4 w-4 mr-2 animate-spin" />
              <Check v-else class="h-4 w-4 mr-2" />
              Verify & Enable
            </Button>
          </div>
        </div>

        <!-- Setup Complete -->
        <div v-else-if="totpSetupStep === 'done'" class="space-y-4 text-center py-4">
          <CheckCircle class="mx-auto h-12 w-12 text-green-500" />
          <div>
            <p class="text-lg font-semibold text-[hsl(var(--foreground))]">Setup Complete!</p>
            <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
              Your authenticator app is now configured. You can use it to sign in to your account.
            </p>
          </div>
          <Button @click="handleFinishSetup">
            Done
          </Button>
        </div>
      </div>
    </div>

    <!-- Active Devices Section -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div class="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
            <Smartphone class="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">Active Devices</h3>
            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              Devices that have signed in to your account
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading -->
        <div v-if="loadingDevices" class="flex items-center justify-center py-6">
          <RefreshCw class="h-6 w-6 text-[hsl(var(--muted-foreground))] animate-spin" />
        </div>

        <!-- Empty -->
        <div v-else-if="devices.length === 0" class="text-center py-6">
          <Smartphone class="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-3" />
          <p class="text-[hsl(var(--muted-foreground))]">No devices tracked yet</p>
          <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
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
              ? 'border-[hsl(var(--primary)/0.3)] bg-[hsl(var(--accent))]'
              : 'border-[hsl(var(--border))] bg-[hsl(var(--background))]'"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div class="flex items-center justify-center w-9 h-9 rounded-lg bg-[hsl(var(--background))]">
                <component :is="getDeviceIconComponent(device.deviceName)" class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-[hsl(var(--foreground))] truncate">
                    {{ device.deviceName || 'Unknown Device' }}
                  </p>
                  <span
                    v-if="device.isCurrent"
                    class="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]"
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
                <div class="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  <span>IP: {{ device.ipAddress }}</span>
                  <span class="flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    Last active {{ formatDate(device.lastUsedAt) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-1 shrink-0 ml-3">
              <Button
                variant="ghost"
                size="sm"
                :title="device.isTrusted ? 'Remove trust' : 'Trust this device'"
                @click="handleToggleTrust(device)"
              >
                <ShieldCheck v-if="device.isTrusted" class="h-4 w-4" />
                <ShieldAlert v-else class="h-4 w-4" />
              </Button>
              <Button
                v-if="!device.isCurrent"
                variant="ghost"
                size="sm"
                title="Revoke device"
                :disabled="revokingDeviceId === device.id"
                @click="handleRevokeDevice(device.id)"
              >
                <Loader2 v-if="revokingDeviceId === device.id" class="h-4 w-4 animate-spin" />
                <Trash2 v-else class="h-4 w-4 text-[hsl(var(--destructive))]" />
              </Button>
            </div>
          </div>

          <p class="text-xs text-[hsl(var(--muted-foreground))] mt-2">
            Trusted devices won't trigger new device sign-in email alerts.
          </p>
        </div>
      </div>
    </div>

    <!-- Recent Auth Activity Section -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <div class="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
        <div class="flex items-center gap-3">
          <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
            <Clock class="h-5 w-5 text-[hsl(var(--primary))]" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">Recent Activity</h3>
            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              Recent authentication and security events
            </p>
          </div>
        </div>
      </div>

      <div class="p-6">
        <!-- Loading -->
        <div v-if="loadingAudit" class="flex items-center justify-center py-6">
          <RefreshCw class="h-6 w-6 text-[hsl(var(--muted-foreground))] animate-spin" />
        </div>

        <!-- Empty -->
        <div v-else-if="auditEntries.length === 0" class="text-center py-6">
          <Clock class="mx-auto h-10 w-10 text-[hsl(var(--muted-foreground))] mb-3" />
          <p class="text-[hsl(var(--muted-foreground))]">No recent activity</p>
        </div>

        <!-- Entries -->
        <div v-else class="space-y-3">
          <div
            v-for="(entry, idx) in auditEntries"
            :key="idx"
            class="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--background))]"
          >
            <component
              :is="getAuditEventIconComponent(entry.type)"
              class="h-5 w-5 text-[hsl(var(--muted-foreground))] mt-0.5 shrink-0"
            />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-[hsl(var(--foreground))]">
                {{ getAuditEventLabel(entry.type) }}
              </p>
              <div class="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                <span>{{ formatDate(entry.timestamp) }}</span>
                <span v-if="entry.ipAddress && entry.ipAddress !== 'unknown'">
                  IP: {{ entry.ipAddress }}
                </span>
              </div>
              <p
                v-if="entry.details && Object.keys(entry.details).length > 0"
                class="text-xs text-[hsl(var(--muted-foreground))] mt-0.5"
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
    <Dialog v-model:open="showAddDialog">
      <DialogContent>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
              <Fingerprint class="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle>Add Passkey</DialogTitle>
              </DialogHeader>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Register a new passkey for this account
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <Label for="deviceName">Device Name</Label>
            <p class="text-xs text-[hsl(var(--muted-foreground))]">Optional</p>
            <Input
              id="deviceName"
              v-model="newDeviceName"
              placeholder="e.g., MacBook Pro, iPhone, YubiKey"
              class="w-full"
            />
          </div>

          <p class="text-sm text-[hsl(var(--muted-foreground))]">
            Your browser will prompt you to create a passkey using your device's biometrics,
            security key, or screen lock.
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              @click="showAddDialog = false"
            >
              Cancel
            </Button>
            <Button
              :disabled="isLoading"
              @click="handleAddPasskey"
            >
              <Loader2 v-if="isLoading" class="h-4 w-4 mr-2 animate-spin" />
              <Fingerprint v-else class="h-4 w-4 mr-2" />
              Register Passkey
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Disable TOTP Dialog -->
    <Dialog v-model:open="showDisableDialog">
      <DialogContent>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--destructive)/0.1)]">
              <ShieldAlert class="h-5 w-5 text-[hsl(var(--destructive))]" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle>Disable Authenticator</DialogTitle>
              </DialogHeader>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Enter your current authenticator code to confirm
              </p>
            </div>
          </div>

          <Alert v-if="totpError" variant="destructive">
            <AlertTriangle class="h-4 w-4" />
            <AlertTitle>{{ totpError }}</AlertTitle>
          </Alert>

          <div class="space-y-2">
            <Label for="disable-totp">Authenticator Code</Label>
            <Input
              id="disable-totp"
              v-model="totpDisableCode"
              type="text"
              placeholder="000000"
              maxlength="6"
              autocomplete="one-time-code"
              inputmode="numeric"
              class="w-full"
              @keyup.enter="handleDisableTOTP"
            />
          </div>

          <p class="text-sm text-[hsl(var(--muted-foreground))]">
            This will remove the authenticator app from your account. You will no longer be able
            to sign in using authenticator codes.
          </p>

          <div class="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              @click="showDisableDialog = false; totpDisableCode = ''"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              :disabled="totpDisableCode.length !== 6"
              @click="handleDisableTOTP"
            >
              <Loader2 v-if="totpLoading" class="h-4 w-4 mr-2 animate-spin" />
              <ShieldAlert v-else class="h-4 w-4 mr-2" />
              Disable
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Regenerate Backup Codes Dialog -->
    <Dialog v-model:open="showRegenDialog" @close="closeRegenDialog">
      <DialogContent>
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
              <Key class="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <DialogHeader>
                <DialogTitle>Regenerate Backup Codes</DialogTitle>
              </DialogHeader>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                {{ newBackupCodes.length > 0 ? 'Save your new backup codes' : 'Verify your identity to continue' }}
              </p>
            </div>
          </div>

          <!-- Error -->
          <Alert v-if="regenError" variant="destructive">
            <AlertTriangle class="h-4 w-4" />
            <AlertTitle>{{ regenError }}</AlertTitle>
          </Alert>

          <!-- Step 1: Verify TOTP code -->
          <template v-if="newBackupCodes.length === 0">
            <Alert variant="default">
              <AlertTriangle class="h-4 w-4" />
              <AlertTitle>This will invalidate all existing backup codes.</AlertTitle>
            </Alert>

            <div class="space-y-2">
              <Label for="regen-totp">Authenticator Code</Label>
              <Input
                id="regen-totp"
                v-model="regenCode"
                type="text"
                placeholder="000000"
                maxlength="6"
                autocomplete="one-time-code"
                inputmode="numeric"
                class="w-full"
                @keyup.enter="handleRegenerateBackupCodes"
              />
            </div>

            <div class="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                @click="closeRegenDialog"
              >
                Cancel
              </Button>
              <Button
                :disabled="regenCode.length !== 6"
                @click="handleRegenerateBackupCodes"
              >
                <Loader2 v-if="regenLoading" class="h-4 w-4 mr-2 animate-spin" />
                <Key v-else class="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </template>

          <!-- Step 2: Show new backup codes -->
          <template v-else>
            <div class="space-y-3 p-4 rounded-lg bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
              <div class="flex items-start gap-2">
                <AlertTriangle class="h-5 w-5 text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                <div>
                  <p class="text-sm font-semibold text-[hsl(var(--foreground))]">Save your new backup codes</p>
                  <p class="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    These codes replace your previous backup codes. Store them in a safe place.
                    Each code can only be used once.
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-1.5">
                <code
                  v-for="code in newBackupCodes"
                  :key="code"
                  class="px-2 py-1 bg-[hsl(var(--card))] rounded text-sm font-mono text-[hsl(var(--foreground))] text-center"
                >
                  {{ code }}
                </code>
              </div>

              <div class="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  @click="copyRegenBackupCodes"
                >
                  <Check v-if="regenBackupCodesCopied" class="h-4 w-4 mr-2" />
                  <ClipboardCopy v-else class="h-4 w-4 mr-2" />
                  {{ regenBackupCodesCopied ? 'Copied!' : 'Copy' }}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  @click="downloadRegenBackupCodes"
                >
                  <Download class="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <div class="flex justify-end pt-2">
              <Button @click="closeRegenDialog">
                Done
              </Button>
            </div>
          </template>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
