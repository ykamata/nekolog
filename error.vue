<script setup lang="ts">
import { navigateTo, useSeoMeta } from 'nuxt/app';

import { computed } from 'vue';

// Error page component for handling application errors
interface ErrorProps {
  error: {
    statusCode: number;
    statusMessage?: string;
    message?: string;
    stack?: string;
  };
}

const props = defineProps<ErrorProps>();

// Set page meta
useSeoMeta({
  title: `エラー ${props.error.statusCode} - 猫の健康管理`,
  description: 'アプリケーションでエラーが発生しました',
});

// Error handling
const errorTitle = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return 'ページが見つかりません';
    case 401:
      return '認証が必要です';
    case 403:
      return 'アクセスが拒否されました';
    case 500:
      return 'サーバーエラーが発生しました';
    default:
      return 'エラーが発生しました';
  }
});

const errorDescription = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return 'お探しのページは存在しないか、移動された可能性があります。';
    case 401:
      return 'このページにアクセスするにはログインが必要です。';
    case 403:
      return 'このページにアクセスする権限がありません。';
    case 500:
      return 'サーバーで問題が発生しました。しばらく時間をおいてから再度お試しください。';
    default:
      return props.error.statusMessage || props.error.message || '予期しないエラーが発生しました。';
  }
});

const errorIcon = computed(() => {
  switch (props.error.statusCode) {
    case 404:
      return '🔍';
    case 401:
      return '🔒';
    case 403:
      return '🚫';
    case 500:
      return '⚠️';
    default:
      return '❌';
  }
});

// Actions
const goHome = () => {
  navigateTo('/');
};

const goBack = () => {
  if (import.meta.client && window.history.length > 1) {
    window.history.back();
  }
  else {
    navigateTo('/');
  }
};

const goLogin = () => {
  navigateTo('/login');
};

const reload = () => {
  if (import.meta.client) {
    window.location.reload();
  }
};
</script>

<template>
  <div class="error-page">
    <div class="error-container">
      <!-- Error Icon -->
      <div class="error-icon">
        {{ errorIcon }}
      </div>

      <!-- Error Code -->
      <div class="error-code">
        {{ error.statusCode }}
      </div>

      <!-- Error Title -->
      <h1 class="error-title">
        {{ errorTitle }}
      </h1>

      <!-- Error Description -->
      <p class="error-description">
        {{ errorDescription }}
      </p>

      <!-- Actions -->
      <div class="error-actions">
        <button
          v-if="error.statusCode === 401"
          type="button"
          class="error-button error-button--primary"
          @click="goLogin"
        >
          ログインページへ
        </button>

        <button
          v-else-if="error.statusCode === 500"
          type="button"
          class="error-button error-button--primary"
          @click="reload"
        >
          ページを再読み込み
        </button>

        <button
          v-else
          type="button"
          class="error-button error-button--primary"
          @click="goHome"
        >
          ホームに戻る
        </button>

        <button
          type="button"
          class="error-button error-button--secondary"
          @click="goBack"
        >
          前のページに戻る
        </button>
      </div>

      <!-- Development Info -->
      <DevOnly>
        <div
          v-if="error.stack"
          class="error-debug"
        >
          <details class="error-details">
            <summary class="error-details-summary">
              開発者向け情報
            </summary>
            <pre class="error-stack">{{ error.stack }}</pre>
          </details>
        </div>
      </DevOnly>
    </div>

    <!-- Background Pattern -->
    <div class="error-background">
      <div class="error-pattern" />
    </div>
  </div>
</template>

<style scoped>
.error-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.error-container {
  max-width: 600px;
  width: 100%;
  text-align: center;
  background: white;
  border-radius: 16px;
  padding: 3rem 2rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 1;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  display: block;
}

.error-code {
  font-size: 6rem;
  font-weight: 900;
  color: #e53e3e;
  line-height: 1;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(229, 62, 62, 0.2);
}

.error-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2d3748;
  margin: 0 0 1rem 0;
  line-height: 1.2;
}

.error-description {
  font-size: 1.1rem;
  color: #4a5568;
  line-height: 1.6;
  margin: 0 0 2rem 0;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
}

.error-button {
  padding: 0.875rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 140px;
}

.error-button--primary {
  background: #4caf50;
  color: white;
  border-color: #4caf50;
}

.error-button--primary:hover {
  background: #45a049;
  border-color: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.error-button--secondary {
  background: white;
  color: #4a5568;
  border-color: #cbd5e0;
}

.error-button--secondary:hover {
  background: #f7fafc;
  border-color: #a0aec0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.error-debug {
  margin-top: 2rem;
  text-align: left;
}

.error-details {
  background: #f7fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
}

.error-details-summary {
  font-weight: 600;
  color: #4a5568;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background-color 0.2s ease;
}

.error-details-summary:hover {
  background: #edf2f7;
}

.error-stack {
  margin: 1rem 0 0 0;
  padding: 1rem;
  background: #2d3748;
  color: #e2e8f0;
  border-radius: 4px;
  font-size: 0.8rem;
  line-height: 1.4;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.error-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.error-pattern {
  width: 100%;
  height: 100%;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(76, 175, 80, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(229, 62, 62, 0.1) 0%, transparent 50%);
  background-size: 200px 200px;
  animation: float 20s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* Tablet Responsive */
@media (max-width: 768px) {
  .error-page {
    padding: 1rem;
  }

  .error-container {
    padding: 2rem 1.5rem;
  }

  .error-code {
    font-size: 4rem;
  }

  .error-title {
    font-size: 1.5rem;
  }

  .error-description {
    font-size: 1rem;
  }

  .error-actions {
    flex-direction: column;
    align-items: center;
  }

  .error-button {
    width: 100%;
    max-width: 300px;
  }
}

/* Mobile Responsive */
@media (max-width: 480px) {
  .error-container {
    padding: 1.5rem 1rem;
    border-radius: 8px;
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-code {
    font-size: 3rem;
  }

  .error-title {
    font-size: 1.3rem;
  }

  .error-description {
    font-size: 0.9rem;
  }

  .error-button {
    padding: 0.75rem 1.5rem;
    font-size: 0.9rem;
  }

  .error-stack {
    font-size: 0.7rem;
  }
}

/* High contrast mode support */
@media (prefers-contrast: high) {
  .error-container {
    border: 2px solid #333;
  }

  .error-button--primary {
    background: #000;
    border-color: #000;
  }

  .error-button--secondary {
    border-color: #333;
    color: #000;
  }

  .error-details {
    border-color: #333;
  }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .error-pattern {
    animation: none;
  }

  .error-button:hover {
    transform: none;
  }

  * {
    transition: none !important;
  }
}

/* Print styles */
@media print {
  .error-page {
    background: white;
  }

  .error-background {
    display: none;
  }

  .error-container {
    box-shadow: none;
    border: 1px solid #333;
  }

  .error-actions {
    display: none;
  }

  .error-debug {
    display: none;
  }
}
</style>
