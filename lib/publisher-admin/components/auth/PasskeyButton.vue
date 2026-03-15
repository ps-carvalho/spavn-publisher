<script setup lang="ts">
import { Fingerprint, Loader2 } from 'lucide-vue-next'
import { Button } from '@spavn/ui'

interface PublisherUser {
  id: number
  email: string
  firstName: string | null
  lastName: string | null
  role: string
}

const props = defineProps<{
  /** Email address for passkey authentication */
  email: string
  /** Whether the email field has been filled in */
  emailValid?: boolean
}>()

const emit = defineEmits<{
  /** Emitted on successful authentication with the user data */
  success: [user: PublisherUser]
  /** Emitted when an error occurs */
  error: [message: string]
}>()

const { authenticateWithPasskey, isSupported, isLoading, error } = useWebAuthn()

async function handleClick() {
  if (!props.email) {
    emit('error', 'Please enter your email first')
    return
  }

  const user = await authenticateWithPasskey(props.email)

  if (user) {
    emit('success', user)
  }
  else if (error.value) {
    emit('error', error.value)
  }
}
</script>

<template>
  <div v-if="isSupported">
    <Button
      class="w-full"
      size="lg"
      variant="outline"
      :disabled="!emailValid || isLoading"
      @click="handleClick"
    >
      <Loader2 v-if="isLoading" class="h-5 w-5 mr-2 animate-spin" />
      <Fingerprint v-else class="h-5 w-5 mr-2" />
      Sign in with Passkey
    </Button>
  </div>
</template>
