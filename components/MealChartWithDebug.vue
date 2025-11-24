<template>
  <div class="meal-chart-with-debug">
    <!-- 既存のMealChartコンポーネント -->
    <MealChart
      :cat-id="catId"
      :height="height"
      :period-days="periodDays"
      @chart-initialized="handleChartInitialized"
      @chart-updated="handleChartUpdated"
      @chart-error="handleChartError"
    />

    <!-- デバッグパネル（開発環境のみ） -->
    <DebugPanel
      :chart-instance="chartInstance"
      :chart-debug-info="chartDebugInfo"
      @refresh-chart-debug="refreshChartDebugInfo"
      @export-chart-debug="exportChartDebugInfo"
      @clear-chart-debug="clearChartDebugInfo"
    />
  </div>
</template>

<script setup lang="ts">
interface Props {
  catId?: number;
  height?: number;
  periodDays?: number;
}

const props = defineProps<Props>();

// デバッグ機能を使用
const {
  debugInfo: chartDebugInfo,
  isDebugMode,
  updateChartInstance,
  updateMemoryUsage,
  refreshDebugInfo,
  exportDebugInfo,
  clearDebugInfo,
  debugChartInit,
  debugDataProcess,
  debugChartRender,
} = useChartDebug();

const {
  logError,
} = useErrorDiagnostics();

// Chart.jsインスタンスの参照
const chartInstance = ref<any>(null);

// チャート初期化時のハンドラー
const handleChartInitialized = (chart: any) => {
  console.log('Chart initialized:', chart);
  chartInstance.value = chart;
  updateChartInstance(chart);
};

// チャート更新時のハンドラー
const handleChartUpdated = (chart: any) => {
  console.log('Chart updated:', chart);
  updateChartInstance(chart);
  updateMemoryUsage();
};

// チャートエラー時のハンドラー
const handleChartError = (error: Error) => {
  console.error('Chart error:', error);
  logError(error, {
    component: 'MealChart',
    catId: props.catId,
    periodDays: props.periodDays,
  });
};

// デバッグ情報の更新
const refreshChartDebugInfo = () => {
  refreshDebugInfo();
  updateMemoryUsage();
};

// デバッグ情報のエクスポート
const exportChartDebugInfo = () => {
  exportDebugInfo();
};

// デバッグ情報のクリア
const clearChartDebugInfo = () => {
  clearDebugInfo();
};

// コンポーネントのアンマウント時にチャートインスタンスをクリア
onUnmounted(() => {
  if (chartInstance.value) {
    try {
      chartInstance.value.destroy();
    }
    catch (error) {
      console.warn('Chart destruction error:', error);
    }
    chartInstance.value = null;
  }
});
</script>

<style scoped>
.meal-chart-with-debug {
  @apply space-y-4;
}
</style>
