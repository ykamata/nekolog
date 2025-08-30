<template>
  <div class="chart-error-display">
    <!-- Chart Rendering Error State -->
    <div
      v-if="error || chartError"
      class="error-container bg-red-50 border border-red-200 rounded-lg p-6 text-center"
      role="alert"
      aria-live="assertive"
    >
      <!-- Error Icon -->
      <div class="error-icon text-red-500 text-4xl mb-4">
        <svg
          class="w-12 h-12 mx-auto"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>

      <!-- Error Title -->
      <h3 class="error-title text-lg font-semibold text-red-800 mb-2">
        {{ errorTitle }}
      </h3>

      <!-- Error Message -->
      <p class="error-message text-red-700 mb-4">
        {{ displayErrorMessage }}
      </p>

      <!-- Error Details (Development Only) -->
      <div
        v-if="isDevelopment && errorInfo"
        class="error-details bg-red-100 rounded p-3 mb-4 text-left text-sm"
      >
        <details>
          <summary class="cursor-pointer font-medium text-red-800 mb-2">
            エラー詳細（開発環境）
          </summary>
          <div class="mt-2 space-y-1 text-red-700">
            <div><strong>コード:</strong> {{ errorInfo.code }}</div>
            <div><strong>重要度:</strong> {{ errorInfo.severity }}</div>
            <div><strong>時刻:</strong> {{ errorInfo.timestamp.toLocaleString() }}</div>
            <div><strong>リトライ可能:</strong> {{ errorInfo.retryable ? 'はい' : 'いいえ' }}</div>
            <div v-if="retryCount > 0">
              <strong>リトライ回数:</strong> {{ retryCount }}
            </div>
            <div v-if="errorInfo.context">
              <strong>コンテキスト:</strong>
              <pre class="mt-1 text-xs bg-red-200 p-2 rounded overflow-x-auto">{{ JSON.stringify(errorInfo.context, null, 2) }}</pre>
            </div>
          </div>
        </details>
      </div>

      <!-- Troubleshooting Guide -->
      <div
        v-if="troubleshootingSteps.length > 0"
        class="troubleshooting bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-left"
      >
        <h4 class="font-medium text-blue-800 mb-2">
          💡 トラブルシューティング
        </h4>
        <ul class="text-sm text-blue-700 space-y-1">
          <li
            v-for="(step, index) in troubleshootingSteps"
            :key="index"
            class="flex items-start gap-2"
          >
            <span class="font-medium">{{ index + 1 }}.</span>
            <span>{{ step }}</span>
          </li>
        </ul>
      </div>

      <!-- Error Actions -->
      <div class="error-actions flex flex-col sm:flex-row gap-2 justify-center">
        <!-- Retry Button -->
        <button
          v-if="canRetry"
          type="button"
          class="retry-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="isRetrying"
          @click="handleRetry"
        >
          <svg
            v-if="isRetrying"
            class="w-4 h-4 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <svg
            v-else
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span v-if="isRetrying">再試行中...</span>
          <span v-else-if="maxRetries && retryCount < maxRetries">
            再試行 ({{ retryCount + 1 }}/{{ maxRetries }})
          </span>
          <span v-else>再試行</span>
        </button>

        <!-- Clear Error Button -->
        <button
          type="button"
          class="clear-button px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
          @click="handleClear"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          閉じる
        </button>

        <!-- Reload Page Button (for critical errors) -->
        <button
          v-if="errorInfo?.severity === 'high'"
          type="button"
          class="reload-button px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2"
          @click="handleReload"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          ページを再読み込み
        </button>
      </div>

      <!-- Browser Compatibility Warning -->
      <div
        v-if="showBrowserWarning"
        class="browser-warning mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-left"
      >
        <h4 class="font-medium text-yellow-800 mb-2">
          ⚠️ ブラウザ互換性の問題
        </h4>
        <p class="text-sm text-yellow-700 mb-2">
          お使いのブラウザでグラフ機能が正常に動作しない可能性があります。
        </p>
        <p class="text-xs text-yellow-600">
          推奨ブラウザ: Safari、Chrome、Firefox の最新版
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ChartErrorInfo } from '~/composables/useChart';

