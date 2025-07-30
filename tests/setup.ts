import { beforeAll, afterAll, vi } from 'vitest';
import { config } from '@vue/test-utils';

// Mock Vue's auto-imports for testing
global.ref = (await import('vue')).ref;
global.reactive = (await import('vue')).reactive;
global.computed = (await import('vue')).computed;
global.watch = (await import('vue')).watch;
global.watchEffect = (await import('vue')).watchEffect;
global.nextTick = (await import('vue')).nextTick;
global.onMounted = (await import('vue')).onMounted;
global.onUnmounted = (await import('vue')).onUnmounted;
global.withDefaults = (await import('vue')).withDefaults;
global.readonly = (await import('vue')).readonly;

// Mock Nuxt's auto-imports
global.$fetch = vi.fn();

beforeAll(async () => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
});

afterAll(async () => {
  // Cleanup after tests
});
