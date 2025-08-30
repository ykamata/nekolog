import {
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
  type ChartConfiguration,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { getChartCache, type ChartFilters, type ProcessedChartData } from '~/utils/chart-cache';

// Chart.jsコンポーネントの登録（テスト環境では無効化）
if (typeof Chart.register === 'function') {
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
}

export interface ChartErrorInfo {
  code: string;
  message: string;
  userMessage: string;
  severity: 'low' | 'medium' | 'high';
  retryable: boolean;
  timestamp: Date;
  context?: Record<string, unknown>;
}

export interface ChartInstance {
  chart: Ref<Chart | null>;
  isInitialized: Ref<boolean>;
  error: Ref<string | null>;
  errorInfo: Ref<ChartErrorInfo | null>;
  isRetryable: Ref<boolean>;
  initChart: (canvas: HTMLCanvasElement, config: ChartConfiguration) => Promise<void>;
  updateChart: (data: ChartData, options?: Partial<ChartOptions>) => Promise<void>;
  switchChartType: (newType: 'line' | 'bar', data: ChartData) => Promise<void>;
  destroyChart: () => void;
  resize: () => void;
  clearError: () => void;
  retryLastOperation: () => Promise<void>;
}

/**
 * Chart.jsのライフサイクル管理用composable
 * Requirements: 2.1, 2.2, 2.3, 4.4
 */
export function useChart(): ChartInstance {
  const chart = ref<Chart | null>(null);
  const isInitialized = ref(false);
  const error = ref<string | null>(null);
  const errorInfo = ref<ChartErrorInfo | null>(null);
  const isRetryable = ref(false);

  // レスポンシブ対応のためのリサイズ監視
  const resizeObserver = ref<ResizeObserver | null>(null);

  // 最後の操作を記録（リトライ用）
  const lastOperation = ref<{
    type: 'init' | 'update' | 'switchType';
    args: unknown[];
  } | null>(null);

  /**
   * チャート固有のエラー情報を作成
   */
  const createChartError = (
    code: string,
    message: string,
    userMessage: string,
    severity: 'low' | 'medium' | 'high' = 'medium',
    retryable: boolean = false,
    context?: Record<string, unknown>,
  ): ChartErrorInfo => {
    return {
      code,
      message,
      userMessage,
      severity,
      retryable,
      timestamp: new Date(),
      context,
    };
  };

  /**
   * エラーを設定し、ログに記録
   */
  const setError = (chartError: ChartErrorInfo): void => {
    errorInfo.value = chartError;
    error.value = chartError.userMessage;
    isRetryable.value = chartError.retryable;

    // 開発環境でのデバッグログ
    if (import.meta.dev) {
      console.group(`🚨 Chart Error [${chartError.severity.toUpperCase()}]: ${chartError.code}`);
      console.error('Message:', chartError.message);
      console.error('User Message:', chartError.userMessage);
      console.error('Retryable:', chartError.retryable);
      console.error('Timestamp:', chartError.timestamp.toISOString());
      if (chartError.context) {
        console.error('Context:', chartError.context);
      }
      console.groupEnd();
    }
  };

  /**
   * エラーをクリア
   */
  const clearError = (): void => {
    error.value = null;
    errorInfo.value = null;
    isRetryable.value = false;
  };

  /**
   * Chart.js固有のエラーを解析
   */
  const parseChartError = (err: unknown, operation: string): ChartErrorInfo => {
    if (err instanceof Error) {
      const message = err.message.toLowerCase();

      // Canvas関連のエラー
      if (message.includes('canvas') || message.includes('context')) {
        return createChartError(
          'CANVAS_ERROR',
          err.message,
          'グラフの描画領域を初期化できませんでした。ページを再読み込みしてください。',
          'high',
          true,
          { operation, originalError: err.message },
        );
      }

      // Chart.js初期化エラー
      if (message.includes('chart') && message.includes('register')) {
        return createChartError(
          'CHARTJS_REGISTER_ERROR',
          err.message,
          'グラフライブラリの初期化に失敗しました。ページを再読み込みしてください。',
          'high',
          true,
          { operation, originalError: err.message },
        );
      }

      // データ関連のエラー
      if (message.includes('data') || message.includes('dataset')) {
        return createChartError(
          'DATA_ERROR',
          err.message,
          'グラフデータの処理中にエラーが発生しました。データを確認してください。',
          'medium',
          true,
          { operation, originalError: err.message },
        );
      }

      // メモリ不足エラー
      if (message.includes('memory') || message.includes('allocation')) {
        return createChartError(
          'MEMORY_ERROR',
          err.message,
          'メモリ不足のためグラフを表示できません。他のタブを閉じて再試行してください。',
          'high',
          true,
          { operation, originalError: err.message },
        );
      }

      // レンダリングエラー
      if (message.includes('render') || message.includes('draw')) {
        return createChartError(
          'RENDER_ERROR',
          err.message,
          'グラフの描画中にエラーが発生しました。しばらく待ってから再試行してください。',
          'medium',
          true,
          { operation, originalError: err.message },
        );
      }

      // その他のChart.jsエラー
      return createChartError(
        'CHARTJS_ERROR',
        err.message,
        'グラフの処理中にエラーが発生しました。再試行してください。',
        'medium',
        true,
        { operation, originalError: err.message },
      );
    }

    // 不明なエラー
    return createChartError(
      'UNKNOWN_CHART_ERROR',
      'Unknown chart error occurred',
      'グラフの表示中に予期しないエラーが発生しました。',
      'medium',
      true,
      { operation, error: err },
    );
  };

  /**
   * チャートを初期化
   * Requirements: 2.1 - Chart.js初期化とクリーンアップ
   */
  const initChart = async (canvas: HTMLCanvasElement, config: ChartConfiguration): Promise<void> => {
    try {
      // 最後の操作を記録
      lastOperation.value = { type: 'init', args: [canvas, config] };

      // エラーをクリア
      clearError();

      // 既存のチャートがある場合は破棄
      if (chart.value) {
        destroyChart();
      }

      // キャンバス要素の詳細検証
      if (!canvas) {
        throw new Error('Canvas要素が提供されていません');
      }

      if (!(canvas instanceof HTMLCanvasElement)) {
        throw new Error('提供された要素はCanvas要素ではありません');
      }

      // キャンバスがDOMに接続されているかチェック
      if (!canvas.isConnected) {
        throw new Error('Canvas要素がDOMに接続されていません');
      }

      // キャンバスのサイズが有効かチェック
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        throw new Error('Canvas要素のサイズが無効です（幅または高さが0）');
      }

      // キャンバスのコンテキストが取得できるかチェック
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas 2Dコンテキストの取得に失敗しました。ブラウザがCanvas APIをサポートしていない可能性があります。');
      }

      // Chart.jsが利用可能かチェック
      let ChartConstructor = Chart;
      if (typeof ChartConstructor === 'undefined') {
        if (import.meta.client && (window as any).Chart) {
          // グローバルのChart.jsを使用
          ChartConstructor = (window as any).Chart;
        }
        else {
          throw new Error('Chart.jsライブラリが読み込まれていません');
        }
      }

      // Chart.jsの必要なコンポーネントが登録されているかチェック
      if (typeof Chart.register !== 'function') {
        throw new Error('Chart.jsの初期化が不完全です');
      }

      // 設定の検証
      if (!config || !config.type) {
        throw new Error('無効なChart.js設定です');
      }

      if (!config.data || !config.data.datasets) {
        throw new Error('Chart.jsデータが不正です');
      }

      // Chart.jsインスタンスを作成
      chart.value = new ChartConstructor(canvas, config);
      isInitialized.value = true;

      // レスポンシブ対応のためのリサイズ監視を設定
      setupResizeObserver(canvas);

      console.log('Chart.js初期化完了', {
        type: config.type,
        datasets: config.data?.datasets?.length || 0,
        labels: config.data?.labels?.length || 0,
        canvasSize: { width: rect.width, height: rect.height },
      });
    }
    catch (err) {
      const chartError = parseChartError(err, 'initChart');
      setError(chartError);
      isInitialized.value = false;
      throw new Error(chartError.userMessage);
    }
  };

  /**
   * チャートデータを更新
   */
  const updateChart = async (data: ChartData, options?: Partial<ChartOptions>): Promise<void> => {
    try {
      // 最後の操作を記録
      lastOperation.value = { type: 'update', args: [data, options] };

      if (!chart.value) {
        throw new Error('チャートが初期化されていません。先にinitChart()を呼び出してください。');
      }

      // チャートインスタンスが破棄されていないかチェック
      if (!chart.value.canvas || !chart.value.canvas.isConnected) {
        throw new Error('チャートのCanvas要素が無効になっています');
      }

      // データの詳細検証
      if (!data) {
        throw new Error('チャートデータが提供されていません');
      }

      if (!data.labels) {
        throw new Error('チャートラベルが提供されていません');
      }

      if (!data.datasets || !Array.isArray(data.datasets)) {
        throw new Error('チャートデータセットが無効です');
      }

      if (data.datasets.length === 0) {
        throw new Error('チャートデータセットが空です');
      }

      // データセットの検証
      for (let i = 0; i < data.datasets.length; i++) {
        const dataset = data.datasets[i];
        if (!dataset || !dataset.data || !Array.isArray(dataset.data)) {
          throw new Error(`データセット${i + 1}のデータが無効です`);
        }
      }

      // ラベルとデータの整合性チェック
      const labelCount = data.labels.length;
      for (let i = 0; i < data.datasets.length; i++) {
        const dataset = data.datasets[i];
        if (dataset && dataset.data && dataset.data.length !== labelCount) {
          console.warn(`データセット${i + 1}のデータ数（${dataset.data.length}）がラベル数（${labelCount}）と一致しません`);
        }
      }

      // データを更新
      chart.value.data = data;

      // オプションが提供された場合は更新
      if (options && chart.value.options) {
        Object.assign(chart.value.options, options);
      }

      // チャートを再描画
      chart.value.update('active');

      // エラーをクリア（成功時）
      clearError();

      console.log('Chart.js更新完了', {
        datasets: data.datasets.length,
        labels: data.labels.length,
        dataPoints: data.datasets.reduce((sum, ds) => sum + ds.data.length, 0),
      });
    }
    catch (err) {
      const chartError = parseChartError(err, 'updateChart');
      setError(chartError);
      throw new Error(chartError.userMessage);
    }
  };

  /**
   * レスポンシブ対応のためのリサイズ監視を設定
   * Requirements: 2.3 - レスポンシブデザインサポート
   */
  const setupResizeObserver = (canvas: HTMLCanvasElement): void => {
    if (!import.meta.client || !window.ResizeObserver) return;

    // 既存のオブザーバーがある場合は削除
    if (resizeObserver.value) {
      resizeObserver.value.disconnect();
    }

    resizeObserver.value = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === canvas && chart.value) {
          // デバウンス処理でリサイズを最適化
          setTimeout(() => {
            if (chart.value) {
              chart.value.resize();
            }
          }, 100);
        }
      }
    });

    resizeObserver.value.observe(canvas);
  };

  /**
   * チャートを破棄
   * Requirements: 2.1 - 適切なクリーンアップ
   */
  const destroyChart = (): void => {
    try {
      // ResizeObserverのクリーンアップ
      if (resizeObserver.value) {
        resizeObserver.value.disconnect();
        resizeObserver.value = null;
      }

      if (chart.value) {
        chart.value.destroy();
        chart.value = null;
        isInitialized.value = false;
        console.log('Chart.js破棄完了');
      }
    }
    catch (err) {
      console.error('Chart.js破棄エラー:', err);
    }
  };

  /**
   * チャートをリサイズ
   * Requirements: 2.3 - レスポンシブデザインサポート
   */
  const resize = (): void => {
    try {
      if (chart.value) {
        chart.value.resize();
        console.log('Chart.jsリサイズ完了');
      }
    }
    catch (err) {
      console.error('Chart.jsリサイズエラー:', err);
    }
  };

  /**
   * チャートタイプを切り替え
   * Requirements: 1.1 - スムーズなチャートタイプ切り替え
   */
  const switchChartType = async (newType: 'line' | 'bar', data: ChartData): Promise<void> => {
    try {
      // 最後の操作を記録
      lastOperation.value = { type: 'switchType', args: [newType, data] };

      if (!chart.value) {
        throw new Error('チャートが初期化されていません。先にinitChart()を呼び出してください。');
      }

      // チャートタイプの検証
      if (newType !== 'line' && newType !== 'bar') {
        throw new Error(`サポートされていないチャートタイプです: ${newType}`);
      }

      // 現在のチャートタイプと同じ場合は何もしない
      if ((chart.value.config as any).type === newType) {
        console.log(`チャートタイプは既に${newType}です`);
        return;
      }

      // データの検証
      if (!data || !data.datasets || data.datasets.length === 0) {
        throw new Error('チャートタイプ切り替え用のデータが無効です');
      }

      // チャートインスタンスが有効かチェック
      if (!chart.value.canvas || !chart.value.canvas.isConnected) {
        throw new Error('チャートのCanvas要素が無効になっています');
      }

      // アニメーション付きでチャートタイプを変更
      (chart.value.config as any).type = newType;
      chart.value.data = data;

      // 積み上げ設定の更新
      if (chart.value.options?.scales) {
        const isStacked = newType === 'bar';
        if (chart.value.options.scales?.x) {
          (chart.value.options.scales.x as any).stacked = isStacked;
        }
        if (chart.value.options.scales?.y) {
          (chart.value.options.scales.y as any).stacked = isStacked;
        }
      }

      // スムーズな遷移でチャートを更新
      chart.value.update('active');

      // エラーをクリア（成功時）
      clearError();

      console.log('Chart.jsタイプ切り替え完了', {
        oldType: (chart.value.config as any).type,
        newType,
        datasets: data.datasets.length,
        labels: data.labels?.length || 0,
      });
    }
    catch (err) {
      const chartError = parseChartError(err, 'switchChartType');
      setError(chartError);
      throw new Error(chartError.userMessage);
    }
  };

  /**
   * 最後の操作をリトライ
   */
  const retryLastOperation = async (): Promise<void> => {
    if (!lastOperation.value) {
      throw new Error('リトライする操作がありません');
    }

    const { type, args } = lastOperation.value;

    try {
      clearError();

      switch (type) {
        case 'init':
          await initChart(args[0] as HTMLCanvasElement, args[1] as any);
          break;
        case 'update':
          await updateChart(args[0] as any, args[1] as any);
          break;
        case 'switchType':
          await switchChartType(args[0] as 'line' | 'bar', args[1] as any);
          break;
        default:
          throw new Error(`不明な操作タイプです: ${type}`);
      }

      console.log(`Chart.js操作のリトライが成功しました: ${type}`);
    }
    catch (err) {
      const chartError = parseChartError(err, `retry_${type}`);
      setError(chartError);
      throw new Error(chartError.userMessage);
    }
  };

  // コンポーネントがアンマウントされる際のクリーンアップ
  // テスト環境ではgetCurrentInstanceが利用できない場合があるため、try-catchで囲む
  try {
    if (getCurrentInstance()) {
      onUnmounted(() => {
        destroyChart();
      });
    }
  }
  catch (err) {
    // テスト環境などでgetCurrentInstanceが利用できない場合は無視

  }

  return {
    chart,
    isInitialized,
    error,
    errorInfo,
    isRetryable,
    initChart,
    updateChart,
    switchChartType,
    destroyChart,
    resize,
    clearError,
    retryLastOperation,
  };
}

