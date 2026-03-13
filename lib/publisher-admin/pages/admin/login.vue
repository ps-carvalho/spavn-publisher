<script setup lang="ts">
definePageMeta({
  layout: false,
})

const { requestMagicLink, isLoggedIn, refresh } = usePublisherAuth()

/** Login step state - now simplified to just email entry and magic link */
const isIdentifying = ref(false)
const showMagicLinkSent = ref(false)

/** Form state */
const email = ref('')
const errorMessage = ref('')
const successMessage = ref('')

// If already logged in (client-side nav), redirect to admin.
// Don't call refresh() here — after logout's hard redirect,
// useState is fresh (null) so this won't trigger.
onMounted(() => {
  if (isLoggedIn.value) {
    navigateTo('/admin')
  }
})

/** Validate email format */
const isEmailValid = computed(() => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
})

/** Step 1: Send magic link */
async function handleSubmit() {
  if (!email.value || !isEmailValid.value) {
    errorMessage.value = 'Please enter a valid email address'
    return
  }

  isIdentifying.value = true
  errorMessage.value = ''
  successMessage.value = ''

  try {
    // Identify user to check if they exist and have 2FA
    const identifyResponse = await $fetch<{
      email: string
      method: 'magic-link'
      hasSecondFactor: boolean
      secondFactorMethods: ('totp' | 'passkey')[]
    }>('/api/publisher/auth/identify', {
      method: 'POST',
      body: { email: email.value }
    })

    // Store if user has second factor for later
    if (import.meta.client) {
      localStorage.setItem('publisher_2fa_methods', JSON.stringify(identifyResponse.secondFactorMethods))
    }

    // Request magic link
    await requestMagicLink(email.value)
    showMagicLinkSent.value = true
    successMessage.value = 'Check your email for a sign-in link'
  } 
  catch (e: any) {
    errorMessage.value = e?.data?.error?.message || 'Failed to send sign-in link. Please try again.'
  } 
  finally {
    isIdentifying.value = false
  }
}

/** Resend magic link */
async function handleResend() {
  try {
    await requestMagicLink(email.value)
    successMessage.value = 'A new sign-in link has been sent'
  }
  catch (e: any) {
    errorMessage.value = e?.message || 'Failed to resend. Please try again.'
  }
}
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo & Heading -->
      <div class="text-center mb-8">
        <UIcon name="i-heroicons-cube-transparent" class="text-amber-600 dark:text-amber-500 text-4xl mb-3" />
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Publisher</h1>
        <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">Sign in to your account</p>
      </div>

      <!-- Login Card -->
      <UCard>
        <!-- Step 1: Email Entry -->
        <form v-if="!showMagicLinkSent" @submit.prevent="handleSubmit" class="space-y-4">
          <!-- Error alert -->
          <UAlert
            v-if="errorMessage"
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="errorMessage"
            :close-button="{ onClick: () => errorMessage = '' }"
          />

          <!-- Email -->
          <UFormField label="Email" name="email">
            <UInput
              v-model="email"
              type="email"
              placeholder="you@example.com"
              icon="i-heroicons-envelope"
              autofocus
              size="lg"
              class="w-full"
            />
          </UFormField>

          <p class="text-sm text-stone-500 dark:text-stone-400">
            We'll send you a secure sign-in link. No password needed.
          </p>

          <!-- Submit -->
          <UButton
            type="submit"
            block
            size="lg"
            :loading="isIdentifying"
            :disabled="!isEmailValid"
            icon="i-heroicons-paper-airplane"
          >
            Send Magic Link
          </UButton>
        </form>

        <!-- Step 2: Magic Link Sent -->
        <div v-else class="text-center space-y-4">
          <!-- Success alert -->
          <UAlert
            v-if="successMessage"
            color="success"
            variant="subtle"
            icon="i-heroicons-check-circle"
            :title="successMessage"
          />

          <div class="py-4">
            <UIcon name="i-heroicons-envelope-open" class="text-6xl text-amber-600 dark:text-amber-500 mb-4" />
            <h3 class="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2">
              Check your email
            </h3>
            <p class="text-stone-600 dark:text-stone-300">
              We've sent a secure sign-in link to
              <strong class="block mt-1">{{ email }}</strong>
            </p>
          </div>

          <div class="space-y-3">
            <p class="text-sm text-stone-500">
              Didn't receive it?
              <button
                type="button"
                class="text-amber-600 dark:text-amber-500 hover:underline font-medium ml-1"
                @click="handleResend"
              >
                Send again
              </button>
            </p>

            <button
              type="button"
              class="text-sm text-stone-400 hover:text-stone-600"
              @click="showMagicLinkSent = false; errorMessage = ''; successMessage = ''"
            >
              Use a different email
            </button>
          </div>
        </div>
      </UCard>

      <!-- Footer -->
      <p class="text-center text-xs text-stone-400 dark:text-stone-500 mt-6">
        Publisher CMS v0.1.0
      </p>
    </div>
  </div>
</template>