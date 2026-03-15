<script setup lang="ts">
import { Plus, Search, Pencil, ShieldCheck, Trash2, Users, Mail, Fingerprint, RefreshCw, Lock, Loader2 } from 'lucide-vue-next'
import {
  Button, Input, Label, Switch, Badge,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationNext,
  Alert, AlertTitle, AlertDescription,
  Checkbox,
} from '@spavn/ui'
import { useToast } from '@spavn/ui'
import { AlertTriangle } from 'lucide-vue-next'

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

const { toast } = useToast()
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
    toast({ title: 'User created' })
  }
  catch (e: any) {
    toast({ title: e?.data?.data?.error?.message || 'Failed to create user', variant: 'destructive' })
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
    toast({ title: 'User updated' })
  }
  catch (e: any) {
    toast({ title: e?.data?.data?.error?.message || 'Failed to update user', variant: 'destructive' })
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
    toast({ title: 'User deleted' })
  }
  catch (e: any) {
    toast({ title: e?.data?.data?.error?.message || 'Failed to delete', variant: 'destructive' })
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
    toast({ title: 'Auth method updated' })
  }
  catch (e: any) {
    toast({ title: e?.data?.data?.error?.message || 'Failed to update auth method', variant: 'destructive' })
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
    toast({ title: 'User set to passwordless' })
  }
  catch (e: any) {
    toast({ title: e?.data?.data?.error?.message || 'Failed to update', variant: 'destructive' })
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
    toast({ title: 'Auth method reset to password' })
  }
  catch (e: any) {
    toast({ title: e?.data?.data?.error?.message || 'Failed to reset', variant: 'destructive' })
  }
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

function getAuthMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    password: 'Password',
    'magic-link': 'Magic Link',
    passkey: 'Passkey',
    totp: 'TOTP',
  }
  return labels[method] || method
}

const authMethodIconMap: Record<string, any> = {
  password: Lock,
  'magic-link': Mail,
  passkey: Fingerprint,
  totp: ShieldCheck,
}

function getAuthMethodIconComponent(method: string) {
  return authMethodIconMap[method] || Lock
}
</script>

