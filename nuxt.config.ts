// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Compatibility date
  compatibilityDate: '2025-07-28',

  // Enable TypeScript support with strict type checking during build
  typescript: {
    strict: true,
    typeCheck: 'build', // Enable type checking during build
    shim: false,
  },

  // Modules
  modules: [
    '@pinia/nuxt',
    '@unocss/nuxt',
    '@vueuse/nuxt',
    '@nuxtjs/tailwindcss',
    '@nuxt/eslint',
  ],

  // Auto-imports for Vue Composition API
  imports: {
    dirs: ['composables', 'utils', 'stores'],
  },

  // ESLint integration
  eslint: {
    config: {
      stylistic: {
        indent: 2,
        quotes: 'single',
        semi: true,
      },
    },
  },

  // Tailwind CSS configuration
  tailwindcss: {
    exposeConfig: true,
    viewer: true,
    configPath: 'tailwind.config.ts',
  },

  // UnoCSS configuration
  unocss: {
    preflight: true,
    icons: true,
    attributify: true,
    shortcuts: {},
    rules: [],
  },

  // Development server configuration
  devServer: {
    port: 3000,
  },

  // Runtime configuration
  runtimeConfig: {
    public: {
      apiBase: '',
    },
  },

  // App configuration
  app: {
    head: {
      htmlAttrs: {
        lang: 'ja',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },

  // Enable Vue Composition API features
  vue: {
    propsDestructure: true,
  },

  // Nitro configuration for routing
  nitro: {
    routeRules: {
      // Add redirect from /index to /
      '/index': { redirect: '/' },
    },
  },

  // Vite configuration
  vite: {
    define: {
      global: 'globalThis',
    },
    optimizeDeps: {
      include: ['@prisma/client'],
    },
    build: {
      rollupOptions: {
        external: ['@prisma/client'],
      },
    },
  },
});
