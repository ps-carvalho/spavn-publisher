<script setup lang="ts">
definePageMeta({
  layout: false,
})

const route = useRoute()
const { verifyMagicLink, isLoading } = usePublisherAuth()

const status = ref<'verifying' | 'success' | 'error'>('verifying')
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token as string | undefined

  if (!token) {
    status.value = 'error'
    errorMessage.value = 'No sign-in token found. Please request a new link.'
    return
  }

  try {
    const response = await $fetch<{
      requiresSecondFactor: boolean
      redirectTo?: string
      user?: any
    }>('/api/publisher/auth/magic-link/verify', {
      method: 'GET',
      query: { token },
      credentials: 'include',
    })

    if (response.requiresSecondFactor && response.redirectTo) {
      // Redirect to 2FA page
      navigateTo(response.redirectTo)
      return
    }

    // No 2FA required - login complete
    status.value = 'success'

    // Update auth state
    const { user: authUser } = usePublisherAuth()
    if (response.user) {
      authUser.value = response.user
    }

    // Auto-redirect to admin after a brief moment
    setTimeout(() => {
      navigateTo('/admin')
    }, 1500)
  }
  catch (e: any) {
    status.value = 'error'
    errorMessage.value = e?.data?.error?.message || 'Invalid or expired sign-in link'
  }
})
</script>

<template>
  <div class="min-h-screen bg-stone-100 dark:bg-stone-950 flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo & Heading -->
      <div class="text-center mb-8">
        <UIcon name="i-heroicons-cube-transparent" class="text-amber-600 dark:text-amber-500 text-4xl mb-3" />
        <h1 class="text-2xl font-bold text-stone-900 dark:text-stone-100">Publisher</h1>
      </div>

      <UCard>
        <!-- Verifying State -->
        <div v-if="status === 'verifying'" class="text-center py-6 space-y-4">
          <UIcon name="i-heroicons-arrow-path" class="text-3xl text-amber-600 dark:text-amber-500 animate-spin" />
          <p class="text-stone-600 dark:text-stone-400 font-medium">Verifying your sign-in link...</p>
        </div>

        <!-- Success State -->
        <div v-else-if="status === 'success'" class="text-center py-6 space-y-4">
          <UIcon name="i-heroicons-check-circle" class="text-3xl text-green-600 dark:text-green-500" />
          <div>
            <p class="text-stone-900 dark:text-stone-100 font-medium">Signed in successfully!</p>
            <p class="text-sm text-stone-500 dark:text-stone-400 mt-1">Redirecting to dashboard...</p>
          </div>
        </div>

        <!-- Error State -->
        <div v-else class="space-y-4">
          <UAlert
            color="error"
            variant="subtle"
            icon="i-heroicons-exclamation-triangle"
            :title="errorMessage"
          />

          <p class="text-sm text-stone-500 dark:text-stone-400 text-center">
            The link may have expired or already been used.
          </p>

          <div class="flex flex-col gap-2">
            <UButton
              block
              size="lg"
              to="/admin/login"
              icon="i-heroicons-envelope"
              @click.prevent="navigateTo('/admin/login')"
            >
              Request a New Link
            </UButton>

            <UButton
              block
              size="lg"
              variant="ghost"
              to="/admin/login"
              @click.prevent="navigateTo('/admin/login')"
            >
              Back to Sign In
            </UButton>
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
