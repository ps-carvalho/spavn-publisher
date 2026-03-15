<script setup lang="ts">
import { Box, MailOpen, Send, AlertTriangle, CheckCircle, Loader2 } from 'lucide-vue-next'
import { Button, Input, Label, Alert, AlertTitle, AlertDescription, Card, CardContent } from '@spavn/ui'

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
  <div class="min-h-screen bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(var(--background))] to-[hsl(var(--accent))] flex items-center justify-center p-4">
    <div class="w-full max-w-md">
      <!-- Logo & Heading -->
      <div class="text-center mb-8">
        <Box class="w-9 h-9 text-[hsl(var(--primary))] mx-auto mb-3" />
        <h1 class="text-3xl font-bold text-[hsl(var(--foreground))]">Publisher</h1>
        <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">Sign in to your account</p>
      </div>

      <!-- Login Card -->
      <Card>
        <CardContent class="pt-6">
          <!-- Step 1: Email Entry -->
          <form v-if="!showMagicLinkSent" @submit.prevent="handleSubmit" class="space-y-4">
            <!-- Error alert -->
            <Alert v-if="errorMessage" variant="destructive">
              <AlertTriangle class="h-4 w-4" />
              <AlertTitle>{{ errorMessage }}</AlertTitle>
            </Alert>

            <!-- Email -->
            <div class="space-y-2">
              <Label for="login-email">Email</Label>
              <Input
                id="login-email"
                v-model="email"
                type="email"
                placeholder="you@example.com"
                autofocus
                class="w-full"
              />
            </div>

            <p class="text-sm text-[hsl(var(--muted-foreground))]">
              We'll send you a secure sign-in link. No password needed.
            </p>

            <!-- Submit -->
            <Button
              type="submit"
              class="w-full"
              size="lg"
              :disabled="!isEmailValid || isIdentifying"
            >
              <Loader2 v-if="isIdentifying" class="h-5 w-5 mr-2 animate-spin" />
              <Send v-else class="h-5 w-5 mr-2" />
              Send Magic Link
            </Button>
          </form>

          <!-- Step 2: Magic Link Sent -->
          <div v-else class="text-center space-y-4">
            <!-- Success alert -->
            <Alert v-if="successMessage">
              <CheckCircle class="h-4 w-4" />
              <AlertTitle>{{ successMessage }}</AlertTitle>
            </Alert>

            <div class="py-4">
              <MailOpen class="w-16 h-16 text-[hsl(var(--primary))] mx-auto mb-4" />
              <h3 class="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
                Check your email
              </h3>
              <p class="text-[hsl(var(--muted-foreground))]">
                We've sent a secure sign-in link to
                <strong class="block mt-1">{{ email }}</strong>
              </p>
            </div>

            <div class="space-y-3">
              <p class="text-sm text-[hsl(var(--muted-foreground))]">
                Didn't receive it?
                <button
                  type="button"
                  class="text-[hsl(var(--primary))] hover:underline font-medium ml-1"
                  @click="handleResend"
                >
                  Send again
                </button>
              </p>

              <button
                type="button"
                class="text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
                @click="showMagicLinkSent = false; errorMessage = ''; successMessage = ''"
              >
                Use a different email
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Footer -->
      <p class="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
        Publisher CMS v0.1.0
      </p>
    </div>
  </div>
</template>
