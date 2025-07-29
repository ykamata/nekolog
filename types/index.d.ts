/**
 * Global type definitions for the Nuxt 3 TypeScript project
 */

// Re-export cat meal types for global access
export * from './cat-meal';

// Extend process.env with custom environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    NUXT_PUBLIC_API_BASE?: string;
  }
}

// Extend Vue component options
declare module 'vue' {
  interface ComponentCustomProperties {
    // Add any global properties here
    $customProperty?: string;
  }
}

// Extend Nuxt context
declare module '#app' {
  interface NuxtApp {
    // Add any Nuxt app extensions here
    $customMethod?: () => void;
  }
}
