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
})
