<script setup lang="ts">
definePageMeta({
  layout: 'admin',
  middleware: 'publisher-admin',
})

interface UserInfo {
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

const toast = useToast()
const showInviteModal = ref(false)
const showEditModal = ref(false)
const showAuthMethodModal = ref(false)
const selectedUser = ref<UserInfo | null>(null)
const isSubmitting = ref(false)

// Invite form
const inviteForm = ref({ email: '', firstName: '', lastName: '', role: 'editor', password: '' })

// Edit form
const editForm = ref({ email: '', firstName: '', lastName: '', role: 'editor', isActive: true })

// Auth method form
const authMethodForm = ref({ authMethod: 'password', removePassword: false })

const { data, refresh, status } = await useFetch<{ data: UserInfo[] }>('/api/publisher/users')
const users = computed(() => data.value?.data || [])

// Search & pagination state
const search = ref('')
const debouncedSearch = ref('')
const page = ref(1)
const pageSize = 10

// Debounced search
let searchTimeout: ReturnType<typeof setTimeout> | null = null
watch(search, (newValue) => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    debouncedSearch.value = newValue
    page.value = 1 // Reset to first page on search
  }, 300)
})

// Cleanup debounce timeout on unmount
onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
})

// Filter users based on search
const filteredUsers = computed(() => {
  let data = users.value
  if (debouncedSearch.value) {
    const query = debouncedSearch.value.toLowerCase()
    data = data.filter(u =>
      u.email.toLowerCase().includes(query) ||
      (u.firstName && u.firstName.toLowerCase().includes(query)) ||
      (u.lastName && u.lastName.toLowerCase().includes(query))
    )
  }
  return data
})

// Paginated users
const paginatedUsers = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredUsers.value.slice(start, start + pageSize)
})

const totalPages = computed(() =>
  Math.ceil(filteredUsers.value.length / pageSize)
)

const columns = [
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'role', header: 'Role' },
  { accessorKey: 'auth', header: 'Auth' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' },
]

const roleOptions = [
  { label: 'Super Admin', value: 'super-admin' },
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
]

const authMethodOptions = [
  { label: 'Password', value: 'password' },
  { label: 'Magic Link', value: 'magic-link' },
  { label: 'Passkey', value: 'passkey' },
  { label: 'TOTP', value: 'totp' },
]

