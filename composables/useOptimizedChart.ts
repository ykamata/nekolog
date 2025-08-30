/**
 * 最適化されたチャート管理用composable
 * キャッシュ、パフォーマンス最適化、遅延読み込みを統合
 * Requirements: 4.1, 4.2, 4.3 - パフォーマンス最適化
 */

import type { ChartConfiguration, ChartData, ChartOptions } from 'chart.js';
import { useChart } from '~/composables/useChart';
import { useChartData } from '~/composables/useChartData';
import { useChartPerformance } from '~/composables/useChartPerformance';
import type { ChartFilters } from '~/utils/chart-cache';

export interface OptimizedChartState {
  isReady: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  data: Ref<any>;
  metrics: Ref<any>;
  cacheHit: Ref<boolean>;
}

export interface OptimizedChartActions {
  initialize: (canvas: HTMLCanvasElement, filters: ChartFilters) => Promise<void>;
  updateFilters: (filters: ChartFilters) => Promise<void>;
  switchType: (type: 'line' | 'bar' | 'stacked-bar') => Promise<void>;
  refresh: () => Promise<void>;
  destroy: () => void;
  warmCache: (commonFilters: ChartFilters[]) => Promise<void>;
}

export interface UseOptimizedChartReturn extends OptimizedChartState, OptimizedChartActions {}

/**
 * 最適化されたチャート管理
 */
