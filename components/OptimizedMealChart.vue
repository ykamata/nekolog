<template>
  <div class="optimized-meal-chart">
    <!-- チャートコントロール -->
    <div class="chart-controls mb-4 flex flex-wrap gap-4 items-center">
      <!-- チャートタイプ切り替え -->
      <div class="chart-type-toggle">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          表示タイプ
        </label>
        <div class="flex rounded-lg border border-gray-300 overflow-hidden shadow-sm">
          <button
            type="button"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 flex items-center gap-2',
              chartType === 'line'
                ? 'bg-blue-600 text-white shadow-inner'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :disabled="loading.isLoading.value"
            @click="switchChartType('line')"
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
                d="M7 12l3-3 3 3 4-4"
              />
            </svg>
            線グラフ
          </button>
          <button
            type="button"
            :class="[
              'px-4 py-2 text-sm font-medium transition-all duration-200 border-l border-gray-300 flex items-center gap-2',
              chartType === 'bar'
                ? 'bg-blue-600 text-white shadow-inner'
                : 'bg-white text-gray-700 hover:bg-gray-50 hover:text-blue-600',
            ]"
            :disabled="loading.isLoading.value"
            @click="switchChartType('bar')"
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            積み上げ棒グラフ
          </button>
        </div>
      </div>

      <!-- 期間選択 -->
      <div class="date-range-filter">
        <label class="block text-sm font-medium text-gray-700 mb-2">
          期間
        </label>
        <select
          v-model="selectedDays"
          class="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          :disabled="loading.isLoading.value"
          @change="updateFilters"
        >
          <option value="7">
            過去7日
          </option>
          <option value="14">
            過去14日
          </option>
          <option value="30">
            過去30日
          </option>
          <option value="60">
            過去60日
          </option>
          <option value="90">
            過去90日
          </option>
        </select>
      </div>

      <!-- リフレッシュボタン -->
      <div class="refresh-control">
        <button
          type="button"
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          :disabled="loading.isLoading.value"
          @click="refreshChart"
        >
          <svg
            class="w-4 h-4"
            :class="{ 'animate-spin': loading.isLoading.value }"
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
          更新
        </button>
      </div>
    </div>

    <!-- パフォーマンス情報（開発環境のみ） -->
    <div
      v-if="isDevelopment && chart.metrics.value.dataPoints > 0"
      class="performance-info mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
    >
      <h4 class="text-sm font-medium text-blue-800 mb-2">
        パフォーマンス情報（開発環境）
      </h4>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
        <div>
          <span class="font-medium">データポイント:</span>
          {{ chart.metrics.value.dataPoints }}
        </div>
        <div>
          <span class="font-medium">描画時間:</span>
          {{ chart.metrics.value.renderTime.toFixed(1) }}ms
        </div>
        <div>
          <span class="font-medium">キャッシュヒット:</span>
          {{ chart.cacheHit.value ? 'あり' : 'なし' }}
        </div>
        <div>
          <span class="font-medium">データ間引き:</span>
          {{ chart.metrics.value.isDecimated ? 'あり' : 'なし' }}
        </div>
      </div>
      <div
        v-if="!chart.metrics.value.animationsEnabled"
        class="mt-2 text-xs text-blue-700"
      >
        <span class="font-medium">⚡ 最適化:</span>
        大量データのためアニメーションを無効化しています
      </div>
    </div>

    <!-- メインチャートエリア -->
    <div class="chart-main-area">
      <!-- ローディング状態 -->
      <ChartLoadingStates
        v-if="loading.isLoading.value"
        :loading-type="loading.loadingType.value"
        :chart-type="chartType === 'stacked-bar' ? 'bar' : chartType"
        :chart-height="chartHeight"
        :progress="loading.progress.value"
        :progress-title="progressTitle"
        :progress-subtitle="progressSubtitle"
        :progress-steps="loading.steps.value"
        :show-cancel-button="false"
        @cancel="cancelLoading"
      />

      <!-- エラー状態 -->
      <div
        v-else-if="chart.error.value"
        class="error-container bg-red-50 border border-red-200 rounded-lg p-6 text-center"
      >
        <div class="error-icon text-red-500 text-4xl mb-4">
          ⚠️
        </div>
        <h3 class="error-title text-lg font-semibold text-red-800 mb-2">
          チャートの表示に失敗しました
        </h3>
        <p class="error-message text-red-700 mb-4">
          {{ chart.error.value }}
        </p>
        <div class="error-actions">
          <button
            type="button"
            class="retry-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            @click="retryChart"
          >
            再試行
          </button>
        </div>
      </div>

      <!-- チャート表示 -->
      <div
        v-else
        class="chart-container"
      >
        <!-- チャートキャンバス -->
        <div class="chart-canvas-wrapper relative">
          <canvas
            ref="chartCanvas"
            :style="{ height: chartHeight + 'px' }"
            class="max-w-full h-auto"
            role="img"
            :aria-label="chartAriaLabel"
          />
        </div>

        <!-- チャートサマリー -->
        <div
          v-if="chart.data.value && !chart.data.value.isEmpty"
          class="chart-summary mt-4 grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div class="summary-card bg-gray-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-gray-700">
              データポイント数
            </h3>
            <p class="text-2xl font-bold text-gray-900">
              {{ chart.data.value.labels.length }}
            </p>
          </div>
          <div class="summary-card bg-gray-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-gray-700">
              データセット数
            </h3>
            <p class="text-2xl font-bold text-gray-900">
              {{ chart.data.value.datasets.length }}
            </p>
          </div>
          <div class="summary-card bg-gray-50 p-4 rounded-lg">
            <h3 class="text-sm font-medium text-gray-700">
              期間
            </h3>
            <p class="text-sm text-gray-900">
              {{ formatDateRange(chart.data.value.dateRange) }}
            </p>
          </div>
        </div>

        <!-- データなし状態 -->
        <div
          v-if="chart.data.value?.isEmpty"
          class="no-data-container bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
        >
          <div class="no-data-icon text-gray-400 text-4xl mb-4">
            📊
          </div>
          <h3 class="no-data-title text-lg font-medium text-gray-900 mb-2">
            データがありません
          </h3>
          <p class="no-data-message text-gray-600 mb-4">
            選択した期間にはデータが存在しません。<br>
            期間を変更するか、データを追加してください。
          </p>
          <button
            type="button"
            class="add-data-button px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            @click="$emit('add-data')"
          >
            データを追加
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useOptimizedChart } from '~/composables/useOptimizedChart';
import { useChartLoading } from '~/composables/useChartLoading';
import type { ChartFilters } from '~/utils/chart-cache';

