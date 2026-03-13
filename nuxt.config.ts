// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  future: { compatibilityVersion: 4 },
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  // Admin pages, components, and composables live in lib/publisher-admin/
  // registered as a Nuxt Layer so pages are file-system routed automatically.
  // The layer config disables its own component/composable scanning —
  // those are configured explicitly below to control prefixes.
  extends: ['./lib/publisher-admin'],

  // Composables and utils are auto-imported by the layer (lib/publisher-admin/).
  // Do NOT add them to imports.dirs — that causes duplicate registration warnings.

  components: {
    dirs: [
      { path: '~~/lib/publisher-admin/components/auth', prefix: 'Auth' },
      { path: '~~/lib/publisher-admin/components/publisher', prefix: 'Publisher', pathPrefix: true },
    ],
  },

  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/scripts',
    '@nuxt/ui',
  ],

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
  },

  /**
   * Runtime configuration for feature flags.
   *
   * Public values are exposed to the client and used to conditionally
   * render authentication method tabs on the login page and settings page.
   *
   * These values are read from environment variables at build/start time.
   * See publisher.config.ts for the canonical feature flag definitions.
   */
  runtimeConfig: {
    public: {
      features: {
        enableMagicLinks: process.env.PUBLISHER_ENABLE_MAGIC_LINKS !== 'false',
        enableWebAuthn: process.env.PUBLISHER_ENABLE_WEBAUTHN !== 'false',
        enableTOTP: process.env.PUBLISHER_ENABLE_TOTP !== 'false',
        requirePasswordless: process.env.PUBLISHER_REQUIRE_PASSWORDLESS === 'true',
      },
    },
  },

})
