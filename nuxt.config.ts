// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  // Compatibility date for Nuxt 4

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

  // Runtime configuration
  runtimeConfig: {
    public: {
      apiBase: '',
    },
  },

  // Keep source directory at root (Nuxt 4 defaults to 'app/')
  srcDir: '.',

  // Development server configuration
  devServer: {
    host: '0.0.0.0', // Listen on all interfaces (required for Docker)
    port: 3000,
  },
  compatibilityDate: '2025-11-16',

  // Nitro configuration for routing
  nitro: {
    routeRules: {
      // Add redirect from /index to /
      '/index': { redirect: '/' },
      // Static file serving for uploaded images
      '/uploads/**': {
        headers: {
          'cache-control': 'public, max-age=31536000, immutable',
        },
      },
      // Disable caching for HTML pages to prevent bfcache issues on iOS Safari
      '/meals/**': {
        headers: {
          'cache-control': 'no-cache, no-store, must-revalidate',
          'pragma': 'no-cache',
          'expires': '0',
        },
      },
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
    ssr: {
      // Exclude Chart.js from SSR to prevent server-side bundling
      noExternal: [],
      external: ['chart.js', 'vue-chartjs'],
    },
    build: {
      rollupOptions: {
        external: ['@prisma/client'],
      },
    },
    server: {
      host: '0.0.0.0',
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 24678,
      },
    },
  },

  // Enable TypeScript support with strict type checking during build
  typescript: {
    strict: true,
    typeCheck: false, // Temporarily disabled during Nuxt 4 upgrade - re-enable after fixing type errors
    shim: false,
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
});
