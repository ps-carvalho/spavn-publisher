import tailwindcss from '@tailwindcss/vite'

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
    '@nuxtjs/color-mode',
  ],

  // Force Nuxt to transpile @spavn/ui and its Vue-dependent deps so they
  // resolve Vue from this project's node_modules (prevents dual-instance SSR crash).
  build: {
    transpile: ['@spavn/ui', 'radix-vue'],
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      hmr: {
        // When running behind nginx proxy (docker-compose), tell Vite
        // to connect the HMR websocket to the nginx host/port instead
        // of the internal container port.
        clientPort: 8080,
        path: '/_nuxt/hmr/',
      },
    },
  },

  colorMode: {
    preference: 'system',
    fallback: 'light',
    classSuffix: '',
  },

  runtimeConfig: {
    public: {},
  },

})