export function useOptimizedChart(): UseOptimizedChartReturn {
  // 各composableを初期化
  const chartInstance = useChart();
  const chartData = useChartData();
  const chartPerformance = useChartPerformance({
    maxDataPoints: 1000,
    animationThreshold: 500,
    decimationThreshold: 200,
    enableLazyLoading: true,
  });

  // 統合状態
  const isReady = ref(false);
  const currentFilters = ref<ChartFilters | null>(null);
  const currentCanvas = ref<HTMLCanvasElement | null>(null);

  // 統合されたローディング状態
  const isLoading = computed(() =>
    chartData.isLoading.value || chartPerformance.isLoading.value,
  );

  // 統合されたエラー状態
  const error = computed(() =>
    chartData.error.value || chartInstance.error.value,
  );

  /**
   * チャートを初期化
   */
  const initialize = async (canvas: HTMLCanvasElement, filters: ChartFilters): Promise<void> => {
    try {
      console.log('最適化チャートを初期化中...', filters);

      // Chart.jsの遅延読み込み
      await chartPerformance.loadChartJs();

      // データを取得
      await chartData.fetchData(filters);

      if (!chartData.data.value) {
        throw new Error('チャートデータの取得に失敗しました');
      }

      // Chart.js用のデータ形式に変換
      const chartJsData: ChartData = {
        labels: chartData.data.value.labels,
        datasets: chartData.data.value.datasets,
      };

      // パフォーマンス最適化を適用
      const chartType = filters.chartType === 'stacked-bar' ? 'bar' : filters.chartType;
      const baseOptions = createBaseChartOptions(chartType, filters);
      const optimized = chartPerformance.optimizeChartData(chartJsData, baseOptions);

      // Chart.js設定を作成
      const config: ChartConfiguration = {
        type: chartType,
        data: optimized.data,
        options: optimized.options,
      };

      // チャートを初期化
      await chartInstance.initChart(canvas, config);

      // 状態を更新
      currentFilters.value = filters;
      currentCanvas.value = canvas;
      isReady.value = true;

      console.log('最適化チャート初期化完了', {
        dataPoints: optimized.metrics.dataPoints,
        isDecimated: optimized.metrics.isDecimated,
        animationsEnabled: optimized.metrics.animationsEnabled,
        cacheHit: chartData.cacheHit.value,
      });
    }
    catch (err) {
      console.error('最適化チャート初期化エラー:', err);
      isReady.value = false;
      throw err;
    }
  };

  /**
   * フィルターを更新
   */
  const updateFilters = async (filters: ChartFilters): Promise<void> => {
    if (!isReady.value || !currentCanvas.value) {
      throw new Error('チャートが初期化されていません');
    }

    try {
      console.log('チャートフィルターを更新中...', filters);

      // データを再取得
      await chartData.fetchData(filters);

      if (!chartData.data.value) {
        throw new Error('フィルター更新用データの取得に失敗しました');
      }

      // Chart.js用のデータ形式に変換
      const chartJsData: ChartData = {
        labels: chartData.data.value.labels,
        datasets: chartData.data.value.datasets,
      };

      // パフォーマンス最適化を適用
      const chartType = filters.chartType === 'stacked-bar' ? 'bar' : filters.chartType;
      const baseOptions = createBaseChartOptions(chartType, filters);
      const optimized = chartPerformance.optimizeChartData(chartJsData, baseOptions);

      // チャートを更新
      await chartInstance.updateChart(optimized.data, optimized.options);

      currentFilters.value = filters;

      console.log('チャートフィルター更新完了', {
        dataPoints: optimized.metrics.dataPoints,
        cacheHit: chartData.cacheHit.value,
      });
    }
    catch (err) {
      console.error('チャートフィルター更新エラー:', err);
      throw err;
    }
  };

  /**
   * チャートタイプを切り替え
   */
  const switchType = async (type: 'line' | 'bar' | 'stacked-bar'): Promise<void> => {
    if (!isReady.value || !currentFilters.value) {
      throw new Error('チャートが初期化されていません');
    }

    try {
      console.log('チャートタイプを切り替え中...', type);

      const newFilters = { ...currentFilters.value, chartType: type };
      await updateFilters(newFilters);

      console.log('チャートタイプ切り替え完了');
    }
    catch (err) {
      console.error('チャートタイプ切り替えエラー:', err);
      throw err;
    }
  };

  /**
   * データを再取得
   */
  const refresh = async (): Promise<void> => {
    if (!currentFilters.value) {
      throw new Error('リフレッシュするフィルターが設定されていません');
    }

    try {
      console.log('チャートデータをリフレッシュ中...');
      await chartData.refreshData();

      if (isReady.value && chartData.data.value) {
        // Chart.js用のデータ形式に変換
        const chartJsData: ChartData = {
          labels: chartData.data.value.labels,
          datasets: chartData.data.value.datasets,
        };

        // パフォーマンス最適化を適用
        const chartType = currentFilters.value.chartType === 'stacked-bar' ? 'bar' : currentFilters.value.chartType;
        const baseOptions = createBaseChartOptions(chartType, currentFilters.value);
        const optimized = chartPerformance.optimizeChartData(chartJsData, baseOptions);

        // チャートを更新
        await chartInstance.updateChart(optimized.data, optimized.options);
      }

      console.log('チャートデータリフレッシュ完了');
    }
    catch (err) {
      console.error('チャートデータリフレッシュエラー:', err);
      throw err;
    }
  };

  /**
   * チャートを破棄
   */
  const destroy = (): void => {
    try {
      chartInstance.destroyChart();
      isReady.value = false;
      currentFilters.value = null;
      currentCanvas.value = null;
      console.log('最適化チャート破棄完了');
    }
    catch (err) {
      console.error('チャート破棄エラー:', err);
    }
  };

  /**
   * キャッシュをウォーミング
   */
  const warmCache = async (commonFilters: ChartFilters[]): Promise<void> => {
    try {
      console.log('キャッシュウォーミングを開始...', { filterCount: commonFilters.length });
      await chartData.warmCache(commonFilters);
      console.log('キャッシュウォーミング完了');
    }
    catch (err) {
      console.error('キャッシュウォーミングエラー:', err);
      throw err;
    }
  };

  /**
   * ベースチャートオプションを作成
   */
  const createBaseChartOptions = (type: 'line' | 'bar', filters: ChartFilters): ChartOptions => {
    const isMobile = import.meta.client && window.innerWidth < 768;
    const isStacked = filters.chartType === 'stacked-bar';

    const baseOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: type === 'bar' ? 'index' : 'nearest',
        axis: 'x',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: isStacked ? '食事カロリー推移（積み上げ）' : '食事カロリー推移',
          font: {
            size: isMobile ? 14 : 16,
            weight: 'bold',
          },
          padding: {
            top: isMobile ? 10 : 20,
            bottom: isMobile ? 10 : 20,
          },
        },
        legend: {
          display: true,
          position: isMobile ? 'bottom' : 'top',
          labels: {
            font: {
              size: isMobile ? 12 : 14,
            },
            padding: isMobile ? 10 : 20,
            usePointStyle: true,
            boxWidth: isMobile ? 12 : 15,
          },
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.2)',
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            title: (context) => {
              return `日付: ${context[0]?.label || ''}`;
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return `${label}: ${value.toFixed(1)} kcal`;
            },
            afterBody: isStacked
              ? (context) => {
                  if (context.length > 1) {
                    const total = context.reduce((sum, item) => sum + item.parsed.y, 0);
                    return [`合計: ${total.toFixed(1)} kcal`];
                  }
                  return [];
                }
              : undefined,
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: !isMobile,
            text: '日付',
            font: {
              size: isMobile ? 12 : 14,
            },
          },
          ticks: {
            font: {
              size: isMobile ? 10 : 12,
            },
            maxRotation: isMobile ? 45 : 0,
            minRotation: 0,
            maxTicksLimit: isMobile ? 7 : undefined,
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1,
          },
          stacked: isStacked,
        },
        y: {
          display: true,
          title: {
            display: !isMobile,
            text: 'カロリー (kcal)',
            font: {
              size: isMobile ? 12 : 14,
            },
          },
          ticks: {
            font: {
              size: isMobile ? 10 : 12,
            },
            callback: function (value) {
              return `${value} kcal`;
            },
            maxTicksLimit: isMobile ? 6 : 8,
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
            lineWidth: 1,
          },
          beginAtZero: true,
          stacked: isStacked,
        },
      },
      elements: {
        point: {
          radius: isMobile ? 3 : 4,
          hoverRadius: isMobile ? 5 : 6,
        },
        line: {
          borderWidth: isMobile ? 2 : 3,
          tension: 0.4,
        },
        bar: {
          borderWidth: 1,
        },
      },
    };

    return baseOptions;
  };

  // コンポーネントがアンマウントされる際のクリーンアップ
  try {
    if (getCurrentInstance()) {
      onUnmounted(() => {
        destroy();
      });
    }
  }
  catch (err) {
    // テスト環境などでgetCurrentInstanceが利用できない場合は無視
  }

  return {
    // State
    isReady: readonly(isReady),
    isLoading: readonly(isLoading),
    error: readonly(error),
    data: readonly(chartData.data),
    metrics: readonly(chartPerformance.metrics),
    cacheHit: readonly(chartData.cacheHit),

    // Actions
    initialize,
    updateFilters,
    switchType,
    refresh,
    destroy,
    warmCache,
  };
}