interface Props {
  catId?: string;
  height?: number;
  periodDays?: number;
}

const props = withDefaults(defineProps<Props>(), {
  height: 400,
  periodDays: 30,
});

defineEmits<{
  'add-data': [];
}>();

// コンポーザブルを初期化
const chart = useOptimizedChart();
const loading = useChartLoading();

// 状態管理
const chartCanvas = ref<HTMLCanvasElement>();
const chartType = ref<'line' | 'bar' | 'stacked-bar'>('line');
const selectedDays = ref(props.periodDays);

// 開発環境判定
const isDevelopment = import.meta.dev;

// 計算されたプロパティ
const chartHeight = computed(() => {
  if (import.meta.client) {
    const isMobile = window.innerWidth < 768;
    return isMobile ? 300 : props.height;
  }
  return props.height;
});

const chartAriaLabel = computed(() => {
  const typeLabel = chartType.value === 'line' ? '線グラフ' : '積み上げ棒グラフ';
  return `猫の食事カロリー推移 ${typeLabel} 過去${selectedDays.value}日間`;
});

const progressTitle = computed(() => {
  if (loading.currentStep.value) {
    const step = loading.steps.value.find(s => s.id === loading.currentStep.value);
    return step?.label || 'チャートを読み込み中';
  }
  return 'チャートを読み込み中';
});

const progressSubtitle = computed(() => {
  const dataPoints = chart.data.value?.labels.length || 0;
  if (dataPoints > 0) {
    return `${dataPoints}件のデータを処理中...`;
  }
  return 'データを処理しています...';
});

