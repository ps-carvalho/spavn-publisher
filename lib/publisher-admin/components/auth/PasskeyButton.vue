<script setup lang="ts">
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
    <UButton
      block
      size="lg"
      color="neutral"
      variant="outline"
      icon="i-heroicons-finger-print"
      :loading="isLoading"
      :disabled="!emailValid"
      @click="handleClick"
    >
      Sign in with Passkey
    </UButton>
  </div>
</template>
