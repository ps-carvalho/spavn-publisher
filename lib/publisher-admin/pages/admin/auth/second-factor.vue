<script setup lang="ts">
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

import { startAuthentication } from '@simplewebauthn/browser'
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo & Heading -->
      <div class="text-center mb-8">
        <UIcon name="i-heroicons-shield-check" class="text-amber-600 dark:text-amber-500 text-4xl mb-3" />
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Two-Factor Authentication</h1>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">
          Complete sign-in with your second factor
        </p>
      </div>

      <!-- 2FA Card -->
      <UCard>
        <!-- Loading state -->
        <div v-if="isLoadingMethods" class="text-center py-8">
          <UIcon name="i-heroicons-arrow-path" class="text-4xl text-amber-600 animate-spin" />
          <p class="mt-4 text-stone-500">Loading authentication methods...</p>
        </div>

        <!-- No methods available -->
        <div v-else-if="secondFactorMethods.length === 0" class="text-center py-8">
          <UIcon name="i-heroicons-exclamation-triangle" class="text-4xl text-warning-500 mb-3" />
          <p class="text-stone-600 dark:text-stone-300">
            No second-factor methods configured.
          </p>
          <p class="text-sm text-stone-500 mt-2">
            Please set up TOTP or Passkey in your account settings.
          </p>
        </div>

        <!-- 2FA Options -->
        <div v-else class="space-y-6">
          <!-- Error alert -->
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="errorMessage"
            :close-button="{ onClick: () => errorMessage = '' }"
          />

          <!-- Passkey Option -->
          <div v-if="secondFactorMethods.includes('passkey')" class="space-y-3">
            <h3 class="text-sm font-medium text-stone-700 dark:text-stone-300">
              Sign in with Passkey
            </h3>
            <UButton
              v-if="passkeySupported"
              block
              size="lg"
              color="neutral"
              variant="outline"
              icon="i-heroicons-finger-print"
              :loading="passkeyLoading"
              @click="handlePasskeySubmit"
            >
              Use Passkey
            </UButton>
            <UAlert
              v-else
              color="warning"
              variant="subtle"
              icon="i-heroicons-exclamation-triangle"
              title="Passkeys not supported"
              description="Your browser doesn't support passkeys."
            />
          </div>

          <!-- Divider -->
          <div v-if="secondFactorMethods.includes('passkey') && secondFactorMethods.includes('totp')" 
               class="relative">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t border-stone-200 dark:border-stone-700"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="px-2 bg-white dark:bg-stone-900 text-stone-500">or</span>
            </div>
          </div>

          <!-- TOTP Option -->
          <div v-if="secondFactorMethods.includes('totp')" class="space-y-3">
            <h3 class="text-sm font-medium text-stone-700 dark:text-stone-300">
              {{ useBackupCode ? 'Enter Backup Code' : 'Enter Authenticator Code' }}
            </h3>
            
            <form @submit.prevent="handleTOTPSubmit" class="space-y-3">
              <UInput
                v-model="totpCode"
                type="text"
                :placeholder="useBackupCode ? 'XXXX-XXXX' : '000000'"
                :icon="useBackupCode ? 'i-heroicons-key' : 'i-heroicons-shield-check'"
                :maxlength="useBackupCode ? 9 : 6"
                autocomplete="one-time-code"
                inputmode="numeric"
                size="lg"
                class="w-full text-center text-2xl tracking-widest"
                autofocus
              />

              <UButton
                type="submit"
                block
                size="lg"
                :loading="totpLoading"
                icon="i-heroicons-shield-check"
              >
                Verify
              </UButton>
            </form>

            <!-- Toggle backup code mode -->
            <p class="text-center text-sm text-stone-500">
              <button
                type="button"
                class="text-amber-600 dark:text-amber-500 hover:underline font-medium"
                @click="useBackupCode = !useBackupCode; totpCode = ''"
              >
                {{ useBackupCode ? 'Use authenticator code' : 'Use a backup code' }}
              </button>
            </p>
          </div>
        </div>
      </UCard>

      <!-- Footer -->
      <p class="text-center text-xs text-stone-400 dark:text-stone-500 mt-6">
        <NuxtLink to="/admin/login" class="text-amber-600 hover:underline">
          Back to login
        </NuxtLink>
      </p>
    </div>
  </div>
</template>