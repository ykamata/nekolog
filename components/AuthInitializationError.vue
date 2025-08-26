<script setup lang="ts">
// 認証初期化エラー表示コンポーネント

interface Props {
  error: string;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  retry: [];
}>();

// エラーの種類に応じた復旧方法を提供
const errorInfo = computed(() => {
  const error = props.error.toLowerCase();

  if (error.includes('ネットワーク') || error.includes('network')) {
    return {
      type: 'network',
      title: 'ネットワーク接続エラー',
      description: 'インターネット接続に問題があります',
      suggestions: [
        'インターネット接続を確認してください',
        'Wi-Fiまたはモバイルデータ接続を確認してください',
        'しばらく待ってから再試行してください',
      ],
      icon: '🌐',
    };
  }

  if (error.includes('タイムアウト') || error.includes('timeout')) {
    return {
      type: 'timeout',
      title: '接続タイムアウト',
      description: 'サーバーへの接続に時間がかかりすぎています',
      suggestions: [
        'ネットワーク接続を確認してください',
        'しばらく待ってから再試行してください',
        'ページを再読み込みしてください',
      ],
      icon: '⏱️',
    };
  }

  if (error.includes('サーバー') || error.includes('server')) {
    return {
      type: 'server',
      title: 'サーバーエラー',
      description: 'サーバーで一時的な問題が発生しています',
      suggestions: [
        'しばらく待ってから再試行してください',
        '問題が続く場合は管理者にお問い合わせください',
      ],
      icon: '🔧',
    };
  }

  // デフォルトのエラー情報
  return {
    type: 'general',
    title: '認証エラー',
    description: '認証の初期化に失敗しました',
    suggestions: [
      'ページを再読み込みしてください',
      'ブラウザのキャッシュをクリアしてください',
      '問題が続く場合は再度ログインしてください',
    ],
    icon: '⚠️',
  };
});

// 再試行ボタンのハンドラ
const handleRetry = () => {
  emit('retry');
};

// ページリロードのハンドラ
const handleReload = () => {
  if (import.meta.client) {
    window.location.reload();
  }
};

// ログインページへの移動
const goToLogin = () => {
  navigateTo('/login');
};
</script>

<template>
  <div class="auth-error-overlay">
    <div class="auth-error-container">
      <!-- エラーアイコン -->
      <div class="error-icon">
        {{ errorInfo.icon }}
      </div>

      <!-- エラータイトル -->
      <h2 class="error-title">
        {{ errorInfo.title }}
      </h2>

      <!-- エラー説明 -->
      <p class="error-description">
        {{ errorInfo.description }}
      </p>

      <!-- 詳細エラーメッセージ -->
      <details class="error-details">
        <summary class="error-details-summary">
          詳細情報を表示
        </summary>
        <div class="error-details-content">
          <code class="error-message">{{ error }}</code>
        </div>
      </details>

      <!-- 復旧方法の提案 -->
      <div class="error-suggestions">
        <h3 class="suggestions-title">
          解決方法:
        </h3>
        <ul class="suggestions-list">
          <li
            v-for="(suggestion, index) in errorInfo.suggestions"
            :key="index"
            class="suggestion-item"
          >
            {{ suggestion }}
          </li>
        </ul>
      </div>

      <!-- アクションボタン -->
      <div class="error-actions">
        <button
          type="button"
          class="action-button action-button--primary"
          @click="handleRetry"
        >
          <span class="button-icon">🔄</span>
          再試行
        </button>

        <button
          type="button"
          class="action-button action-button--secondary"
          @click="handleReload"
        >
          <span class="button-icon">↻</span>
          ページを再読み込み
        </button>

        <button
          type="button"
          class="action-button action-button--tertiary"
          @click="goToLogin"
        >
          <span class="button-icon">🔑</span>
          ログインページへ
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-error-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  padding: 1rem;
}

.auth-error-container {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 480px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
}

.error-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  display: block;
}

.error-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #d32f2f;
  margin: 0 0 1rem 0;
  line-height: 1.3;
}

.error-description {
  font-size: 1rem;
  color: #666;
  margin: 0 0 1.5rem 0;
  line-height: 1.5;
}

.error-details {
  margin: 1.5rem 0;
  text-align: left;
}

.error-details-summary {
  font-size: 0.9rem;
  color: #666;
  cursor: pointer;
  padding: 0.5rem;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #f8f9fa;
  transition: all 0.2s ease;
}

.error-details-summary:hover {
  background: #e9ecef;
}

.error-details-content {
  margin-top: 0.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
}

.error-message {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.8rem;
  color: #d32f2f;
  word-break: break-all;
  white-space: pre-wrap;
}

.error-suggestions {
  text-align: left;
  margin: 1.5rem 0;
  padding: 1rem;
  background: #f0f7ff;
  border: 1px solid #bbdefb;
  border-radius: 8px;
}

.suggestions-title {
  font-size: 1rem;
  font-weight: 600;
  color: #1976d2;
  margin: 0 0 0.75rem 0;
}

.suggestions-list {
  margin: 0;
  padding-left: 1.25rem;
  list-style-type: disc;
}

.suggestion-item {
  font-size: 0.9rem;
  color: #333;
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.suggestion-item:last-child {
  margin-bottom: 0;
}

.error-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 2rem;
}

.action-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-button--primary {
  background: #2e7d32;
  color: white;
}

.action-button--primary:hover {
  background: #1b5e20;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
}

.action-button--secondary {
  background: #1976d2;
  color: white;
}

.action-button--secondary:hover {
  background: #1565c0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(25, 118, 210, 0.3);
}

.action-button--tertiary {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
}

.action-button--tertiary:hover {
  background: #e0e0e0;
  border-color: #bbb;
}

.button-icon {
  font-size: 1.1rem;
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
  .auth-error-container {
    background: #2e2e2e;
    color: #fff;
  }

  .error-title {
    color: #ff6b6b;
  }

  .error-description {
    color: #ccc;
  }

  .error-details-summary {
    background: #3e3e3e;
    border-color: #555;
    color: #ccc;
  }

  .error-details-summary:hover {
    background: #4e4e4e;
  }

  .error-details-content {
    background: #3e3e3e;
    border-color: #555;
  }

  .error-message {
    color: #ff6b6b;
  }

  .error-suggestions {
    background: #1a2332;
    border-color: #2196f3;
  }

  .suggestions-title {
    color: #64b5f6;
  }

  .suggestion-item {
    color: #ccc;
  }

  .action-button--tertiary {
    background: #3e3e3e;
    color: #ccc;
    border-color: #555;
  }

  .action-button--tertiary:hover {
    background: #4e4e4e;
    border-color: #666;
  }
}

/* 高コントラストモード対応 */
@media (prefers-contrast: high) {
  .auth-error-container {
    border: 2px solid #000;
  }

  .action-button {
    border: 2px solid currentColor;
  }
}

/* モバイル対応 */
@media (max-width: 480px) {
  .auth-error-overlay {
    padding: 0.5rem;
  }

  .auth-error-container {
    padding: 1.5rem;
    border-radius: 8px;
  }

  .error-icon {
    font-size: 3rem;
  }

  .error-title {
    font-size: 1.25rem;
  }

  .error-description {
    font-size: 0.9rem;
  }

  .error-actions {
    gap: 0.5rem;
  }

  .action-button {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}

/* モーション削減対応 */
@media (prefers-reduced-motion: reduce) {
  .action-button:hover {
    transform: none;
  }

  * {
    transition: none !important;
  }
}
</style>