<template>
  <div>
    <!-- Page header -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="text-2xl font-bold text-[hsl(var(--foreground))]">Users & Roles</h2>
      <Button @click="showInviteModal = true">
        <Plus class="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>

    <!-- Filter bar -->
    <div class="flex items-center gap-4 mb-4">
      <div class="relative w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
        <Input
          v-model="search"
          placeholder="Search users..."
          class="pl-9 w-full"
        />
      </div>
    </div>

    <!-- Table card -->
    <div class="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Auth</TableHead>
            <TableHead>Status</TableHead>
            <TableHead class="w-[100px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="status === 'pending'">
            <TableCell colspan="6" class="text-center py-8">
              <Loader2 class="h-6 w-6 animate-spin mx-auto text-[hsl(var(--muted-foreground))]" />
            </TableCell>
          </TableRow>
          <TableRow v-for="u in paginatedUsers" :key="u.id">
            <TableCell>
              <NuxtLink
                :to="`/admin/users/${u.id}`"
                class="font-medium text-[hsl(var(--foreground))] hover:text-[hsl(var(--primary))] transition-colors"
              >
                {{ u.email }}
              </NuxtLink>
            </TableCell>
            <TableCell>
              <span class="text-[hsl(var(--muted-foreground))]">
                {{ [u.firstName, u.lastName].filter(Boolean).join(' ') || '---' }}
              </span>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <span class="w-2 h-2 rounded-full" :class="getRoleDotClass(u.role)" />
                <span class="text-sm capitalize" :class="getRoleTextClass(u.role)">
                  {{ u.role }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <div class="flex items-center gap-1.5">
                  <component
                    :is="getAuthMethodIconComponent(u.authMethod)"
                    class="h-4 w-4 text-[hsl(var(--muted-foreground))]"
                  />
                  <span class="text-sm text-[hsl(var(--muted-foreground))]">
                    {{ getAuthMethodLabel(u.authMethod) }}
                  </span>
                </div>
                <!-- Auth badges -->
                <div class="flex items-center gap-1">
                  <span
                    v-if="u.hasTOTP"
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    title="TOTP enabled"
                  >
                    <ShieldCheck class="h-3 w-3" />
                    2FA
                  </span>
                  <span
                    v-if="u.passkeysCount > 0"
                    class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"
                    :title="`${u.passkeysCount} passkey(s)`"
                  >
                    <Fingerprint class="h-3 w-3" />
                    {{ u.passkeysCount }}
                  </span>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-2">
                <span
                  class="w-2 h-2 rounded-full"
                  :class="u.isActive ? 'bg-[hsl(var(--accent))]' : 'bg-[hsl(var(--destructive))]'"
                />
                <span
                  class="text-sm"
                  :class="u.isActive ? 'text-[hsl(var(--accent-foreground))]' : 'text-[hsl(var(--destructive))]'"
                >
                  {{ u.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  title="Edit user"
                  @click="openEdit(u)"
                >
                  <Pencil class="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Change auth method"
                  @click="openAuthMethodModal(u)"
                >
                  <ShieldCheck class="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Delete user"
                  @click="deleteUser(u)"
                >
                  <Trash2 class="h-4 w-4 text-[hsl(var(--destructive))]" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-[hsl(var(--border))]">
        <p class="text-sm text-[hsl(var(--muted-foreground))]">
          Showing {{ ((page - 1) * pageSize) + 1 }}--{{ Math.min(page * pageSize, filteredUsers.length) }} of {{ filteredUsers.length }}
        </p>
        <Pagination :total="totalPages" :sibling-count="1" :default-page="page" @update:page="page = $event">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious />
            </PaginationItem>
            <PaginationItem>
              <PaginationNext />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      <!-- Empty state -->
      <div v-if="filteredUsers.length === 0 && status !== 'pending'" class="text-center py-12 border-t border-[hsl(var(--border))]">
        <Users class="w-9 h-9 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
        <p v-if="debouncedSearch" class="text-[hsl(var(--muted-foreground))]">No users found.</p>
        <template v-else>
          <p class="text-[hsl(var(--muted-foreground))]">No users yet.</p>
          <Button
            variant="outline"
            class="mt-4"
            @click="showInviteModal = true"
          >
            <Plus class="h-4 w-4 mr-2" />
            Add your first user
          </Button>
        </template>
      </div>
    </div>

    <!-- Invite Modal -->
    <Dialog v-model:open="showInviteModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="inviteUser">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="invite-email">Email <span class="text-[hsl(var(--destructive))]">*</span></Label>
              <Input id="invite-email" v-model="inviteForm.email" type="email" class="w-full" />
            </div>
            <div class="space-y-2">
              <Label for="invite-role">Role</Label>
              <Select v-model="inviteForm.role">
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="invite-first">First Name</Label>
              <Input id="invite-first" v-model="inviteForm.firstName" class="w-full" />
            </div>
            <div class="space-y-2">
              <Label for="invite-last">Last Name</Label>
              <Input id="invite-last" v-model="inviteForm.lastName" class="w-full" />
            </div>
          </div>
          <div class="space-y-2">
            <Label for="invite-password">Temporary Password <span class="text-[hsl(var(--destructive))]">*</span></Label>
            <Input id="invite-password" v-model="inviteForm.password" type="password" class="w-full" />
          </div>
          <DialogFooter>
            <Button variant="ghost" @click="showInviteModal = false">Cancel</Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
              Create User
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Edit Modal -->
    <Dialog v-model:open="showEditModal">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form class="space-y-4" @submit.prevent="saveEdit">
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="edit-email">Email</Label>
              <Input id="edit-email" v-model="editForm.email" type="email" class="w-full" />
            </div>
            <div class="space-y-2">
              <Label for="edit-role">Role</Label>
              <Select v-model="editForm.role">
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="opt in roleOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-2">
              <Label for="edit-first">First Name</Label>
              <Input id="edit-first" v-model="editForm.firstName" class="w-full" />
            </div>
            <div class="space-y-2">
              <Label for="edit-last">Last Name</Label>
              <Input id="edit-last" v-model="editForm.lastName" class="w-full" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <Switch v-model:checked="editForm.isActive" />
            <span class="text-sm text-[hsl(var(--foreground))]">Active</span>
          </div>
          <DialogFooter>
            <Button variant="ghost" @click="showEditModal = false">Cancel</Button>
            <Button type="submit" :disabled="isSubmitting">
              <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <!-- Auth Method Modal -->
    <Dialog v-model:open="showAuthMethodModal">
      <DialogContent>
        <DialogHeader>
          <div class="flex items-center gap-3">
            <div class="flex items-center justify-center w-10 h-10 rounded-lg bg-[hsl(var(--accent))]">
              <ShieldCheck class="h-5 w-5 text-[hsl(var(--primary))]" />
            </div>
            <div>
              <DialogTitle>Change Auth Method</DialogTitle>
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                {{ selectedUser?.email }}
              </p>
            </div>
          </div>
        </DialogHeader>

        <form class="space-y-4" @submit.prevent="saveAuthMethod">
          <div class="space-y-2">
            <Label>Authentication Method</Label>
            <Select v-model="authMethodForm.authMethod">
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in authMethodOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="flex items-center gap-2">
            <Switch v-model:checked="authMethodForm.removePassword" />
            <div>
              <span class="text-sm text-[hsl(var(--foreground))]">Remove password</span>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">
                Forces passwordless-only authentication
              </p>
            </div>
          </div>

          <Alert v-if="authMethodForm.removePassword" variant="destructive">
            <AlertTriangle class="h-4 w-4" />
            <AlertTitle>This will permanently remove the user's password. They will only be able to sign in using passwordless methods.</AlertTitle>
          </Alert>

          <div class="flex justify-between pt-2">
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                @click="forcePasswordless(selectedUser!); showAuthMethodModal = false"
              >
                <Mail class="h-4 w-4 mr-2" />
                Force Passwordless
              </Button>
              <Button
                size="sm"
                variant="outline"
                @click="resetAuthMethod(selectedUser!); showAuthMethodModal = false"
              >
                <RefreshCw class="h-4 w-4 mr-2" />
                Reset to Password
              </Button>
            </div>
            <div class="flex gap-2">
              <Button variant="ghost" @click="showAuthMethodModal = false">Cancel</Button>
              <Button type="submit" :disabled="isSubmitting">
                <Loader2 v-if="isSubmitting" class="h-4 w-4 mr-2 animate-spin" />
                Save
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>
</template>
