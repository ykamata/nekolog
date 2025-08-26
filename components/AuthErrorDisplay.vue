<script setup lang="ts">
// 認証エラー表示コンポーネント
// 詳細なエラー情報と復旧方法を提供

import { getAuthErrorInfo, getRecoveryActions, getErrorSeverity } from '~/utils/auth-error-messages';

interface Props {
  error: string | null;
  showDetails?: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  error: null,
  showDetails: false,
  compact: false,
});

const emit = defineEmits<{
  retry: [];
  clearError: [];
  action: [actionType: string];
}>();

// エラー情報を取得
const errorInfo = computed(() => {
  if (!props.error) return null;
  return getAuthErrorInfo(props.error);
});

// 復旧アクションを取得
const recoveryActions = computed(() => {
  if (!errorInfo.value) return [];
  return getRecoveryActions(errorInfo.value);
});

// エラーの重要度を取得
const errorSeverity = computed(() => {
  if (!errorInfo.value) return 'low';
  return getErrorSeverity(errorInfo.value);
});

// 詳細表示の切り替え
const showDetailsLocal = ref(props.showDetails);

// アクションハンドラ
const handleAction = (actionType: string) => {
  switch (actionType) {
    case 'retry':
      emit('retry');
      break;
    case 'reload':
      if (import.meta.client) {
        window.location.reload();
      }
      break;
    case 'login':
      navigateTo('/login');
      break;
    case 'clear_cache':
      if (import.meta.client) {
        // ローカルストレージとセッションストレージをクリア
        localStorage.clear();
        sessionStorage.clear();
        // ページをリロード
        window.location.reload();
      }
      break;
    case 'contact_support':
      // サポートページまたはメール送信
      if (import.meta.client) {
        window.open('mailto:support@example.com?subject=認証エラーのサポート', '_blank');
      }
      break;
    default:
      emit('action', actionType);
  }
};

// エラーをクリア
const handleClearError = () => {
  emit('clearError');
};

// 詳細表示の切り替え
const toggleDetails = () => {
  showDetailsLocal.value = !showDetailsLocal.value;
};
</script>

