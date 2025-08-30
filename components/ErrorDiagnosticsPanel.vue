<template>
  <div
    v-if="isDebugMode"
    class="mt-4 border border-red-300 rounded-lg bg-red-50"
  >
    <button
      class="w-full px-4 py-2 text-left text-sm font-medium text-red-700 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded-t-lg"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center justify-between">
        <span>🚨 エラー診断 ({{ errorStats.total }}件)</span>
        <div class="flex items-center gap-2">
          <span
            v-if="errorStats.critical > 0"
            class="px-2 py-1 bg-red-600 text-white text-xs rounded"
          >
            重要: {{ errorStats.critical }}
          </span>
          <span
            v-if="errorStats.unresolved > 0"
            class="px-2 py-1 bg-yellow-600 text-white text-xs rounded"
          >
            未解決: {{ errorStats.unresolved }}
          </span>
          <svg
            :class="{ 'rotate-180': isExpanded }"
            class="w-4 h-4 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </button>

    <div
      v-if="isExpanded"
      class="p-4 border-t border-red-200"
    >
      <!-- エラー統計 -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-red-800 mb-2">
          統計情報
        </h4>
        <div class="bg-white p-3 rounded border text-xs">
          <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <span class="font-medium">総エラー数:</span>
              <span class="ml-1">{{ errorStats.total }}</span>
            </div>
            <div>
              <span class="font-medium">重要:</span>
              <span class="ml-1 text-red-600">{{ errorStats.critical }}</span>
            </div>
            <div>
              <span class="font-medium">警告:</span>
              <span class="ml-1 text-yellow-600">{{ errorStats.warnings }}</span>
            </div>
            <div>
              <span class="font-medium">情報:</span>
              <span class="ml-1 text-blue-600">{{ errorStats.info }}</span>
            </div>
            <div>
              <span class="font-medium">解決済み:</span>
              <span class="ml-1 text-green-600">{{ errorStats.resolved }}</span>
            </div>
            <div>
              <span class="font-medium">未解決:</span>
              <span class="ml-1 text-red-600">{{ errorStats.unresolved }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 重要なエラー -->
      <div
        v-if="criticalErrors.length > 0"
        class="mb-4"
      >
        <h4 class="text-sm font-semibold text-red-800 mb-2">
          🔥 重要なエラー
        </h4>
        <div class="bg-white rounded border">
          <div
            v-for="error in criticalErrors"
            :key="error.id"
            class="p-3 border-b border-red-100 last:border-b-0"
          >
            <div class="flex items-start justify-between mb-2">
              <div>
                <span class="font-medium text-red-700">{{ getErrorTypeLabel(error.type) }}</span>
                <span class="ml-2 text-xs text-gray-500">{{ formatTimestamp(error.timestamp) }}</span>
              </div>
              <button
                class="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                @click="markErrorResolved(error.id)"
              >
                解決済み
              </button>
            </div>
            <div class="text-sm text-gray-700 mb-2">
              {{ error.message }}
            </div>
            <div class="text-xs">
              <details>
                <summary class="cursor-pointer text-red-600 hover:text-red-800">
                  トラブルシューティング
                </summary>
                <div class="mt-2 p-2 bg-red-50 rounded">
                  <ol class="list-decimal list-inside space-y-1">
                    <li
                      v-for="step in getTroubleshootingGuide(error.type)"
                      :key="step"
                      class="text-xs"
                    >
                      {{ step }}
                    </li>
                  </ol>
                </div>
              </details>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近のエラー -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-red-800 mb-2">
          最近のエラー (最新10件)
        </h4>
        <div class="bg-white rounded border max-h-64 overflow-y-auto">
          <div
            v-for="error in recentErrors"
            :key="error.id"
            :class="{ 'opacity-50': error.resolved }"
            class="p-2 border-b border-gray-100 last:border-b-0 text-xs hover:bg-gray-50"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span
                  :class="getCategoryClass(error.category)"
                  class="px-1 py-0.5 rounded text-xs font-medium"
                >
                  {{ getCategoryLabel(error.category) }}
                </span>
                <span class="font-medium">{{ getErrorTypeLabel(error.type) }}</span>
                <span
                  v-if="error.resolved"
                  class="text-green-600"
                >✓</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-gray-500">{{ formatTimestamp(error.timestamp) }}</span>
                <button
                  v-if="!error.resolved"
                  class="px-1 py-0.5 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                  @click="markErrorResolved(error.id)"
                >
                  解決
                </button>
              </div>
            </div>
            <div class="text-gray-700 mb-1">
              {{ error.message }}
            </div>

            <!-- 提案 -->
            <div
              v-if="error.suggestions && error.suggestions.length > 0"
              class="mb-2"
            >
              <details>
                <summary class="cursor-pointer text-blue-600 hover:text-blue-800">
                  提案 ({{ error.suggestions.length }}件)
                </summary>
                <ul class="mt-1 ml-4 list-disc text-xs space-y-1">
                  <li
                    v-for="suggestion in error.suggestions"
                    :key="suggestion"
                  >
                    {{ suggestion }}
                  </li>
                </ul>
              </details>
            </div>

            <!-- 詳細情報 -->
            <details>
              <summary class="cursor-pointer text-gray-600 hover:text-gray-800">
                詳細
              </summary>
              <div class="mt-2 p-2 bg-gray-50 rounded text-xs">
                <div
                  v-if="error.stack"
                  class="mb-2"
                >
                  <span class="font-medium">スタックトレース:</span>
                  <pre class="mt-1 text-xs bg-white p-1 rounded max-h-20 overflow-auto">{{ error.stack }}</pre>
                </div>
                <div
                  v-if="error.context"
                  class="mb-2"
                >
                  <span class="font-medium">コンテキスト:</span>
                  <pre class="mt-1 text-xs bg-white p-1 rounded max-h-20 overflow-auto">{{ JSON.stringify(error.context, null, 2) }}</pre>
                </div>
                <div v-if="error.userAgent">
                  <span class="font-medium">ユーザーエージェント:</span>
                  <div class="text-xs text-gray-600">
                    {{ error.userAgent }}
                  </div>
                </div>
              </div>
            </details>
          </div>

          <div
            v-if="recentErrors.length === 0"
            class="p-4 text-center text-gray-500 text-sm"
          >
            エラーログがありません
          </div>
        </div>
      </div>

      <!-- システム診断情報 -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-red-800 mb-2">
          システム診断
        </h4>
        <div class="bg-white p-3 rounded border text-xs">
          <details>
            <summary class="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              診断情報を表示
            </summary>
            <div class="mt-2 space-y-2">
              <div>
                <span class="font-medium">ブラウザ:</span>
                <span class="ml-1">{{ diagnosticInfo.browserInfo.userAgent }}</span>
              </div>
              <div>
                <span class="font-medium">画面サイズ:</span>
                <span class="ml-1">{{ diagnosticInfo.screenInfo.width }}x{{ diagnosticInfo.screenInfo.height }}</span>
              </div>
              <div>
                <span class="font-medium">オンライン:</span>
                <span class="ml-1">{{ diagnosticInfo.browserInfo.onLine ? 'はい' : 'いいえ' }}</span>
              </div>
              <div v-if="diagnosticInfo.memoryInfo">
                <span class="font-medium">メモリ使用量:</span>
                <span class="ml-1">{{ formatMemory(diagnosticInfo.memoryInfo.usedJSHeapSize) }} / {{ formatMemory(diagnosticInfo.memoryInfo.jsHeapSizeLimit) }}</span>
              </div>
            </div>
          </details>
        </div>
      </div>

      <!-- アクション -->
      <div class="flex flex-wrap gap-2">
        <button
          class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          @click="clearLogs"
        >
          ログクリア
        </button>
        <button
          class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="exportLogs"
        >
          エクスポート
        </button>
        <button
          class="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
          @click="runDiagnostics"
        >
          診断実行
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  errorStats,
  recentErrors,
  criticalErrors,
  isDebugMode,
  markErrorResolved,
  clearErrorLogs,
  exportErrorLogs,
  getTroubleshootingGuide,
  getDiagnosticInfo,
} = useErrorDiagnostics();

