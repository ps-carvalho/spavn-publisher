<script setup lang="ts">
import { ArrowLeft, RefreshCw, User, ShieldCheck, ShieldAlert, Fingerprint, CheckCircle, Info, Clock, Key, Settings, Mail, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'
import { useToast } from '@spavn/ui'

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
const { toast } = useToast()
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
    'super-admin': 'bg-[hsl(var(--destructive))]',
    admin: 'bg-[hsl(var(--primary))]',
    editor: 'bg-[hsl(var(--accent))]',
    viewer: 'bg-[hsl(var(--muted-foreground))]',
  }
  return colors[role] || 'bg-[hsl(var(--muted-foreground))]'
}

function getRoleTextClass(role: string): string {
  const colors: Record<string, string> = {
    'super-admin': 'text-[hsl(var(--destructive))]',
    admin: 'text-[hsl(var(--foreground))]',
    editor: 'text-[hsl(var(--accent-foreground))]',
    viewer: 'text-[hsl(var(--muted-foreground))]',
  }
  return colors[role] || 'text-[hsl(var(--muted-foreground))]'
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

// Map audit event types to Lucide components
function getAuditEventComponent(type: string) {
  const componentMap: Record<string, any> = {
    auth_method_change: RefreshCw,
    backup_codes_regenerated: Key,
    password_changed: Key,
    totp_enabled: ShieldCheck,
    totp_disabled: ShieldAlert,
    passkey_added: Fingerprint,
    passkey_removed: Fingerprint,
    login_success: CheckCircle,
    login_failed: ShieldAlert,
    admin_force_auth_method: ShieldAlert,
    preference_updated: Settings,
  }
  return componentMap[type] || Info
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
        <Button size="sm" variant="ghost" as-child>
          <NuxtLink to="/admin/settings">
            <ArrowLeft class="h-4 w-4" />
          </NuxtLink>
        </Button>
        <div>
          <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">User Details</h2>
          <p class="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            {{ userDetail?.email || 'Loading...' }}
          </p>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="status === 'pending'" class="flex items-center justify-center py-12">
      <RefreshCw class="h-8 w-8 text-[hsl(var(--muted-foreground))] animate-spin" />
    </div>

    <!-- Not Found -->
    <div v-else-if="!userDetail" class="text-center py-12">
      <User class="h-12 w-12 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
      <p class="text-[hsl(var(--muted-foreground))] font-medium">User not found</p>
      <Button variant="outline" size="sm" class="mt-4" as-child>
        <NuxtLink to="/admin/settings">Back to Settings</NuxtLink>
      </Button>
    </div>

    <template v-else>
      <!-- User Info Card -->
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div class="p-6 border-b border-[hsl(var(--border))]">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-12 h-12 rounded-full bg-[hsl(var(--muted))]">
              <User class="h-6 w-6 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">
                {{ [userDetail.firstName, userDetail.lastName].filter(Boolean).join(' ') || userDetail.email }}
              </h3>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">{{ userDetail.email }}</p>
            </div>
          </div>
        </div>

        <div class="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <!-- Role -->
          <div>
            <p class="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Role</p>
            <div class="flex items-center gap-2">
              <span class="w-2 h-2 rounded-full" :class="getRoleDotClass(userDetail.role)" />
              <span class="text-sm font-medium capitalize" :class="getRoleTextClass(userDetail.role)">
                {{ userDetail.role }}
              </span>
            </div>
          </div>

          <!-- Status -->
          <div>
            <p class="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Status</p>
            <div class="flex items-center gap-2">
              <span
                class="w-2 h-2 rounded-full"
                :class="userDetail.isActive ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--destructive))]'"
              />
              <span
                class="text-sm font-medium"
                :class="userDetail.isActive ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--destructive))]'"
              >
                {{ userDetail.isActive ? 'Active' : 'Inactive' }}
              </span>
            </div>
          </div>

          <!-- Created -->
          <div>
            <p class="text-xs font-medium text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-1">Created</p>
            <span class="text-sm text-[hsl(var(--foreground))]">
              {{ formatDate(userDetail.createdAt) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Auth Methods Card -->
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div class="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--muted))]">
              <ShieldCheck class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">Authentication Methods</h3>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Enabled authentication methods for this user
              </p>
            </div>
          </div>
        </div>

        <div class="p-6">
          <!-- Auth method badges -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div class="p-3 rounded-lg bg-[hsl(var(--muted))] text-center">
              <Mail class="h-5 w-5 mx-auto mb-1 text-[hsl(var(--accent-foreground))]" />
              <p class="text-xs font-medium text-[hsl(var(--foreground))]">Magic Link</p>
              <p class="text-xs text-[hsl(var(--accent-foreground))]">Primary</p>
            </div>
            <div class="p-3 rounded-lg bg-[hsl(var(--muted))] text-center">
              <Fingerprint
                class="h-5 w-5 mx-auto mb-1"
                :class="userDetail.passkeysCount > 0 ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))]'"
              />
              <p class="text-xs font-medium text-[hsl(var(--foreground))]">Passkeys</p>
              <p class="text-xs" :class="userDetail.passkeysCount > 0 ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))]'">
                {{ userDetail.passkeysCount > 0 ? `${userDetail.passkeysCount} registered` : 'None' }}
              </p>
            </div>
            <div class="p-3 rounded-lg bg-[hsl(var(--muted))] text-center">
              <ShieldCheck
                class="h-5 w-5 mx-auto mb-1"
                :class="userDetail.hasTOTP ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))]'"
              />
              <p class="text-xs font-medium text-[hsl(var(--foreground))]">TOTP</p>
              <p class="text-xs" :class="userDetail.hasTOTP ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--muted-foreground))]'">
                {{ userDetail.hasTOTP ? 'Enabled' : 'Not set up' }}
              </p>
            </div>
          </div>

          <p class="text-sm text-[hsl(var(--muted-foreground))] mb-4">
            <Info class="inline-block h-4 w-4 mr-1" />
            All users sign in with Magic Link first. Passkeys and TOTP are used as second factors.
          </p>
        </div>
      </div>

      <!-- Audit Log Card -->
      <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        <div class="flex items-center justify-between p-6 border-b border-[hsl(var(--border))]">
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--muted))]">
              <Clock class="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-[hsl(var(--foreground))]">Auth History</h3>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Recent authentication events for this user
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            :disabled="loadingAudit"
            @click="loadAuditLog"
          >
            <RefreshCw v-if="!loadingAudit" class="h-4 w-4" />
            <Loader2 v-else class="h-4 w-4 animate-spin" />
          </Button>
        </div>

        <div class="p-6">
          <!-- Loading -->
          <div v-if="loadingAudit" class="flex items-center justify-center py-6">
            <RefreshCw class="h-6 w-6 text-[hsl(var(--muted-foreground))] animate-spin" />
          </div>

          <!-- Empty -->
          <div v-else-if="auditEntries.length === 0" class="text-center py-6">
            <Clock class="h-10 w-10 mx-auto text-[hsl(var(--muted-foreground))] mb-3" />
            <p class="text-[hsl(var(--muted-foreground))]">No auth events recorded</p>
          </div>

          <!-- Entries -->
          <div v-else class="space-y-3">
            <div
              v-for="(entry, idx) in auditEntries"
              :key="idx"
              class="flex items-start gap-3 p-3 rounded-lg bg-[hsl(var(--muted))]"
            >
              <component
                :is="getAuditEventComponent(entry.type)"
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
                  <span v-if="entry.performedBy !== entry.userId">
                    By admin #{{ entry.performedBy }}
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