/**
 * レスポンシブ対応のChart.js設定を生成
 * Requirements: 2.2, 2.3, 4.4 - レスポンシブデザインとモバイル対応
 */
export function createResponsiveChartConfig(
  type: 'line' | 'bar',
  data: ChartData,
  customOptions?: Partial<ChartOptions>,
): ChartConfiguration {
  const isMobile = import.meta.client && window.innerWidth < 768;
  const isTablet = import.meta.client && window.innerWidth >= 768 && window.innerWidth < 1024;
  const isTouchDevice = import.meta.client && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // デバイス固有の設定
  const deviceConfig = {
    mobile: {
      titleSize: 14,
      legendSize: 12,
      tickSize: 10,
      padding: 10,
      maxRotation: 45,
    },
    tablet: {
      titleSize: 15,
      legendSize: 13,
      tickSize: 11,
      padding: 15,
      maxRotation: 30,
    },
    desktop: {
      titleSize: 16,
      legendSize: 14,
      tickSize: 12,
      padding: 20,
      maxRotation: 0,
    },
  };

  const config = isMobile ? deviceConfig.mobile : isTablet ? deviceConfig.tablet : deviceConfig.desktop;

  const baseOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    // デバイス固有のインタラクション設定
    interaction: {
      mode: type === 'bar' ? 'index' : 'nearest',
      axis: 'x',
      intersect: false,
    },
    // アニメーション設定（パフォーマンス最適化）
    animation: {
      duration: isMobile ? 300 : 750, // モバイルでは短縮
      easing: 'easeInOutQuart',
    },
    plugins: {
      title: {
        display: true,
        text: type === 'bar' ? '食事カロリー推移（積み上げ）' : '食事カロリー推移',
        font: {
          size: config.titleSize,
          weight: 'bold',
        },
        padding: {
          top: config.padding,
          bottom: config.padding,
        },
      },
      legend: {
        display: true,
        position: isMobile ? 'bottom' : 'top',
        labels: {
          font: {
            size: config.legendSize,
          },
          padding: config.padding,
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
        // タッチデバイス用の設定
        position: isTouchDevice ? 'nearest' : 'average',
        callbacks: {
          title: (context) => {
            return `日付: ${context[0]?.label || ''}`;
          },
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toFixed(1)} kcal`;
          },
          // 積み上げ棒グラフの場合は合計も表示
          afterBody: type === 'bar'
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
            size: config.legendSize,
          },
        },
        ticks: {
          font: {
            size: config.tickSize,
          },
          maxRotation: config.maxRotation,
          minRotation: 0,
          // モバイルでは表示数を制限
          maxTicksLimit: isMobile ? 7 : undefined,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1,
        },
      },
      y: {
        display: true,
        title: {
          display: !isMobile,
          text: 'カロリー (kcal)',
          font: {
            size: config.legendSize,
          },
        },
        ticks: {
          font: {
            size: config.tickSize,
          },
          callback: function (value) {
            return `${value} kcal`;
          },
          // モバイルでは表示数を制限
          maxTicksLimit: isMobile ? 6 : 8,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
          lineWidth: 1,
        },
        beginAtZero: true,
      },
    },
    // タッチデバイス用の設定
    onHover: isTouchDevice
      ? undefined
      : (event, activeElements, chart) => {
          if (chart.canvas) {
            chart.canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default';
          }
        },
    // パフォーマンス最適化
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

  // 積み上げ棒グラフの場合の追加設定
  if (type === 'bar' && baseOptions.scales?.y) {
    (baseOptions.scales.y as any).stacked = true;
    if (baseOptions.scales.x) {
      (baseOptions.scales.x as any).stacked = true;
    }
  }

  // カスタムオプションをマージ
  const mergedOptions = customOptions ? { ...baseOptions, ...customOptions } : baseOptions;

  return {
    type,
    data,
    options: mergedOptions,
  };
}
