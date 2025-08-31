<template>
  <div
    v-if="error"
    class="error-display"
  >
    <!-- インライン表示 -->
    <div
      v-if="inline"
      :class="[
        'p-4 rounded-md border',
        variant === 'error' ? 'bg-red-50 border-red-200' : 'bg-yellow-50 border-yellow-200',
      ]"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            :class="[
              'h-5 w-5',
              variant === 'error' ? 'text-red-400' : 'text-yellow-400',
            ]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              v-if="variant === 'error'"
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
            <path
              v-else
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3 flex-1">
          <h3
            :class="[
              'text-sm font-medium',
              variant === 'error' ? 'text-red-800' : 'text-yellow-800',
            ]"
          >
            {{ title }}
          </h3>
          <p
            :class="[
              'mt-1 text-sm',
              variant === error ? 'text-red-700' : 'text-yellow-700',
            ]"
          >
            {{ error }}
          </p>
          <div
            v-if="details && showDetails"
            class="mt-2"
          >
            <details class="text-xs text-gray-600">
              <summary class="cursor-pointer hover:text-gray-800">
                詳細情報
              </summary>
              <pre class="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto">{{ JSON.stringify(details, null, 2) }}</pre>
            </details>
          </div>
          <div
            v-if="action"
            class="mt-3"
          >
            <button
              type="button"
              :class="[
                'text-sm font-medium rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-offset-2',
                variant === 'error'
                  ? 'text-red-800 bg-red-100 hover:bg-red-200 focus:ring-red-500'
                  : 'text-yellow-800 bg-yellow-100 hover:bg-yellow-200 focus:ring-yellow-500',
              ]"
              @click="action.handler"
            >
              {{ action.label }}
            </button>
          </div>
        </div>
        <div
          v-if="dismissible"
          class="ml-auto pl-3"
        >
          <button
            type="button"
            :class="[
              'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
              variant === 'error'
                ? 'text-red-400 hover:bg-red-100 focus:ring-red-500'
                : 'text-yellow-400 hover:bg-yellow-100 focus:ring-yellow-500',
            ]"
            @click="$emit('dismiss')"
          >
            <span class="sr-only">閉じる</span>
            <svg
              class="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- バナー表示 -->
    <div
      v-else
      :class="[
        'border-l-4 p-4',
        variant === 'error' ? 'bg-red-50 border-red-400' : 'bg-yellow-50 border-yellow-400',
      ]"
    >
      <div class="flex">
        <div class="flex-shrink-0">
          <svg
            :class="[
              'h-5 w-5',
              variant === 'error' ? 'text-red-400' : 'text-yellow-400',
            ]"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              v-if="variant === 'error'"
              fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd"
            />
            <path
              v-else
              fill-rule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
        <div class="ml-3">
          <p
            :class="[
              'text-sm',
              variant === 'error' ? 'text-red-700' : 'text-yellow-700',
            ]"
          >
            <span
              v-if="title"
              class="font-medium"
            >{{ title }}:</span>
            {{ error }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Props
interface Props {
  error?: string | null;
  title?: string;
  variant?: 'error' | 'warning';
  inline?: boolean;
  dismissible?: boolean;
  showDetails?: boolean;
  details?: Record<string, any>;
  action?: {
    label: string;
    handler: () => void;
  };
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  title: '',
  variant: 'error',
  inline: true,
  dismissible: false,
  showDetails: false,
  details: undefined,
  action: undefined,
});

// Emits
interface Emits {
  dismiss: [];
}

const emit = defineEmits<Emits>();
</script>

<style scoped>
.error-display {
  @apply w-full;
}

/* レスポンシブ対応 */
@media (max-width: 640px) {
  .error-display pre {
    @apply text-xs;
  }
}
</style>
</template>
