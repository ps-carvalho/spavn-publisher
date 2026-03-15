<script setup lang="ts">
import { ShieldCheck, RefreshCw, AlertTriangle, Fingerprint, Loader2 } from 'lucide-vue-next'
import { Button, Input, Card, CardContent, Alert, AlertTitle, AlertDescription } from '@spavn/ui'
import { startAuthentication } from '@simplewebauthn/browser'

definePageMeta({
  layout: false,
})

const route = useRoute()
const { loginWithTOTP, isLoading: totpLoading, error: totpError } = useTOTP()
const { authenticateWithPasskey, isSupported: passkeySupported, isLoading: passkeyLoading, error: passkeyError } = useWebAuthn()

/** Step state */
const step = ref<'verify' | 'complete'>('verify')

/** Form state */
const totpCode = ref('')
const errorMessage = ref('')
const useBackupCode = ref(false)

/** Second factor methods available */
const secondFactorMethods = ref<('totp' | 'passkey')[]>([])
const isLoadingMethods = ref(true)

// Fetch available second factor methods on mount
onMounted(async () => {
  try {
    const response = await $fetch<{
      methods: ('totp' | 'passkey')[]
    }>('/api/publisher/auth/second-factor-methods', {
      credentials: 'include', // Include cookies for auth
    })
    secondFactorMethods.value = response.methods
  } catch (e: any) {
    // If not authenticated with magic link, redirect to login
    if (e.statusCode === 401) {
      await navigateTo('/admin/login')
      return
    }
    errorMessage.value = 'Failed to load authentication methods'
  } finally {
    isLoadingMethods.value = false
  }
})

/** Verify with TOTP */
async function handleTOTPSubmit() {
  errorMessage.value = ''

  if (!totpCode.value) {
    errorMessage.value = 'Code is required'
    return
  }

  try {
    const response = await $fetch('/api/publisher/auth/verify-second-factor', {
      method: 'POST',
      body: {
        type: 'totp',
        code: totpCode.value,
      },
      credentials: 'include',
    })

    if (response.success) {
      await navigateTo('/admin')
    }
  } catch (e: any) {
    errorMessage.value = e?.data?.error?.message || 'Invalid code. Please try again.'
  }
}

/** Verify with Passkey */
async function handlePasskeySubmit() {
  if (!passkeySupported.value) {
    errorMessage.value = 'Your browser does not support passkeys'
    return
  }

  errorMessage.value = ''

  try {
    // Get authentication options from server
    const options = await $fetch('/api/publisher/auth/webauthn/authenticate/options', {
      method: 'POST',
      body: { email: 'current-user' }, // Server will get email from session
      credentials: 'include',
    })

    // Trigger browser passkey prompt
    const assertion = await startAuthentication(options)

    // Verify with server
    const response = await $fetch('/api/publisher/auth/verify-second-factor', {
      method: 'POST',
      body: {
        type: 'passkey',
        response: assertion,
      },
      credentials: 'include',
    })

    if (response.success) {
      await navigateTo('/admin')
    }
  } catch (e: any) {
    errorMessage.value = passkeyError.value || 'Passkey verification failed. Please try again.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo & Heading -->
      <div class="text-center mb-8">
        <ShieldCheck class="w-9 h-9 text-[hsl(var(--primary))] mx-auto mb-3" />
        <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Two-Factor Authentication</h1>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Complete sign-in with your second factor
        </p>
      </div>

      <!-- 2FA Card -->
      <Card>
        <CardContent class="pt-6">
          <!-- Loading state -->
          <div v-if="isLoadingMethods" class="text-center py-8">
            <RefreshCw class="w-9 h-9 text-[hsl(var(--primary))] mx-auto animate-spin" />
            <p class="mt-4 text-[hsl(var(--muted-foreground))]">Loading authentication methods...</p>
          </div>

          <!-- No methods available -->
          <div v-else-if="secondFactorMethods.length === 0" class="text-center py-8">
            <AlertTriangle class="w-9 h-9 text-[hsl(var(--destructive))] mx-auto mb-3" />
            <p class="text-[hsl(var(--foreground))]">
              No second-factor methods configured.
            </p>
            <p class="text-sm text-[hsl(var(--muted-foreground))] mt-2">
              Please set up TOTP or Passkey in your account settings.
            </p>
          </div>

          <!-- 2FA Options -->
          <div v-else class="space-y-6">
            <!-- Error alert -->
            <Alert v-if="errorMessage" variant="destructive">
              <AlertTriangle class="h-4 w-4" />
              <AlertTitle>{{ errorMessage }}</AlertTitle>
            </Alert>

            <!-- Passkey Option -->
            <div v-if="secondFactorMethods.includes('passkey')" class="space-y-3">
              <h3 class="text-sm font-medium text-[hsl(var(--foreground))]">
                Sign in with Passkey
              </h3>
              <Button
                v-if="passkeySupported"
                class="w-full"
                size="lg"
                :disabled="passkeyLoading"
                @click="handlePasskeySubmit"
              >
                <Loader2 v-if="passkeyLoading" class="h-5 w-5 mr-2 animate-spin" />
                <Fingerprint v-else class="h-5 w-5 mr-2" />
                Use Passkey
              </Button>
              <Alert v-else variant="destructive">
                <AlertTriangle class="h-4 w-4" />
                <AlertTitle>Passkeys not supported</AlertTitle>
                <AlertDescription>Your browser doesn't support passkeys.</AlertDescription>
              </Alert>
            </div>

            <!-- Divider -->
            <div v-if="secondFactorMethods.includes('passkey') && secondFactorMethods.includes('totp')"
                 class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-[hsl(var(--border))]"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-[hsl(var(--card))] text-[hsl(var(--muted-foreground))]">or</span>
              </div>
            </div>

            <!-- TOTP Option -->
            <div v-if="secondFactorMethods.includes('totp')" class="space-y-3">
              <h3 class="text-sm font-medium text-[hsl(var(--foreground))]">
                {{ useBackupCode ? 'Enter Backup Code' : 'Enter Authenticator Code' }}
              </h3>

              <form @submit.prevent="handleTOTPSubmit" class="space-y-3">
                <Input
                  v-model="totpCode"
                  type="text"
                  :placeholder="useBackupCode ? 'XXXX-XXXX' : '000000'"
                  :maxlength="useBackupCode ? 9 : 6"
                  autocomplete="one-time-code"
                  inputmode="numeric"
                  class="w-full text-center text-2xl tracking-widest"
                  autofocus
                />

                <Button
                  type="submit"
                  class="w-full"
                  size="lg"
                  variant="outline"
                  :disabled="totpLoading"
                >
                  <Loader2 v-if="totpLoading" class="h-5 w-5 mr-2 animate-spin" />
                  <ShieldCheck v-else class="h-5 w-5 mr-2" />
                  Verify
                </Button>
              </form>

              <!-- Toggle backup code mode -->
              <p class="text-center text-sm text-[hsl(var(--muted-foreground))]">
                <button
                  type="button"
                  class="text-[hsl(var(--primary))] hover:underline font-medium"
                  @click="useBackupCode = !useBackupCode; totpCode = ''"
                >
                  {{ useBackupCode ? 'Use authenticator code' : 'Use a backup code' }}
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Footer -->
      <p class="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
        <NuxtLink to="/admin/login" class="text-[hsl(var(--primary))] hover:underline">
          Back to login
        </NuxtLink>
      </p>
    </div>
  </div>
</template>
