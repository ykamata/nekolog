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

interface PerformanceMetrics {
  initStart?: number;
  initEnd?: number;
  renderStart?: number;
  renderEnd?: number;
  dataProcessStart?: number;
  dataProcessEnd?: number;
}

export const useChartDebug = () => {
  const debugInfo = ref<DebugInfo>({
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

  const performanceMetrics = ref<PerformanceMetrics>({});
  const isDebugMode = computed(() => import.meta.dev);

  // パフォーマンス測定開始
  const startPerformanceTimer = (type: 'init' | 'render' | 'dataProcess') => {
    if (!isDebugMode.value) return;

    const key = `${type}Start` as keyof PerformanceMetrics;
    performanceMetrics.value[key] = performance.now();
  };

  // パフォーマンス測定終了
  const endPerformanceTimer = (type: 'init' | 'render' | 'dataProcess') => {
    if (!isDebugMode.value) return;

    const startKey = `${type}Start` as keyof PerformanceMetrics;
    const endKey = `${type}End` as keyof PerformanceMetrics;
    const startTime = performanceMetrics.value[startKey];

    if (startTime) {
      const endTime = performance.now();
      performanceMetrics.value[endKey] = endTime;

      const duration = endTime - startTime;
      const debugKey = `${type}Time` as keyof DebugInfo;
      (debugInfo.value as any)[debugKey] = duration;
    }
  };

  // Chart.jsインスタンス情報を更新
  const updateChartInstance = (chartInstance: any) => {
    if (!isDebugMode.value) return;

    debugInfo.value.chartInstance = chartInstance;
    debugInfo.value.timestamp = new Date();

    if (chartInstance) {
      debugInfo.value.chartType = chartInstance.config?.type || 'unknown';
      debugInfo.value.animationEnabled = chartInstance.options?.animation !== false;
      debugInfo.value.config = chartInstance.config;

      // データポイント数を計算
      const datasets = chartInstance.data?.datasets || [];
      debugInfo.value.dataPointCount = datasets.reduce((total: number, dataset: any) => {
        return total + (dataset.data?.length || 0);
      }, 0);
    }
  };

  // メモリ使用量を更新
  const updateMemoryUsage = () => {
    if (!isDebugMode.value || !import.meta.client) return;

    // @ts-ignore - performance.memory is not in all browsers
    if (performance.memory) {
      // @ts-ignore
      debugInfo.value.memoryUsage = performance.memory.usedJSHeapSize;
    }
  };

  // デバッグ情報をリフレッシュ
  const refreshDebugInfo = () => {
    if (!isDebugMode.value) return;

    debugInfo.value.timestamp = new Date();
    updateMemoryUsage();
  };

  // デバッグ情報をエクスポート
  const exportDebugInfo = () => {
    if (!isDebugMode.value) return;

    const exportData = {
      ...debugInfo.value,
      chartInstance: debugInfo.value.chartInstance ? 'Chart Instance Present' : 'No Chart Instance',
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-debug-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // デバッグ情報をクリア
  const clearDebugInfo = () => {
    if (!isDebugMode.value) return;

    debugInfo.value = {
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
    };

    performanceMetrics.value = {};
  };

  // Chart.js初期化のデバッグラッパー
  const debugChartInit = async (initFunction: () => Promise<any>) => {
    startPerformanceTimer('init');

    try {
      const chartInstance = await initFunction();
      updateChartInstance(chartInstance);
      updateMemoryUsage();
      return chartInstance;
    }
    catch (error) {
      console.error('Chart initialization failed:', error);
      throw error;
    }
    finally {
      endPerformanceTimer('init');
    }
  };

  // データ処理のデバッグラッパー
  const debugDataProcess = <T>(processFunction: () => T): T => {
    startPerformanceTimer('dataProcess');

    try {
      const result = processFunction();
      return result;
    }
    finally {
      endPerformanceTimer('dataProcess');
    }
  };

  // チャートレンダリングのデバッグラッパー
  const debugChartRender = (renderFunction: () => void) => {
    startPerformanceTimer('render');

    try {
      renderFunction();
    }
    finally {
      endPerformanceTimer('render');
      updateMemoryUsage();
    }
  };

  return {
    debugInfo: readonly(debugInfo),
    isDebugMode,
    startPerformanceTimer,
    endPerformanceTimer,
    updateChartInstance,
    updateMemoryUsage,
    refreshDebugInfo,
    exportDebugInfo,
    clearDebugInfo,
    debugChartInit,
    debugDataProcess,
    debugChartRender,
  };
};
