<template>
  <div
    v-if="isDebugMode"
    class="debug-panel"
  >
    <!-- Chart Debug Panel -->
    <ChartDebugPanel
      :debug-info="chartDebugInfo"
      :chart-instance="chartInstance"
      @refresh="refreshChartDebug"
      @export="exportChartDebug"
      @clear="clearChartDebug"
    />

    <!-- API Monitor Panel -->
    <ApiMonitorPanel />

    <!-- Error Diagnostics Panel -->
    <ErrorDiagnosticsPanel />
  </div>
</template>

<script setup lang="ts">
interface Props {
  chartInstance?: any;
  chartDebugInfo?: any;
}

const props = defineProps<Props>();

const { isDebugMode } = useChartDebug();
const { setupGlobalErrorHandler } = useErrorDiagnostics();

// Chart debug info のデフォルト値
const chartDebugInfo = computed(() => props.chartDebugInfo || {
  chartInstance: null,
  chartType: '',
  dataPointCount: 0,
  animationEnabled: false,
  initTime: 0,
  renderTime: 0,
  dataProcessTime: 0,
  memoryUsage: 0,
  timestamp: new Date(),
  config: null,
});

// イベントハンドラー
const emit = defineEmits<{
  refreshChartDebug: [];
  exportChartDebug: [];
  clearChartDebug: [];
}>();

const refreshChartDebug = () => {
  emit('refreshChartDebug');
};

const exportChartDebug = () => {
  emit('exportChartDebug');
};

const clearChartDebug = () => {
  emit('clearChartDebug');
};

// グローバルエラーハンドラーを設定
onMounted(() => {
  if (isDebugMode.value) {
    setupGlobalErrorHandler();
  }
});
</script>

<style scoped>
.debug-panel {
  @apply space-y-4;
}

/* 開発環境でのみ表示 */
.debug-panel {
  display: block;
}

/* 本番環境では非表示 */
@media (min-width: 1px) {
  .debug-panel {
    display: var(--debug-display, block);
  }
}
</style>
