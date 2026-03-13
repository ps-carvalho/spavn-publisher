/**
 * Route middleware that protects /admin/** routes.
 * Redirects to /admin/login if not authenticated.
 *
 * Uses the auth composable so that user state is hydrated
 * for all downstream page components (sidebar, topbar, etc.).
 */
export default defineNuxtRouteMiddleware(async (to) => {
  // Skip login page
  if (to.path === '/admin/login') return

  // Only protect /admin routes
  if (!to.path.startsWith('/admin')) return

  const { user, refresh } = usePublisherAuth()

  // If user state is not populated yet, fetch from the server.
  // This handles page refresh — the composable's useState resets on SSR,
  // so we need to re-fetch the user from the session cookie.
  if (!user.value) {
    await refresh()
  }

  // Still no user after fetch → not authenticated
  if (!user.value) {
    return navigateTo('/admin/login')
  }

  // Check security onboarding — redirect to My Security if 2FA is required but not set up.
  // Cache the result in client-side state to avoid an API call on every navigation.
  if (to.path !== '/admin/settings' || to.query.tab !== 'my-security') {
    const onboardingChecked = useState<boolean>('security-onboarding-checked', () => false)
    const onboardingRequired = useState<boolean>('security-onboarding-required', () => false)

    if (!onboardingChecked.value) {
      try {
        const onboarding = await $fetch('/api/publisher/auth/security-onboarding')
        onboardingRequired.value = !!onboarding.required
        onboardingChecked.value = true
      } catch {
        // Don't block navigation on error
      }
    }

    if (onboardingRequired.value) {
      return navigateTo('/admin/settings?tab=my-security&onboarding=required')
    }
  }
})
