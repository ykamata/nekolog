<script setup lang="ts">
import { useSync } from '~/composables/useSync';

interface Props {
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

interface Emits {
  (e: 'sync-complete'): void;
}

const props = withDefaults(defineProps<Props>(), {
  size: 'medium',
  showLabel: true,
});

const emit = defineEmits<Emits>();

const { syncStatus, fetchAndUpdateLocalData } = useSync();
const isSyncing = ref(false);
const syncMessage = ref<string | null>(null);
const messageType = ref<'success' | 'error'>('success');

// 最終同期時刻を人間が読める形式に変換
const lastSyncText = computed(() => {
  if (!syncStatus.value.lastSync) return '未同期';

  const now = new Date();
  const lastSync = syncStatus.value.lastSync;
  const diffMs = now.getTime() - lastSync.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'たった今';
  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  return `${diffDays}日前`;
});

// 手動同期を実行
const handleSync = async () => {
  if (isSyncing.value || !syncStatus.value.isOnline) return;

  isSyncing.value = true;
  syncMessage.value = null;

  try {
    await fetchAndUpdateLocalData();
    messageType.value = 'success';
    syncMessage.value = 'データを同期しました';

    // 親コンポーネントに同期完了を通知
    emit('sync-complete');

    // 3秒後にメッセージを消す
    setTimeout(() => {
      syncMessage.value = null;
    }, 3000);
  }
  catch (error) {
    messageType.value = 'error';
    syncMessage.value = 'データの同期に失敗しました';
    console.error('同期エラー:', error);

    // 5秒後にメッセージを消す
    setTimeout(() => {
      syncMessage.value = null;
    }, 5000);
  }
  finally {
    isSyncing.value = false;
  }
};
</script>

<template>
  <div class="sync-button-container">
    <button
      type="button"
      class="sync-button"
      :class="[
        `sync-button--${size}`,
        { 'sync-button--syncing': isSyncing },
        { 'sync-button--offline': !syncStatus.isOnline },
      ]"
      :disabled="isSyncing || !syncStatus.isOnline"
      :title="syncStatus.isOnline ? '最新のデータに同期' : 'オフライン中は同期できません'"
      @click="handleSync"
    >
      <span
        class="sync-icon"
        :class="{ 'sync-icon--spinning': isSyncing }"
      >
        🔄
      </span>
      <span v-if="showLabel" class="sync-label">
        <span v-if="isSyncing">同期中...</span>
        <span v-else-if="!syncStatus.isOnline">オフライン</span>
        <span v-else>同期</span>
      </span>
    </button>

    <div v-if="showLabel && syncStatus.isOnline" class="sync-info">
      <span class="last-sync-time">最終同期: {{ lastSyncText }}</span>
    </div>

    <!-- 同期メッセージ -->
    <transition name="fade">
      <div
        v-if="syncMessage"
        class="sync-message"
        :class="`sync-message--${messageType}`"
      >
        <span class="sync-message-icon">
          {{ messageType === 'success' ? '✓' : '⚠️' }}
        </span>
        <span class="sync-message-text">{{ syncMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.sync-button-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.5rem;
  position: relative;
}

.sync-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.sync-button:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
}

.sync-button:active:not(:disabled) {
  transform: translateY(0);
}

.sync-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.sync-button--small {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
}

.sync-button--medium {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.sync-button--large {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}

.sync-button--syncing {
  background: #2196f3;
}

.sync-button--syncing:hover {
  background: #1976d2;
}

.sync-button--offline {
  background: #9e9e9e;
}

.sync-icon {
  font-size: 1.2em;
  display: inline-block;
  transition: transform 0.3s ease;
}

.sync-icon--spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sync-label {
  white-space: nowrap;
}

.sync-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: #666;
}

.last-sync-time {
  font-size: 0.75rem;
  color: #666;
}

.sync-message {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  white-space: nowrap;
}

.sync-message--success {
  background: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #4caf50;
}

.sync-message--error {
  background: #ffebee;
  color: #c62828;
  border: 1px solid #f44336;
}

.sync-message-icon {
  font-size: 1.2em;
}

.sync-message-text {
  flex: 1;
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .sync-button--medium {
    padding: 0.625rem 1rem;
  }

  .sync-message {
    left: 50%;
    transform: translateX(-50%);
    max-width: 90vw;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .sync-button {
    border: 2px solid currentColor;
  }

  .sync-message {
    border-width: 2px;
  }
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .sync-icon--spinning {
    animation: none;
  }

  .sync-button,
  .sync-icon,
  .fade-enter-active,
  .fade-leave-active {
    transition: none;
  }
}
</style>
