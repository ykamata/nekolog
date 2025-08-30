/**
 * Chart.jsパフォーマンス最適化用composable
 * Requirements: 4.3 - 大規模データセットでのパフォーマンス維持
 */

import type { ChartData, ChartOptions } from 'chart.js';

export interface PerformanceConfig {
  maxDataPoints: number;
  animationThreshold: number;
  decimationThreshold: number;
  enableLazyLoading: boolean;
}

export interface PerformanceMetrics {
  dataPoints: number;
  renderTime: number;
  memoryUsage: number;
  isDecimated: boolean;
  animationsEnabled: boolean;
}

/**
 * Chart.jsパフォーマンス最適化管理
 */
export function useChartPerformance(config?: Partial<PerformanceConfig>) {
  // デフォルト設定
  const defaultConfig: PerformanceConfig = {
    maxDataPoints: 1000, // 最大データポイント数
    animationThreshold: 500, // アニメーション無効化の閾値
    decimationThreshold: 200, // データ間引きの閾値
    enableLazyLoading: true, // 遅延読み込みを有効化
  };

  const performanceConfig = { ...defaultConfig, ...config };

  // パフォーマンスメトリクス
  const metrics = ref<PerformanceMetrics>({
    dataPoints: 0,
    renderTime: 0,
    memoryUsage: 0,
    isDecimated: false,
    animationsEnabled: true,
  });

  // Chart.jsの遅延読み込み状態
  const isChartJsLoaded = ref(false);
  const isLoading = ref(false);

  /**
   * Chart.jsを遅延読み込み
   */
  const loadChartJs = async (): Promise<void> => {
    if (isChartJsLoaded.value || !performanceConfig.enableLazyLoading) {
      return;
    }

    if (isLoading.value) {
      // 既に読み込み中の場合は完了を待つ
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (isChartJsLoaded.value) {
            resolve();
          }
          else {
            setTimeout(checkLoaded, 50);
          }
        };
        checkLoaded();
      });
    }

    try {
      isLoading.value = true;
      console.log('Chart.jsを遅延読み込み中...');

      // 動的インポートでChart.jsを読み込み
      const chartModule = await import('chart.js');

      // 必要なコンポーネントを登録
      const {
        Chart,
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        LineController,
        BarController,
        Title,
        Tooltip,
        Legend,
        Filler,
      } = chartModule;

      Chart.register(
        CategoryScale,
        LinearScale,
        PointElement,
        LineElement,
        BarElement,
        LineController,
        BarController,
        Title,
        Tooltip,
        Legend,
        Filler,
      );

      isChartJsLoaded.value = true;
      console.log('Chart.jsの遅延読み込みが完了しました');
    }
    catch (error) {
      console.error('Chart.jsの遅延読み込みに失敗しました:', error);
      throw new Error('Chart.jsライブラリの読み込みに失敗しました');
    }
    finally {
      isLoading.value = false;
    }
  };

  /**
   * データポイント数を計算
   */
  const calculateDataPoints = (data: ChartData): number => {
    if (!data.datasets || data.datasets.length === 0) {
      return 0;
    }

    return data.datasets.reduce((total, dataset) => {
      return total + (dataset.data?.length || 0);
    }, 0);
  };

  /**
   * データ間引き処理
   */
  const decimateData = (data: ChartData, targetPoints: number): ChartData => {
    if (!data.labels || data.labels.length <= targetPoints) {
      return data;
    }

    const step = Math.ceil(data.labels.length / targetPoints);
    const decimatedLabels: string[] = [];
    const decimatedDatasets = data.datasets.map(dataset => ({
      ...dataset,
      data: [] as number[],
    }));

    // 等間隔でデータを間引き
    for (let i = 0; i < data.labels.length; i += step) {
      decimatedLabels.push(data.labels[i] as string);

      data.datasets.forEach((dataset, datasetIndex) => {
        if (dataset.data && dataset.data[i] !== undefined && decimatedDatasets[datasetIndex]) {
          decimatedDatasets[datasetIndex].data.push(dataset.data[i] as number);
        }
      });
    }

    console.log(`データを間引きしました: ${data.labels.length} → ${decimatedLabels.length} ポイント`);

    return {
      ...data,
      labels: decimatedLabels,
      datasets: decimatedDatasets,
    };
  };

  /**
   * パフォーマンス最適化されたチャートオプションを生成
   */
  const optimizeChartOptions = (
    baseOptions: ChartOptions,
    dataPoints: number,
  ): ChartOptions => {
    const optimizedOptions = { ...baseOptions };

    // データポイント数に基づいてアニメーションを制御
    const shouldDisableAnimations = dataPoints > performanceConfig.animationThreshold;

    if (shouldDisableAnimations) {
      optimizedOptions.animation = {
        duration: 0,
      };
      optimizedOptions.transitions = {
        active: {
          animation: {
            duration: 0,
          },
        },
      };
      console.log(`アニメーションを無効化しました (データポイント: ${dataPoints})`);
    }
    else {
      // データ量に応じてアニメーション時間を調整
      const animationDuration = Math.max(300, 750 - (dataPoints / 10));
      optimizedOptions.animation = {
        duration: animationDuration,
        easing: 'easeInOutQuart',
      };
    }

    // 大量データ用の最適化設定
    if (dataPoints > performanceConfig.decimationThreshold) {
      // ホバー効果を軽量化
      optimizedOptions.onHover = undefined;

      // ツールチップの最適化
      if (optimizedOptions.plugins?.tooltip) {
        optimizedOptions.plugins.tooltip.filter = (tooltipItem) => {
          // 表示するツールチップを制限
          return tooltipItem.dataIndex % Math.ceil(dataPoints / 100) === 0;
        };
      }

      // ポイント要素の最適化
      optimizedOptions.elements = {
        ...optimizedOptions.elements,
        point: {
          ...optimizedOptions.elements?.point,
          radius: 0, // ポイントを非表示にしてパフォーマンス向上
          hoverRadius: 3,
        },
      };

      console.log(`大量データ用の最適化を適用しました (データポイント: ${dataPoints})`);
    }

    // レスポンシブ設定の最適化
    optimizedOptions.responsive = true;
    optimizedOptions.maintainAspectRatio = false;

    // スケールの最適化
    if (optimizedOptions.scales) {
      Object.keys(optimizedOptions.scales).forEach((scaleKey) => {
        const scale = optimizedOptions.scales![scaleKey];
        if (scale && typeof scale === 'object') {
          // ティック数を制限してパフォーマンス向上
          scale.ticks = {
            ...scale.ticks,
            maxTicksLimit: dataPoints > 500 ? 8 : 12,
          };
        }
      });
    }

    return optimizedOptions;
  };

  /**
   * データとオプションを最適化
   */
  const optimizeChartData = (
    data: ChartData,
    options: ChartOptions,
  ): { data: ChartData; options: ChartOptions; metrics: PerformanceMetrics } => {
    const startTime = performance.now();

    // データポイント数を計算
    const originalDataPoints = calculateDataPoints(data);

    // データ間引きの実行
    let optimizedData = data;
    let isDecimated = false;

    if (originalDataPoints > performanceConfig.decimationThreshold) {
      optimizedData = decimateData(data, performanceConfig.maxDataPoints);
      isDecimated = true;
    }

    const finalDataPoints = calculateDataPoints(optimizedData);

    // オプションの最適化
    const optimizedOptions = optimizeChartOptions(options, finalDataPoints);

    // アニメーション有効状態を判定
    const animationsEnabled = !optimizedOptions.animation
      || (typeof optimizedOptions.animation === 'object' && optimizedOptions.animation.duration !== 0);

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // メトリクスを更新
    const currentMetrics: PerformanceMetrics = {
      dataPoints: finalDataPoints,
      renderTime,
      memoryUsage: getMemoryUsage(),
      isDecimated,
      animationsEnabled,
    };

    metrics.value = currentMetrics;

    console.log('チャートデータ最適化完了:', {
      originalPoints: originalDataPoints,
      finalPoints: finalDataPoints,
      decimated: isDecimated,
      renderTime: `${renderTime.toFixed(2)}ms`,
      animationsEnabled,
    });

    return {
      data: optimizedData,
      options: optimizedOptions,
      metrics: currentMetrics,
    };
  };

  /**
   * メモリ使用量を取得（概算）
   */
  const getMemoryUsage = (): number => {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      // Chrome系ブラウザでのメモリ情報
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize || 0;
    }
    return 0;
  };

  /**
   * パフォーマンス統計をリセット
   */
  const resetMetrics = (): void => {
    metrics.value = {
      dataPoints: 0,
      renderTime: 0,
      memoryUsage: 0,
      isDecimated: false,
      animationsEnabled: true,
    };
  };

  /**
   * パフォーマンス設定を更新
   */
  const updateConfig = (newConfig: Partial<PerformanceConfig>): void => {
    Object.assign(performanceConfig, newConfig);
    console.log('パフォーマンス設定を更新しました:', performanceConfig);
  };

  /**
   * パフォーマンス推奨設定を取得
   */
  const getRecommendedConfig = (dataPoints: number): Partial<PerformanceConfig> => {
    if (dataPoints > 2000) {
      return {
        maxDataPoints: 500,
        animationThreshold: 100,
        decimationThreshold: 100,
      };
    }
    else if (dataPoints > 1000) {
      return {
        maxDataPoints: 800,
        animationThreshold: 300,
        decimationThreshold: 200,
      };
    }
    else {
      return {
        maxDataPoints: 1000,
        animationThreshold: 500,
        decimationThreshold: 300,
      };
    }
  };

  return {
    // State
    metrics: readonly(metrics),
    isChartJsLoaded: readonly(isChartJsLoaded),
    isLoading: readonly(isLoading),
    config: readonly(ref(performanceConfig)),

    // Actions
    loadChartJs,
    optimizeChartData,
    resetMetrics,
    updateConfig,
    getRecommendedConfig,
    calculateDataPoints,
  };
}
