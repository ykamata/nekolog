<template>
  <div
    v-if="isDebugMode"
    class="mt-4 border border-blue-300 rounded-lg bg-blue-50"
  >
    <button
      class="w-full px-4 py-2 text-left text-sm font-medium text-blue-700 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t-lg"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center justify-between">
        <span>📡 API監視 ({{ stats.totalCalls }}件)</span>
        <div class="flex items-center gap-2">
          <span
            :class="isMonitoring ? 'text-green-600' : 'text-red-600'"
            class="text-xs font-medium"
          >
            {{ isMonitoring ? '監視中' : '停止中' }}
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
      class="p-4 border-t border-blue-200"
    >
      <!-- 統計情報 -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-blue-800 mb-2">
          統計情報
        </h4>
        <div class="bg-white p-3 rounded border text-xs">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div>
              <span class="font-medium">総コール数:</span>
              <span class="ml-1">{{ stats.totalCalls }}</span>
            </div>
            <div>
              <span class="font-medium">成功:</span>
              <span class="ml-1 text-green-600">{{ stats.successfulCalls }}</span>
            </div>
            <div>
              <span class="font-medium">失敗:</span>
              <span class="ml-1 text-red-600">{{ stats.failedCalls }}</span>
            </div>
            <div>
              <span class="font-medium">平均応答時間:</span>
              <span class="ml-1">{{ formatTime(stats.averageResponseTime) }}</span>
            </div>
            <div class="col-span-2">
              <span class="font-medium">キャッシュヒット率:</span>
              <span class="ml-1">{{ stats.cacheHitRate.toFixed(1) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 進行中のAPIコール -->
      <div
        v-if="pendingApiCalls.length > 0"
        class="mb-4"
      >
        <h4 class="text-sm font-semibold text-blue-800 mb-2">
          進行中 ({{ pendingApiCalls.length }}件)
        </h4>
        <div class="bg-white rounded border max-h-32 overflow-y-auto">
          <div
            v-for="call in pendingApiCalls"
            :key="call.id"
            class="p-2 border-b border-gray-100 last:border-b-0 text-xs"
          >
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ call.method }} {{ call.url }}</span>
              <span class="text-yellow-600">{{ formatTime(Date.now() - call.startTime) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 最近のAPIコール -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-blue-800 mb-2">
          最近のコール (最新20件)
        </h4>
        <div class="bg-white rounded border max-h-64 overflow-y-auto">
          <div
            v-for="call in recentApiCalls"
            :key="call.id"
            class="p-2 border-b border-gray-100 last:border-b-0 text-xs hover:bg-gray-50"
          >
            <div class="flex items-center justify-between mb-1">
              <div class="flex items-center gap-2">
                <span class="font-medium">{{ call.method }}</span>
                <span class="text-gray-600">{{ call.url }}</span>
                <span
                  v-if="call.cacheHit"
                  class="px-1 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                >
                  キャッシュ
                </span>
              </div>
              <div class="flex items-center gap-2">
                <span
                  :class="getStatusClass(call.status)"
                  class="font-medium"
                >
                  {{ call.status || 'ERR' }}
                </span>
                <span class="text-gray-500">{{ formatTime(call.duration) }}</span>
              </div>
            </div>
            <div class="text-gray-500 text-xs">
              {{ formatTimestamp(call.timestamp) }}
            </div>

            <!-- 詳細情報（展開可能） -->
            <details class="mt-1">
              <summary class="cursor-pointer text-blue-600 hover:text-blue-800">
                詳細
              </summary>
              <div class="mt-2 p-2 bg-gray-50 rounded text-xs">
                <div
                  v-if="call.error"
                  class="mb-2"
                >
                  <span class="font-medium text-red-600">エラー:</span>
                  <div class="text-red-600">
                    {{ call.error }}
                  </div>
                </div>
                <div
                  v-if="call.requestHeaders"
                  class="mb-2"
                >
                  <span class="font-medium">リクエストヘッダー:</span>
                  <pre class="mt-1 text-xs bg-white p-1 rounded">{{ JSON.stringify(call.requestHeaders, null, 2) }}</pre>
                </div>
                <div
                  v-if="call.requestBody"
                  class="mb-2"
                >
                  <span class="font-medium">リクエストボディ:</span>
                  <pre class="mt-1 text-xs bg-white p-1 rounded max-h-20 overflow-auto">{{ JSON.stringify(call.requestBody, null, 2) }}</pre>
                </div>
                <div
                  v-if="call.responseHeaders"
                  class="mb-2"
                >
                  <span class="font-medium">レスポンスヘッダー:</span>
                  <pre class="mt-1 text-xs bg-white p-1 rounded">{{ JSON.stringify(call.responseHeaders, null, 2) }}</pre>
                </div>
                <div
                  v-if="call.responseBody"
                  class="mb-2"
                >
                  <span class="font-medium">レスポンスボディ:</span>
                  <pre class="mt-1 text-xs bg-white p-1 rounded max-h-20 overflow-auto">{{ JSON.stringify(call.responseBody, null, 2) }}</pre>
                </div>
              </div>
            </details>
          </div>

          <div
            v-if="recentApiCalls.length === 0"
            class="p-4 text-center text-gray-500 text-sm"
          >
            APIコール履歴がありません
          </div>
        </div>
      </div>

      <!-- アクション -->
      <div class="flex flex-wrap gap-2">
        <button
          :class="isMonitoring ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'"
          class="px-3 py-1 text-xs text-white rounded focus:outline-none focus:ring-2"
          @click="toggleMonitoring"
        >
          {{ isMonitoring ? '監視停止' : '監視開始' }}
        </button>
        <button
          class="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
          @click="clearHistory"
        >
          履歴クリア
        </button>
        <button
          class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="exportHistory"
        >
          エクスポート
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const {
  recentApiCalls,
  pendingApiCalls,
  stats,
  isMonitoring,
  isDebugMode,
  startMonitoring,
  stopMonitoring,
  clearApiCallHistory,
  exportApiCallHistory,
} = useApiMonitor();

const isExpanded = ref(false);

// 監視の開始/停止を切り替え
const toggleMonitoring = () => {
  if (isMonitoring.value) {
    stopMonitoring();
  }
  else {
    startMonitoring();
  }
};

// 履歴をクリア
const clearHistory = () => {
  clearApiCallHistory();
};

// 履歴をエクスポート
const exportHistory = () => {
  exportApiCallHistory();
};

// ステータスコードのクラスを取得
const getStatusClass = (status?: number): string => {
  if (!status) return 'text-red-600';
  if (status >= 200 && status < 300) return 'text-green-600';
  if (status >= 300 && status < 400) return 'text-yellow-600';
  return 'text-red-600';
};

// 時間のフォーマット
const formatTime = (ms?: number): string => {
  if (!ms || ms === 0) return 'N/A';
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// タイムスタンプのフォーマット
const formatTimestamp = (date: Date): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  }).format(date);
};

// コンポーネントマウント時に監視を開始
onMounted(() => {
  if (isDebugMode.value) {
    startMonitoring();
  }
});
</script>