async function inviteUser() {
  isSubmitting.value = true
  try {
    await $fetch('/api/publisher/users', {
      method: 'POST',
      body: inviteForm.value,
    })
    await refresh()
    showInviteModal.value = false
    inviteForm.value = { email: '', firstName: '', lastName: '', role: 'editor', password: '' }
    toast.add({ title: 'User created', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.data?.error?.message || 'Failed to create user', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

function openEdit(user: UserInfo) {
  selectedUser.value = user
  editForm.value = {
    email: user.email,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    role: user.role,
    isActive: user.isActive,
  }
  showEditModal.value = true
}

async function saveEdit() {
  if (!selectedUser.value) return
  isSubmitting.value = true
  try {
    await $fetch(`/api/publisher/users/${selectedUser.value.id}`, {
      method: 'PUT',
      body: editForm.value,
    })
    await refresh()
    showEditModal.value = false
    toast.add({ title: 'User updated', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.data?.error?.message || 'Failed to update user', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

async function deleteUser(user: UserInfo) {
  if (!confirm(`Delete ${user.email}?`)) return
  try {
    await $fetch(`/api/publisher/users/${user.id}`, { method: 'DELETE' })
    await refresh()
    toast.add({ title: 'User deleted', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.data?.error?.message || 'Failed to delete', color: 'error' })
  }
}

function openAuthMethodModal(user: UserInfo) {
  selectedUser.value = user
  authMethodForm.value = {
    authMethod: user.authMethod || 'password',
    removePassword: false,
  }
  showAuthMethodModal.value = true
}

async function saveAuthMethod() {
  if (!selectedUser.value) return
  isSubmitting.value = true
  try {
    await $fetch(`/api/publisher/users/${selectedUser.value.id}/auth-method`, {
      method: 'PUT',
      body: authMethodForm.value,
    })
    await refresh()
    showAuthMethodModal.value = false
    toast.add({ title: 'Auth method updated', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.data?.error?.message || 'Failed to update auth method', color: 'error' })
  }
  finally {
    isSubmitting.value = false
  }
}

async function forcePasswordless(user: UserInfo) {
  if (!confirm(`Force passwordless for ${user.email}? This will remove their password and set auth method to magic-link.`)) return
  try {
    await $fetch(`/api/publisher/users/${user.id}/auth-method`, {
      method: 'PUT',
      body: { authMethod: 'magic-link', removePassword: true },
    })
    await refresh()
    toast.add({ title: 'User set to passwordless', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.data?.error?.message || 'Failed to update', color: 'error' })
  }
}

async function resetAuthMethod(user: UserInfo) {
  if (!confirm(`Reset auth method for ${user.email} to password?`)) return
  try {
    await $fetch(`/api/publisher/users/${user.id}/auth-method`, {
      method: 'PUT',
      body: { authMethod: 'password' },
    })
    await refresh()
    toast.add({ title: 'Auth method reset to password', color: 'success' })
  }
  catch (e: any) {
    toast.add({ title: e?.data?.data?.error?.message || 'Failed to reset', color: 'error' })
  }
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

function getAuthMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    password: 'Password',
    'magic-link': 'Magic Link',
    passkey: 'Passkey',
    totp: 'TOTP',
  }
  return labels[method] || method
}

function getAuthMethodIcon(method: string): string {
  const icons: Record<string, string> = {
    password: 'i-heroicons-lock-closed',
    'magic-link': 'i-heroicons-envelope',
    passkey: 'i-heroicons-finger-print',
    totp: 'i-heroicons-shield-check',
  }
  return icons[method] || 'i-heroicons-lock-closed'
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Users & Roles</h2>
      <UButton icon="i-heroicons-plus" color="neutral" @click="showInviteModal = true">
        Add User
      </UButton>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <UInput
        v-model="search"
        placeholder="Search users..."
        icon="i-heroicons-magnifying-glass"
        class="w-64"
      />
    </div>

    <!-- Table card -->
    <div class="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
      <UTable :data="paginatedUsers" :columns="columns" :loading="status === 'pending'">
        <template #email-cell="{ row }">
          <NuxtLink
            :to="`/admin/users/${row.original.id}`"
            class="font-medium text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          >
            {{ row.original.email }}
          </NuxtLink>
        </template>

        <template #name-cell="{ row }">
          <span class="text-stone-600 dark:text-stone-400">
            {{ [row.original.firstName, row.original.lastName].filter(Boolean).join(' ') || '—' }}
          </span>
        </template>

        <template #role-cell="{ row }">
          <div class="flex items-center gap-2">
            <span class="w-2 h-2 rounded-full" :class="getRoleDotClass(row.original.role)" />
            <span class="text-sm capitalize" :class="getRoleTextClass(row.original.role)">
              {{ row.original.role }}
            </span>
          </div>
        </template>

        <template #auth-cell="{ row }">
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1.5">
              <UIcon
                :name="getAuthMethodIcon(row.original.authMethod)"
                class="text-sm text-stone-500 dark:text-stone-400"
              />
              <span class="text-sm text-stone-600 dark:text-stone-400">
                {{ getAuthMethodLabel(row.original.authMethod) }}
              </span>
            </div>
            <!-- Auth badges -->
            <div class="flex items-center gap-1">
              <span
                v-if="row.original.hasTOTP"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                title="TOTP enabled"
              >
                <UIcon name="i-heroicons-shield-check" class="text-xs" />
                2FA
              </span>
              <span
                v-if="row.original.passkeysCount > 0"
                class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                :title="`${row.original.passkeysCount} passkey(s)`"
              >
                <UIcon name="i-heroicons-finger-print" class="text-xs" />
                {{ row.original.passkeysCount }}
              </span>
            </div>
          </div>
        </template>

        <template #status-cell="{ row }">
          <div class="flex items-center gap-2">
            <span
              class="w-2 h-2 rounded-full"
              :class="row.original.isActive ? 'bg-green-600 dark:bg-green-400' : 'bg-red-500 dark:bg-red-400'"
            />
            <span
              class="text-sm"
              :class="row.original.isActive ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'"
            >
              {{ row.original.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </template>

        <template #actions-cell="{ row }">
          <div class="flex items-center gap-1">
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-pencil"
              title="Edit user"
              @click="openEdit(row.original)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="neutral"
              icon="i-heroicons-shield-check"
              title="Change auth method"
              @click="openAuthMethodModal(row.original)"
            />
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              title="Delete user"
              @click="deleteUser(row.original)"
            />
          </div>
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800">
        <p class="text-sm text-stone-500 dark:text-stone-400">
          Showing {{ ((page - 1) * pageSize) + 1 }}–{{ Math.min(page * pageSize, filteredUsers.length) }} of {{ filteredUsers.length }}
        </p>
        <UPagination
          v-model:page="page"
          :total="filteredUsers.length"
          :items-per-page="pageSize"
        />
      </div>

      <!-- Empty state -->
      <div v-if="filteredUsers.length === 0 && status !== 'pending'" class="text-center py-12 border-t border-stone-200 dark:border-stone-800">
        <UIcon name="i-heroicons-users" class="text-4xl text-stone-400 dark:text-stone-500 mb-3" />
        <p v-if="debouncedSearch" class="text-stone-500 dark:text-stone-400">No users found.</p>
        <template v-else>
          <p class="text-stone-500 dark:text-stone-400">No users yet.</p>
          <UButton
            variant="soft"
            color="neutral"
            icon="i-heroicons-plus"
            class="mt-4"
            @click="showInviteModal = true"
          >
            Add your first user
          </UButton>
        </template>
      </div>
    </div>

    <!-- Invite Modal -->
    <UModal v-model:open="showInviteModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Add User</h3>
          <form class="space-y-4" @submit.prevent="inviteUser">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Email" required>
                <UInput v-model="inviteForm.email" type="email" class="w-full" />
              </UFormField>
              <UFormField label="Role">
                <USelectMenu v-model="inviteForm.role" :items="roleOptions" value-key="value" class="w-full" />
              </UFormField>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="First Name">
                <UInput v-model="inviteForm.firstName" class="w-full" />
              </UFormField>
              <UFormField label="Last Name">
                <UInput v-model="inviteForm.lastName" class="w-full" />
              </UFormField>
            </div>
            <UFormField label="Temporary Password" required>
              <UInput v-model="inviteForm.password" type="password" class="w-full" />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="showInviteModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral" :loading="isSubmitting">Create User</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Edit Modal -->
    <UModal v-model:open="showEditModal">
      <template #content>
        <div class="p-6">
          <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-4">Edit User</h3>
          <form class="space-y-4" @submit.prevent="saveEdit">
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="Email">
                <UInput v-model="editForm.email" type="email" class="w-full" />
              </UFormField>
              <UFormField label="Role">
                <USelectMenu v-model="editForm.role" :items="roleOptions" value-key="value" class="w-full" />
              </UFormField>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UFormField label="First Name">
                <UInput v-model="editForm.firstName" class="w-full" />
              </UFormField>
              <UFormField label="Last Name">
                <UInput v-model="editForm.lastName" class="w-full" />
              </UFormField>
            </div>
            <div class="flex items-center gap-2">
              <USwitch v-model="editForm.isActive" />
              <span class="text-sm text-stone-700 dark:text-stone-300">Active</span>
            </div>
            <div class="flex justify-end gap-2">
              <UButton variant="ghost" color="neutral" @click="showEditModal = false">Cancel</UButton>
              <UButton type="submit" color="neutral" :loading="isSubmitting">Save</UButton>
            </div>
          </form>
        </div>
      </template>
    </UModal>

    <!-- Auth Method Modal -->
    <UModal v-model:open="showAuthMethodModal">
      <template #content>
        <div class="p-6">
          <div class="flex items-center gap-3 mb-4">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900/20">
              <UIcon name="i-heroicons-shield-check" class="text-xl text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100">Change Auth Method</h3>
              <p class="text-sm text-stone-500 dark:text-stone-400">
                {{ selectedUser?.email }}
              </p>
            </div>
          </div>

          <form class="space-y-4" @submit.prevent="saveAuthMethod">
            <UFormField label="Authentication Method">
              <USelectMenu
                v-model="authMethodForm.authMethod"
                :items="authMethodOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>

            <div class="flex items-center gap-2">
              <USwitch v-model="authMethodForm.removePassword" />
              <div>
                <span class="text-sm text-stone-700 dark:text-stone-300">Remove password</span>
                <p class="text-xs text-stone-400 dark:text-stone-500">
                  Forces passwordless-only authentication
                </p>
              </div>
            </div>

            <UAlert
              v-if="authMethodForm.removePassword"
              color="warning"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
              title="This will permanently remove the user's password. They will only be able to sign in using passwordless methods."
            />

            <div class="flex justify-between pt-2">
              <div class="flex gap-2">
                <UButton
                  size="sm"
                  variant="soft"
                  icon="i-heroicons-envelope"
                  @click="forcePasswordless(selectedUser!); showAuthMethodModal = false"
                >
                  Force Passwordless
                </UButton>
                <UButton
                  size="sm"
                  variant="soft"
                  color="neutral"
                  icon="i-heroicons-arrow-path"
                  @click="resetAuthMethod(selectedUser!); showAuthMethodModal = false"
                >
                  Reset to Password
                </UButton>
              </div>
              <div class="flex gap-2">
                <UButton variant="ghost" color="neutral" @click="showAuthMethodModal = false">Cancel</UButton>
                <UButton type="submit" color="neutral" :loading="isSubmitting">Save</UButton>
              </div>
            </div>
          </form>
        </div>
      </template>
    </UModal>
  </div>
</template>
