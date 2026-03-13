<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface UserDetail {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  role: string
  authMethod: string
  passkeysCount: number
  hasTOTP: boolean
  isActive: boolean
  createdAt: string
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

const route = useRoute()
const toast = useToast()
const { getAuditLog } = usePublisherAuth()
const { user: currentUser } = usePublisherAuth()

const userId = computed(() => Number(route.params.id))

// Fetch user details
const { data: userData, refresh: refreshUser, status } = await useFetch<{ data: UserDetail[] }>('/api/publisher/users')
const userDetail = computed(() => {
  const users = userData.value?.data || []
  return users.find((u: UserDetail) => u.id === userId.value) || null
})

// Fetch audit log
const auditEntries = ref<AuditEntry[]>([])
const loadingAudit = ref(true)

onMounted(async () => {
  await loadAuditLog()
})

async function loadAuditLog() {
  loadingAudit.value = true
  try {
    auditEntries.value = await getAuditLog(userId.value, 20)
  }
  finally {
    loadingAudit.value = false
  }
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

function getRoleDotClass(role: string): string {
  const colors: Record<string, string> = {
    'super-admin': 'bg-red-500 dark:bg-red-400',
    admin: 'bg-amber-500 dark:bg-amber-400',
    editor: 'bg-blue-500 dark:bg-blue-400',
    viewer: 'bg-stone-400 dark:bg-stone-500',
  }
  return colors[role] || 'bg-stone-400 dark:bg-stone-500'
}

function getRoleTextClass(role: string): string {
  const colors: Record<string, string> = {
    'super-admin': 'text-red-600 dark:text-red-400',
    admin: 'text-amber-600 dark:text-amber-400',
    editor: 'text-blue-600 dark:text-blue-400',
    viewer: 'text-stone-500 dark:text-stone-400',
  }
  return colors[role] || 'text-stone-500 dark:text-stone-400'
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

const isAdmin = computed(() => {
  return currentUser.value?.role === 'admin' || currentUser.value?.role === 'super-admin'
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/admin/settings">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-arrow-left"
            size="sm"
          />
        </NuxtLink>
        <div>
          <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">User Details</h2>
          <p class="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {{ userDetail?.email || 'Loading...' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex items-center justify-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="text-3xl text-stone-400 animate-spin" />
    </div>

    <!-- Not Found -->
    <div v-else-if="!userDetail" class="text-center py-12">
      <UIcon name="i-heroicons-user" class="text-5xl text-stone-300 dark:text-stone-600 mb-3" />
      <p class="text-stone-500 dark:text-stone-400 font-medium">User not found</p>
      <NuxtLink to="/admin/settings" class="mt-4 inline-block">
        <UButton variant="soft" size="sm">Back to Settings</UButton>
      </NuxtLink>
    </div>

    <template v-else>
      <!-- User Info Card -->
      <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div class="p-6 border-b border-stone-200 dark:border-stone-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-900/20">
              <UIcon name="i-heroicons-user" class="text-2xl text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">
                {{ [userDetail.firstName, userDetail.lastName].filter(Boolean).join(' ') || userDetail.email }}
              </h3>
              <p class="text-sm text-stone-500 dark:text-stone-400">{{ userDetail.email }}</p>
            </div>
          </div>
        </div>

        <div class="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Role -->
          <div>
            <p class="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Role</p>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="getRoleDotClass(userDetail.role)" />
              <span class="text-sm font-medium capitalize" :class="getRoleTextClass(userDetail.role)">
                {{ userDetail.role }}
              </span>
            </div>
          </div>

          <!-- Status -->
          <div>
            <p class="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Status</p>
            <div class="flex items-center gap-2">
              <span
                class="w-2 h-2 rounded-full"
                :class="userDetail.isActive ? 'bg-green-600 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'"
              />
              <span
                class="text-sm font-medium"
                :class="userDetail.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'"
              >
                {{ userDetail.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <!-- Created -->
          <div>
            <p class="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">Created</p>
            <span class="text-sm text-stone-700 dark:text-stone-300">
              {{ formatDate(userDetail.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Auth Methods Card -->
      <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div class="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <UIcon name="i-heroicons-shield-check" class="text-xl text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Authentication Methods</h3>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                Enabled authentication methods for this user
              </p>
            </div>
          </div>
        </div>

        <div class="p-6">
          <!-- Auth method badges -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div class="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-center">
              <UIcon name="i-heroicons-envelope" class="text-xl mb-1 text-green-500" />
              <p class="text-xs font-medium text-stone-700 dark:text-stone-300">Magic Link</p>
              <p class="text-xs text-green-600 dark:text-green-400">Primary</p>
            </div>
            <div class="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-center">
              <UIcon
                name="i-heroicons-finger-print"
                class="text-xl mb-1"
                :class="userDetail.passkeysCount > 0 ? 'text-green-500' : 'text-stone-300 dark:text-stone-600'"
              />
              <p class="text-xs font-medium text-stone-700 dark:text-stone-300">Passkeys</p>
              <p class="text-xs" :class="userDetail.passkeysCount > 0 ? 'text-green-600 dark:text-green-400' : 'text-stone-400'">
                {{ userDetail.passkeysCount > 0 ? `${userDetail.passkeysCount} registered` : 'None' }}
              </p>
            </div>
            <div class="p-3 rounded-lg bg-stone-50 dark:bg-stone-800/50 text-center">
              <UIcon
                name="i-heroicons-shield-check"
                class="text-xl mb-1"
                :class="userDetail.hasTOTP ? 'text-green-500' : 'text-stone-300 dark:text-stone-600'"
              />
              <p class="text-xs font-medium text-stone-700 dark:text-stone-300">TOTP</p>
              <p class="text-xs" :class="userDetail.hasTOTP ? 'text-green-600 dark:text-green-400' : 'text-stone-400'">
                {{ userDetail.hasTOTP ? 'Enabled' : 'Not set up' }}
              </p>
            </div>
          </div>

          <p class="text-sm text-stone-500 dark:text-stone-400 mb-4">
            <UIcon name="i-heroicons-information-circle" class="inline-block mr-1" />
            All users sign in with Magic Link first. Passkeys and TOTP are used as second factors.
          </p>
        </div>
      </div>

      <!-- Audit Log Card -->
      <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <div class="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <UIcon name="i-heroicons-clock" class="text-xl text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Auth History</h3>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                Recent authentication events for this user
              </p>
            </div>
          </div>
          <UButton
            size="sm"
            variant="ghost"
            color="neutral"
            icon="i-heroicons-arrow-path"
            :loading="loadingAudit"
            @click="loadAuditLog"
          />
        </div>

        <div class="p-6">
          <!-- Loading -->
          <div v-if="loadingAudit" class="flex items-center justify-center py-6">
            <UIcon name="i-heroicons-arrow-path" class="text-2xl text-stone-400 animate-spin" />
          </div>

          <!-- Empty -->
          <div v-else-if="auditEntries.length === 0" class="text-center py-6">
            <UIcon name="i-heroicons-clock" class="text-4xl text-stone-300 dark:text-stone-600 mb-3" />
            <p class="text-stone-500 dark:text-stone-400">No auth events recorded</p>
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
                  <span v-if="entry.performedBy !== entry.userId">
                    By admin #{{ entry.performedBy }}
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
                  <template v-else-if="entry.details.codesGenerated">
                    {{ entry.details.codesGenerated }} codes generated
                  </template>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
