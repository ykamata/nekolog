import { resolve } from 'path';
import { defineConfig, configDefaults } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    exclude: [...configDefaults.exclude, 'tests/e2e/**', 'tests/accessibility/**'],
    // テスト環境でのモジュール解決を改善
    server: {
      deps: {
        inline: ['@nuxt/test-utils'],
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, '.'),
      '@': resolve(__dirname, '.'),
      // composablesディレクトリのエイリアスを明示的に追加
      '~/composables': resolve(__dirname, './composables'),
      '~/types': resolve(__dirname, './types'),
      '~/utils': resolve(__dirname, './utils'),
    },
  },
  // テスト環境でのESMサポートを改善
  esbuild: {
    target: 'esnext',
  },
});