/**
 * 現在のフィルターを生成
 */
const getCurrentFilters = (): ChartFilters => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - selectedDays.value);

  return {
    catId: props.catId,
    dateRange: {
      start: startDate,
      end: endDate,
    },
    chartType: chartType.value,
  };
};

/**
 * チャートを初期化
 */
const initializeChart = async (): Promise<void> => {
  if (!chartCanvas.value) {
    throw new Error('チャートキャンバスが見つかりません');
  }

  try {
    // ローディング開始
    const filters = getCurrentFilters();
    loading.startLoading('skeleton');

    // チャートを初期化
    await chart.initialize(chartCanvas.value, filters);

    // ローディング完了
    loading.stopLoading();
  }
  catch (error) {
    console.error('チャート初期化エラー:', error);
    loading.setError(error instanceof Error ? error.message : 'チャートの初期化に失敗しました');
  }
};

/**
 * チャートタイプを切り替え
 */
const switchChartType = async (newType: 'line' | 'bar' | 'stacked-bar'): Promise<void> => {
  if (chartType.value === newType || loading.isLoading.value) return;

  try {
    chartType.value = newType;

    if (chart.isReady.value) {
      loading.startLoading('spinner');
      await chart.switchType(newType);
      loading.stopLoading();
    }
  }
  catch (error) {
    console.error('チャートタイプ切り替えエラー:', error);
    loading.setError(error instanceof Error ? error.message : 'チャートタイプの切り替えに失敗しました');
  }
};

/**
 * フィルターを更新
 */
const updateFilters = async (): Promise<void> => {
  if (!chart.isReady.value || loading.isLoading.value) return;

  try {
    loading.startLoading('dots');
    const filters = getCurrentFilters();
    await chart.updateFilters(filters);
    loading.stopLoading();
  }
  catch (error) {
    console.error('フィルター更新エラー:', error);
    loading.setError(error instanceof Error ? error.message : 'フィルターの更新に失敗しました');
  }
};

/**
 * チャートをリフレッシュ
 */
const refreshChart = async (): Promise<void> => {
  if (loading.isLoading.value) return;

  try {
    loading.startLoading('spinner');
    await chart.refresh();
    loading.stopLoading();
  }
  catch (error) {
    console.error('チャートリフレッシュエラー:', error);
    loading.setError(error instanceof Error ? error.message : 'チャートの更新に失敗しました');
  }
};

/**
 * チャートをリトライ
 */
const retryChart = async (): Promise<void> => {
  loading.clearError();
  await initializeChart();
};

/**
 * ローディングをキャンセル
 */
const cancelLoading = (): void => {
  loading.stopLoading();
  loading.setError('ユーザーによってキャンセルされました');
};

/**
 * 日付範囲をフォーマット
 */
const formatDateRange = (dateRange: { start: Date; end: Date }): string => {
  const startStr = dateRange.start.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
  const endStr = dateRange.end.toLocaleDateString('ja-JP', {
    month: 'short',
    day: 'numeric',
  });
  return `${startStr} 〜 ${endStr}`;
};

// propsの変更を監視
watch(() => props.periodDays, (newPeriod) => {
  selectedDays.value = newPeriod;
  updateFilters();
});

watch(() => props.catId, () => {
  updateFilters();
});

// コンポーネントマウント時の初期化
onMounted(async () => {
  await nextTick();
  if (chartCanvas.value) {
    await initializeChart();
  }
});

// コンポーネントアンマウント時のクリーンアップ
onUnmounted(() => {
  chart.destroy();
  loading.reset();
});
</script>

<style scoped>
.optimized-meal-chart {
  @apply w-full;
}

.chart-controls {
  @apply bg-white rounded-lg border border-gray-200 p-4;
}

.chart-main-area {
  @apply bg-white rounded-lg border border-gray-200 p-4;
}

.chart-canvas-wrapper {
  @apply bg-gray-50 rounded-lg p-4;
}

.summary-card {
  @apply transition-all duration-200 hover:shadow-sm;
}

.error-container,
.no-data-container {
  @apply transition-all duration-200;
}

.performance-info {
  @apply transition-all duration-200;
}
</style>