<template>
  <div
    v-if="error && errorInfo"
    class="auth-error-display"
    :class="[
      `auth-error-display--${errorSeverity}`,
      { 'auth-error-display--compact': compact },
    ]"
    role="alert"
    aria-live="polite"
  >
    <!-- エラーヘッダー -->
    <div class="error-header">
      <div class="error-icon">
        {{ errorInfo.icon }}
      </div>

      <div class="error-content">
        <h3 class="error-title">
          {{ errorInfo.title }}
        </h3>

        <p class="error-message">
          {{ errorInfo.userMessage }}
        </p>
      </div>

      <!-- 閉じるボタン -->
      <button
        type="button"
        class="error-close"
        aria-label="エラーを閉じる"
        @click="handleClearError"
      >
        ✕
      </button>
    </div>

    <!-- 詳細情報（展開可能） -->
    <div
      v-if="!compact"
      class="error-details"
    >
      <button
        type="button"
        class="details-toggle"
        :aria-expanded="showDetailsLocal"
        @click="toggleDetails"
      >
        <span class="toggle-icon">
          {{ showDetailsLocal ? '▼' : '▶' }}
        </span>
        詳細情報を{{ showDetailsLocal ? '非表示' : '表示' }}
      </button>

      <Transition name="details">
        <div
          v-if="showDetailsLocal"
          class="details-content"
        >
          <!-- 復旧方法の提案 -->
          <div class="error-suggestions">
            <h4 class="suggestions-title">
              解決方法:
            </h4>
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

          <!-- 技術的な詳細 -->
          <details class="technical-details">
            <summary class="technical-summary">
              技術的な詳細
            </summary>
            <div class="technical-content">
              <div class="detail-item">
                <span class="detail-label">エラータイプ:</span>
                <span class="detail-value">{{ errorInfo.type }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">詳細メッセージ:</span>
                <code class="detail-code">{{ errorInfo.message }}</code>
              </div>
              <div class="detail-item">
                <span class="detail-label">再試行可能:</span>
                <span class="detail-value">{{ errorInfo.canRetry ? 'はい' : 'いいえ' }}</span>
              </div>
            </div>
          </details>
        </div>
      </Transition>
    </div>

    <!-- アクションボタン -->
    <div
      v-if="recoveryActions.length > 0"
      class="error-actions"
    >
      <button
        v-for="action in recoveryActions.slice(0, compact ? 2 : 4)"
        :key="action.type"
        type="button"
        class="action-button"
        :class="{ 'action-button--primary': action.primary }"
        :title="action.description"
        @click="handleAction(action.type)"
      >
        <span class="action-icon">{{ action.icon }}</span>
        <span class="action-label">{{ action.label }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.auth-error-display {
  background: #fff5f5;
  border: 1px solid #fed7d7;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.auth-error-display--low {
  background: #f0f9ff;
  border-color: #bae6fd;
}

.auth-error-display--medium {
  background: #fffbeb;
  border-color: #fed7aa;
}

.auth-error-display--high {
  background: #fff5f5;
  border-color: #fed7d7;
}

.auth-error-display--critical {
  background: #fef2f2;
  border-color: #fca5a5;
}

.auth-error-display--compact {
  padding: 0.75rem;
  margin: 0.5rem 0;
}

.error-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.error-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.error-content {
  flex: 1;
  min-width: 0;
}

.error-title {
  font-size: 1rem;
  font-weight: 600;
  color: #dc2626;
  margin: 0 0 0.25rem 0;
  line-height: 1.3;
}

.auth-error-display--low .error-title {
  color: #1d4ed8;
}

.auth-error-display--medium .error-title {
  color: #d97706;
}

.auth-error-display--high .error-title {
  color: #dc2626;
}

.auth-error-display--critical .error-title {
  color: #b91c1c;
}

.error-message {
  font-size: 0.9rem;
  color: #374151;
  margin: 0;
  line-height: 1.4;
}

.error-close {
  background: none;
  border: none;
  font-size: 1.25rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.error-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #374151;
}

.error-details {
  margin-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  padding-top: 1rem;
}

.details-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  font-size: 0.9rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem 0;
  transition: color 0.2s ease;
}

.details-toggle:hover {
  color: #374151;
}

.toggle-icon {
  font-size: 0.8rem;
  transition: transform 0.2s ease;
}

.details-content {
  margin-top: 1rem;
}

.error-suggestions {
  margin-bottom: 1rem;
}

.suggestions-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 0.5rem 0;
}

.suggestions-list {
  margin: 0;
  padding-left: 1.25rem;
  list-style-type: disc;
}

.suggestion-item {
  font-size: 0.85rem;
  color: #4b5563;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.technical-details {
  margin-top: 1rem;
}

.technical-summary {
  font-size: 0.85rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem 0;
}

.technical-content {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
  font-size: 0.8rem;
}

.detail-item {
  display: flex;
  margin-bottom: 0.25rem;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-weight: 600;
  color: #374151;
  min-width: 120px;
}

.detail-value {
  color: #4b5563;
}

.detail-code {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  background: rgba(0, 0, 0, 0.1);
  padding: 0.125rem 0.25rem;
  border-radius: 2px;
  font-size: 0.75rem;
  word-break: break-all;
}

.error-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
}

.action-button:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.action-button--primary {
  background: #3b82f6;
  border-color: #2563eb;
  color: white;
}

.action-button--primary:hover {
  background: #2563eb;
  border-color: #1d4ed8;
}

.action-icon {
  font-size: 1rem;
}

.action-label {
  font-weight: 500;
}

/* トランジション効果 */
.details-enter-active,
.details-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.details-enter-from,
.details-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.details-enter-to,
.details-leave-from {
  opacity: 1;
  max-height: 500px;
  transform: translateY(0);
}

/* モバイル対応 */
@media (max-width: 480px) {
  .auth-error-display {
    padding: 0.75rem;
    margin: 0.75rem 0;
  }

  .error-header {
    gap: 0.5rem;
  }

  .error-icon {
    font-size: 1.25rem;
  }

  .error-title {
    font-size: 0.9rem;
  }

  .error-message {
    font-size: 0.85rem;
  }

  .error-actions {
    flex-direction: column;
  }

  .action-button {
    justify-content: center;
    padding: 0.75rem;
  }
}
</style>