const isExpanded = ref(false);
const diagnosticInfo = ref(getDiagnosticInfo());

// エラータイプのラベル
const getErrorTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    chart_init_failed: 'チャート初期化失敗',
    chart_render_failed: 'チャートレンダリング失敗',
    data_fetch_failed: 'データ取得失敗',
    data_processing_failed: 'データ処理失敗',
    canvas_not_found: 'Canvas要素未発見',
    memory_leak: 'メモリリーク',
    performance_degradation: 'パフォーマンス低下',
    network_error: 'ネットワークエラー',
    validation_error: 'バリデーションエラー',
    unknown_error: '不明なエラー',
  };
  return labels[type] || type;
};

// カテゴリのラベル
const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    critical: '重要',
    warning: '警告',
    info: '情報',
  };
  return labels[category] || category;
};

// カテゴリのクラス
const getCategoryClass = (category: string): string => {
  const classes: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
  };
  return classes[category] || 'bg-gray-100 text-gray-800';
};

// メモリ使用量のフォーマット
const formatMemory = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

// タイムスタンプのフォーマット
const formatTimestamp = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

// ログをクリア
const clearLogs = () => {
  clearErrorLogs();
};

// ログをエクスポート
const exportLogs = () => {
  exportErrorLogs();
};

// 診断を実行
const runDiagnostics = () => {
  diagnosticInfo.value = getDiagnosticInfo();
};

// 定期的に診断情報を更新
onMounted(() => {
  if (isDebugMode.value) {
    const interval = setInterval(() => {
      diagnosticInfo.value = getDiagnosticInfo();
    }, 30000); // 30秒ごと

    onUnmounted(() => {
      clearInterval(interval);
    });
  }
});
</script>
