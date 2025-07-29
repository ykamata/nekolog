<script setup lang="ts">
import { ref, computed, provide, onErrorCaptured } from 'vue';
import { parseApiError, getUserFriendlyErrorMessage, isRetryableError } from '~/utils/error-handling';

interface Props {
  fallback?: boolean;
  showRetry?: boolean;
  context?: string;
}

interface Emits {
  (e: 'retry'): void;
  (e: 'error', error: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  fallback: true,
  showRetry: true,
  context: 'アプリケーション',
});

const emit = defineEmits<Emits>();

const error = ref<any>(null);
const isRetrying = ref(false);

// Error handler
const handleError = (err: any) => {
  error.value = err;
  emit('error', err);
  console.error(`[ErrorBoundary:${props.context}]`, err);
};

// Retry handler
const handleRetry = async () => {
  if (isRetrying.value) return;

  isRetrying.value = true;
  try {
    error.value = null;
    emit('retry');
  }
  finally {
    isRetrying.value = false;
  }
};

// Clear error
const clearError = () => {
  error.value = null;
};

// Computed properties
const parsedError = computed(() => {
  if (!error.value) return null;
  return parseApiError(error.value);
});

const errorMessage = computed(() => {
  if (!parsedError.value) return '';
  return getUserFriendlyErrorMessage(parsedError.value, props.context);
});

const canRetry = computed(() => {
  if (!parsedError.value) return false;
  return props.showRetry && isRetryableError(parsedError.value);
});

const isDevelopment = computed(() => {
  return import.meta.dev;
});

// Provide error handler to child components
provide('errorHandler', handleError);
provide('clearError', clearError);

// Global error handler
onErrorCaptured((err) => {
  handleError(err);
  return false; // Prevent error from propagating
});
</script>

<template>
  <div class="error-boundary">
    <!-- Error state -->
    <div
      v-if="error && fallback"
      class="error-fallback"
    >
      <div class="error-content">
        <div class="error-icon">
          <svg
            class="w-12 h-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h3 class="error-title">
          エラーが発生しました
        </h3>

        <p class="error-message">
          {{ errorMessage }}
        </p>

        <div class="error-actions">
          <button
            v-if="canRetry"
            :disabled="isRetrying"
            class="btn btn--primary"
            @click="handleRetry"
          >
            {{ isRetrying ? '再試行中...' : '再試行' }}
          </button>

          <button
            class="btn btn--secondary"
            @click="clearError"
          >
            閉じる
          </button>
        </div>

        <!-- Error details (development only) -->
        <details
          v-if="isDevelopment && parsedError"
          class="error-details"
        >
          <summary class="error-details-summary">
            エラー詳細 (開発用)
          </summary>
          <pre class="error-details-content">{{ JSON.stringify(parsedError, null, 2) }}</pre>
        </details>
      </div>
    </div>

    <!-- Normal content -->
    <div
      v-else-if="!error"
      class="error-boundary-content"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.error-boundary {
  width: 100%;
  height: 100%;
}

.error-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background-color: #fafafa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.error-content {
  text-align: center;
  max-width: 500px;
}

.error-icon {
  margin: 0 auto 1.5rem;
  display: flex;
  justify-content: center;
}

.error-title {
  margin: 0 0 1rem 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #333;
}

.error-message {
  margin: 0 0 2rem 0;
  color: #666;
  line-height: 1.6;
}

.error-actions {
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn--primary {
  background-color: #4caf50;
  color: white;
}

.btn--primary:hover:not(:disabled) {
  background-color: #388e3c;
}

.btn--secondary {
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.btn--secondary:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.error-details {
  margin-top: 2rem;
  text-align: left;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f8f9fa;
}

.error-details-summary {
  padding: 1rem;
  cursor: pointer;
  font-weight: 500;
  border-bottom: 1px solid #ddd;
}

.error-details-summary:hover {
  background-color: #e9ecef;
}

.error-details-content {
  padding: 1rem;
  margin: 0;
  font-size: 0.875rem;
  color: #666;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-boundary-content {
  width: 100%;
  height: 100%;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .error-fallback {
    min-height: 300px;
    padding: 1rem;
  }

  .error-actions {
    flex-direction: column;
  }

  .btn {
    width: 100%;
  }
}
</style>
