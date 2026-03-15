<script setup lang="ts">
import { Box, RefreshCw, CheckCircle, AlertTriangle, Mail, Loader2 } from 'lucide-vue-next'
import { Button, Card, CardContent, Alert, AlertTitle } from '@spavn/ui'

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
  <div class="min-h-screen bg-[hsl(var(--background))] flex items-center justify-center p-4">
    <div class="w-full max-w-sm">
      <!-- Logo & Heading -->
      <div class="text-center mb-8">
        <Box class="w-9 h-9 text-[hsl(var(--primary))] mx-auto mb-3" />
        <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Publisher</h1>
      </div>

      <Card>
        <CardContent class="pt-6">
          <!-- Verifying State -->
          <div v-if="status === 'verifying'" class="text-center py-6 space-y-4">
            <RefreshCw class="w-8 h-8 text-[hsl(var(--primary))] mx-auto animate-spin" />
            <p class="text-[hsl(var(--muted-foreground))] font-medium">Verifying your sign-in link...</p>
          </div>

          <!-- Success State -->
          <div v-else-if="status === 'success'" class="text-center py-6 space-y-4">
            <CheckCircle class="w-8 h-8 text-green-600 dark:text-green-500 mx-auto" />
            <div>
              <p class="text-[hsl(var(--foreground))] font-medium">Signed in successfully!</p>
              <p class="text-sm text-[hsl(var(--muted-foreground))] mt-1">Redirecting to dashboard...</p>
            </div>
          </div>

          <!-- Error State -->
          <div v-else class="space-y-4">
            <Alert variant="destructive">
              <AlertTriangle class="h-4 w-4" />
              <AlertTitle>{{ errorMessage }}</AlertTitle>
            </Alert>

            <p class="text-sm text-[hsl(var(--muted-foreground))] text-center">
              The link may have expired or already been used.
            </p>

            <div class="flex flex-col gap-2">
              <Button
                class="w-full"
                size="lg"
                variant="outline"
                @click="navigateTo('/admin/login')"
              >
                <Mail class="h-5 w-5 mr-2" />
                Request a New Link
              </Button>

              <Button
                class="w-full"
                size="lg"
                variant="ghost"
                @click="navigateTo('/admin/login')"
              >
                Back to Sign In
              </Button>
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
