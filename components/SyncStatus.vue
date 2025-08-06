<template>
  <div class="sync-status">
    <!-- オンライン/オフライン状態表示 -->
    <div
      class="flex items-center gap-2 p-3 rounded-lg border"
      :class="statusClasses"
    >
      <div class="flex items-center gap-2">
        <!-- 接続状態アイコン -->
        <div
          class="w-3 h-3 rounded-full"
          :class="indicatorClasses"
        />

        <!-- 状態テキスト -->
        <span class="text-sm font-medium">
          {{ statusText }}
        </span>
      </div>

      <!-- 同期中スピナー -->
      <div
        v-if="syncStatus.isSyncing"
        class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"
      />

      <!-- 手動同期ボタン -->
      <button
        v-if="
          syncStatus.isOnline
            && !syncStatus.isSyncing
            && syncStatus.pendingCount > 0
        "
        data-testid="manual-sync-button"
        class="ml-auto px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        @click="handleManualSync"
      >
        同期実行
      </button>
    </div>

    <!-- 詳細情報 -->
    <div
      v-if="showDetails"
      class="mt-2 p-3 bg-gray-50 rounded-lg text-sm space-y-2"
    >
      <!-- 最後の同期時刻 -->
      <div
        v-if="syncStatus.lastSync"
        class="flex justify-between"
      >
        <span class="text-gray-600">最後の同期:</span>
        <span>{{ formatDate(syncStatus.lastSync) }}</span>
      </div>

      <!-- 同期待ちデータ数 -->
      <div
        v-if="syncStatus.pendingCount > 0"
        class="flex justify-between"
      >
        <span class="text-gray-600">同期待ち:</span>
        <span class="font-medium text-orange-600">{{ syncStatus.pendingCount }}件</span>
      </div>

      <!-- エラー表示 -->
      <div
        v-if="syncStatus.error"
        class="text-red-600"
      >
        <span class="font-medium">エラー:</span>
        {{ syncStatus.error }}
      </div>

      <!-- 競合表示 -->
      <div
        v-if="syncStatus.conflicts.length > 0"
        class="text-yellow-600"
      >
        <span class="font-medium">競合:</span>
        {{ syncStatus.conflicts.length }}件の競合があります
        <button
          data-testid="resolve-conflicts-button"
          class="ml-2 text-blue-600 hover:underline"
          @click="showConflictDialog = true"
        >
          解決する
        </button>
      </div>
    </div>

    <!-- 詳細表示切り替えボタン -->
    <button
      data-testid="toggle-details-button"
      class="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors"
      @click="showDetails = !showDetails"
    >
      {{ showDetails ? "詳細を隠す" : "詳細を表示" }}
    </button>

    <!-- 競合解決ダイアログ -->
    <div
      v-if="showConflictDialog"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showConflictDialog = false"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 class="text-lg font-semibold mb-4">
          データ競合の解決
        </h3>

        <div
          v-if="syncStatus.conflicts.length > 0"
          class="space-y-4"
        >
          <div
            v-for="(conflict, index) in syncStatus.conflicts"
            :key="`${conflict.type}-${conflict.localId}-${conflict.serverId}`"
            class="border rounded-lg p-4"
          >
            <h4 class="font-medium mb-2">
              {{ getConflictTitle(conflict) }}
            </h4>

            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <h5 class="font-medium text-blue-600 mb-1">
                  ローカル版
                </h5>
                <pre class="bg-blue-50 p-2 rounded text-xs overflow-auto">{{
                  JSON.stringify(conflict.localData, null, 2)
                }}</pre>
                <button
                  data-testid="resolve-local-button"
                  class="mt-2 w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  @click="handleResolveConflict(conflict, true)"
                >
                  この版を使用
                </button>
              </div>

              <div>
                <h5 class="font-medium text-green-600 mb-1">
                  サーバー版
                </h5>
                <pre class="bg-green-50 p-2 rounded text-xs overflow-auto">{{
                  JSON.stringify(conflict.serverData, null, 2)
                }}</pre>
                <button
                  data-testid="resolve-server-button"
                  class="mt-2 w-full px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                  @click="handleResolveConflict(conflict, false)"
                >
                  この版を使用
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-2">
          <button
            data-testid="close-dialog-button"
            class="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            @click="showConflictDialog = false"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useSync } from '~/composables/useSync';
import type { SyncConflict } from '~/utils/offline-storage';

interface Props {
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
});

const { syncStatus, manualSync, resolveConflict } = useSync();

const showDetails = ref(!props.compact);
const showConflictDialog = ref(false);

// 状態に応じたスタイルクラス
const statusClasses = computed(() => {
  if (!syncStatus.value.isOnline) {
    return 'bg-red-50 border-red-200 text-red-800';
  }
  if (syncStatus.value.isSyncing) {
    return 'bg-blue-50 border-blue-200 text-blue-800';
  }
  if (syncStatus.value.pendingCount > 0) {
    return 'bg-orange-50 border-orange-200 text-orange-800';
  }
  if (syncStatus.value.conflicts.length > 0) {
    return 'bg-yellow-50 border-yellow-200 text-yellow-800';
  }
  return 'bg-green-50 border-green-200 text-green-800';
});

const indicatorClasses = computed(() => {
  if (!syncStatus.value.isOnline) {
    return 'bg-red-500';
  }
  if (syncStatus.value.isSyncing) {
    return 'bg-blue-500 animate-pulse';
  }
  if (syncStatus.value.pendingCount > 0) {
    return 'bg-orange-500';
  }
  if (syncStatus.value.conflicts.length > 0) {
    return 'bg-yellow-500';
  }
  return 'bg-green-500';
});

const statusText = computed(() => {
  if (!syncStatus.value.isOnline) {
    return 'オフライン';
  }
  if (syncStatus.value.isSyncing) {
    return '同期中...';
  }
  if (syncStatus.value.pendingCount > 0) {
    return `同期待ち (${syncStatus.value.pendingCount}件)`;
  }
  if (syncStatus.value.conflicts.length > 0) {
    return `競合あり (${syncStatus.value.conflicts.length}件)`;
  }
  return 'オンライン・同期済み';
});

// 手動同期の実行
const handleManualSync = async () => {
  try {
    const result = await manualSync();
    if (result.success) {
      // 成功通知（必要に応じて）
      console.log(`同期完了: ${result.syncedCount}件`);
    }
    else {
      console.error('同期エラー:', result.error);
    }
  }
  catch (error) {
    console.error('同期実行エラー:', error);
  }
};

// 競合解決
const handleResolveConflict = async (
  conflict: SyncConflict,
  useLocal: boolean,
) => {
  try {
    await resolveConflict(conflict, useLocal);

    // 競合が全て解決されたらダイアログを閉じる
    if (syncStatus.value.conflicts.length === 0) {
      showConflictDialog.value = false;
    }
  }
  catch (error) {
    console.error('競合解決エラー:', error);
  }
};

// 競合のタイトルを取得
const getConflictTitle = (conflict: SyncConflict): string => {
  const typeNames: Record<string, string> = {
    cat: '猫',
    food: 'フード',
    meal: '食事記録',
    medication: '薬',
    medicationRecord: '薬記録',
    medicationSchedule: '薬スケジュール',
    medicationReminder: '薬リマインダー',
  };
  return `${typeNames[conflict.type] || conflict.type}の競合 (${conflict.field})`;
};

// 日付フォーマット
const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};
</script>

<style scoped>
.sync-status {
  @apply font-sans;
}

/* アニメーション */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
