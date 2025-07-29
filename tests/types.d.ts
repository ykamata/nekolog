import type { Ref, ComputedRef } from 'vue';

declare global {
  const ref: typeof import('vue').ref;
  const reactive: typeof import('vue').reactive;
  const computed: typeof import('vue').computed;
  const watch: typeof import('vue').watch;
  const watchEffect: typeof import('vue').watchEffect;
  const nextTick: typeof import('vue').nextTick;
  const onMounted: typeof import('vue').onMounted;
  const onUnmounted: typeof import('vue').onUnmounted;
  const withDefaults: typeof import('vue').withDefaults;
  const $fetch: any;
}

export {};
