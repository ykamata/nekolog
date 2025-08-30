<template>
  <div
    v-if="isDevelopment"
    class="mt-4 border border-gray-300 rounded-lg bg-gray-50"
  >
    <button
      class="w-full px-4 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-t-lg"
      @click="isExpanded = !isExpanded"
    >
      <div class="flex items-center justify-between">
        <span>🐛 デバッグ情報</span>
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
    </button>

    <div
      v-if="isExpanded"
      class="p-4 border-t border-gray-200"
    >
      <!-- Chart.js インスタンス情報 -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-gray-800 mb-2">
          Chart.js インスタンス
        </h4>
        <div class="bg-white p-3 rounded border text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="font-medium">状態:</span>
              <span :class="chartStatusClass">{{ chartStatus }}</span>
            </div>
            <div>
              <span class="font-medium">タイプ:</span>
              <span>{{ debugInfo.chartType || 'N/A' }}</span>
            </div>
            <div>
              <span class="font-medium">データポイント数:</span>
              <span>{{ debugInfo.dataPointCount || 0 }}</span>
            </div>
            <div>
              <span class="font-medium">アニメーション:</span>
              <span>{{ debugInfo.animationEnabled ? '有効' : '無効' }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- パフォーマンスメトリクス -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-gray-800 mb-2">
          パフォーマンス
        </h4>
        <div class="bg-white p-3 rounded border text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="font-medium">初期化時間:</span>
              <span>{{ formatTime(debugInfo.initTime) }}</span>
            </div>
            <div>
              <span class="font-medium">レンダリング時間:</span>
              <span>{{ formatTime(debugInfo.renderTime) }}</span>
            </div>
            <div>
              <span class="font-medium">データ処理時間:</span>
              <span>{{ formatTime(debugInfo.dataProcessTime) }}</span>
            </div>
            <div>
              <span class="font-medium">メモリ使用量:</span>
              <span>{{ formatMemory(debugInfo.memoryUsage) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Chart.js 設定 -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-gray-800 mb-2">
          Chart.js 設定
        </h4>
        <div class="bg-white p-3 rounded border">
          <details class="text-xs">
            <summary class="cursor-pointer font-medium text-gray-700 hover:text-gray-900">
              設定を表示
            </summary>
            <pre class="mt-2 p-2 bg-gray-100 rounded overflow-auto max-h-40">{{ formattedConfig }}</pre>
          </details>
        </div>
      </div>

      <!-- システム情報 -->
      <div class="mb-4">
        <h4 class="text-sm font-semibold text-gray-800 mb-2">
          システム情報
        </h4>
        <div class="bg-white p-3 rounded border text-xs">
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="font-medium">ブラウザ:</span>
              <span>{{ systemInfo.browser }}</span>
            </div>
            <div>
              <span class="font-medium">画面サイズ:</span>
              <span>{{ systemInfo.screenSize }}</span>
            </div>
            <div>
              <span class="font-medium">デバイス:</span>
              <span>{{ systemInfo.deviceType }}</span>
            </div>
            <div>
              <span class="font-medium">タイムスタンプ:</span>
              <span>{{ formatTimestamp(debugInfo.timestamp) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- アクション -->
      <div class="flex gap-2">
        <button
          class="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          @click="refreshDebugInfo"
        >
          更新
        </button>
        <button
          class="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
          @click="exportDebugInfo"
        >
          エクスポート
        </button>
        <button
          class="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
          @click="clearDebugInfo"
        >
          クリア
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface DebugInfo {
  chartInstance: any;
  chartType: string;
  dataPointCount: number;
  animationEnabled: boolean;
  initTime: number;
  renderTime: number;
  dataProcessTime: number;
  memoryUsage: number;
  timestamp: Date;
  config: any;
}

interface Props {
  debugInfo: DebugInfo;
  chartInstance?: any;
}

const props = defineProps<Props>();

const isExpanded = ref(false);
const isDevelopment = computed(() => import.meta.dev);

// Chart.js インスタンスの状態を計算
const chartStatus = computed(() => {
  if (!props.chartInstance) return '未初期化';
  if (props.chartInstance.destroyed) return '破棄済み';
  if (props.chartInstance.canvas) return '正常';
  return '不明';
});

const chartStatusClass = computed(() => {
  const status = chartStatus.value;
  if (status === '正常') return 'text-green-600 font-medium';
  if (status === '未初期化') return 'text-yellow-600 font-medium';
  if (status === '破棄済み') return 'text-red-600 font-medium';
  return 'text-gray-600';
});

// Chart.js設定のフォーマット
const formattedConfig = computed(() => {
  if (!props.debugInfo.config) return 'N/A';
  try {
    return JSON.stringify(props.debugInfo.config, null, 2);
  }
  catch (error) {
    return 'フォーマットエラー';
  }
});

// システム情報を取得
const systemInfo = computed(() => {
  if (import.meta.client) {
    return {
      browser: navigator.userAgent.split(' ').pop() || 'Unknown',
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      deviceType: window.innerWidth < 768 ? 'Mobile' : 'Desktop',
    };
  }
  return {
    browser: 'SSR',
    screenSize: 'N/A',
    deviceType: 'N/A',
  };
});

// 時間のフォーマット
const formatTime = (ms: number): string => {
  if (!ms || ms === 0) return 'N/A';
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

// メモリ使用量のフォーマット
const formatMemory = (bytes: number): string => {
  if (!bytes || bytes === 0) return 'N/A';
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
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

// デバッグ情報の更新
const emit = defineEmits<{
  refresh: [];
  export: [];
  clear: [];
}>();

const refreshDebugInfo = () => {
  emit('refresh');
};

const exportDebugInfo = () => {
  emit('export');
};

const clearDebugInfo = () => {
  emit('clear');
};
</script>
