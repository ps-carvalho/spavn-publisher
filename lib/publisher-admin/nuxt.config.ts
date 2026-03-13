import { defineNuxtConfig } from 'nuxt/config'

/**
 * Publisher Admin — Nuxt Layer Configuration
 *
 * This layer provides admin pages (pages/admin/**).
 * Components and composables are NOT scanned by the layer —
 * they are explicitly configured in the root nuxt.config.ts
 * to control prefixes (Publisher*) and scan paths.
 */
export default defineNuxtConfig({
  // Prevent layer from auto-scanning components.
  // Root config handles this with Publisher prefix via components.dirs.
  components: false,
})