interface Props {
  error?: string | null;
  chartError?: string | null;
  errorInfo?: ChartErrorInfo | null;
  canRetry?: boolean;
  isRetrying?: boolean;
  retryCount?: number;
  maxRetries?: number;
  context?: string;
}

interface Emits {
  (e: 'retry'): void;
  (e: 'clear'): void;
  (e: 'reload'): void;
}

const props = withDefaults(defineProps<Props>(), {
  canRetry: false,
  isRetrying: false,
  retryCount: 0,
  maxRetries: 3,
  context: 'グラフ',
});

const emit = defineEmits<Emits>();

// Computed properties
const isDevelopment = computed(() => import.meta.dev);

const errorTitle = computed(() => {
  if (props.errorInfo?.code) {
    switch (props.errorInfo.code) {
      case 'CANVAS_ERROR':
        return 'グラフ描画エラー';
      case 'CHARTJS_REGISTER_ERROR':
        return 'グラフライブラリエラー';
      case 'DATA_ERROR':
        return 'データエラー';
      case 'MEMORY_ERROR':
        return 'メモリ不足エラー';
      case 'RENDER_ERROR':
        return 'レンダリングエラー';
      default:
        return 'グラフエラー';
    }
  }
  return `${props.context}エラー`;
});

const displayErrorMessage = computed(() => {
  return props.error || props.chartError || 'グラフの表示中にエラーが発生しました。';
});

const troubleshootingSteps = computed(() => {
  const steps: string[] = [];

  if (props.errorInfo?.code) {
    switch (props.errorInfo.code) {
      case 'CANVAS_ERROR':
        steps.push('ページを再読み込みしてください');
        steps.push('ブラウザのキャッシュをクリアしてください');
        steps.push('他のタブを閉じてメモリを解放してください');
        break;
      case 'CHARTJS_REGISTER_ERROR':
        steps.push('ページを再読み込みしてください');
        steps.push('ブラウザが最新版かご確認ください');
        break;
      case 'DATA_ERROR':
        steps.push('データの入力内容を確認してください');
        steps.push('日付範囲を変更してみてください');
        break;
      case 'MEMORY_ERROR':
        steps.push('他のタブやアプリケーションを閉じてください');
        steps.push('表示期間を短くしてください');
        steps.push('ブラウザを再起動してください');
        break;
      case 'RENDER_ERROR':
        steps.push('しばらく待ってから再試行してください');
        steps.push('ページを再読み込みしてください');
        break;
      default:
        steps.push('ページを再読み込みしてください');
        steps.push('しばらく時間をおいて再試行してください');
    }
  }
  else {
    steps.push('ページを再読み込みしてください');
    steps.push('しばらく時間をおいて再試行してください');
  }

  return steps;
});

const showBrowserWarning = computed(() => {
  if (!import.meta.client) return false;

  // 古いブラウザや互換性の問題をチェック
  const userAgent = navigator.userAgent.toLowerCase();
  const isOldIE = userAgent.includes('msie') || userAgent.includes('trident');
  const versionPart = userAgent.split('version/')[1];
  const isOldSafari = userAgent.includes('safari') && !userAgent.includes('chrome')
    && userAgent.includes('version/')
    && versionPart && parseFloat(versionPart) < 14;

  return isOldIE || isOldSafari || !window.HTMLCanvasElement;
});

// Event handlers
const handleRetry = () => {
  emit('retry');
};

const handleClear = () => {
  emit('clear');
};

const handleReload = () => {
  if (import.meta.client) {
    window.location.reload();
  }
  emit('reload');
};
</script>

<style scoped>
.chart-error-display {
  width: 100%;
}

.error-container {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.error-actions {
  gap: 0.5rem;
}

.error-actions button {
  min-width: 120px;
}

.troubleshooting ul {
  list-style: none;
  padding: 0;
}

.browser-warning {
  font-size: 0.875rem;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .error-actions {
    flex-direction: column;
  }

  .error-actions button {
    width: 100%;
  }

  .error-details pre {
    font-size: 0.75rem;
  }
}

/* Animation for retry button */
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
