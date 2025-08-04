/**
 * フロントエンドパフォーマンス監視用のComposable
 */

// PerformanceEventTiming インターフェースの型定義（ブラウザサポートが不完全な場合の対応）
interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
  processingEnd: number;
  cancelable?: boolean;
}

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface VitalMetrics {
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  fid?: number; // First Input Delay
  cls?: number; // Cumulative Layout Shift
  ttfb?: number; // Time to First Byte
}

export const usePerformanceMonitor = () => {
  const metrics = ref<PerformanceMetric[]>([]);
  const vitals = ref<VitalMetrics>({});
  const isSupported = ref(false);

  // パフォーマンス API のサポート確認
  const checkSupport = () => {
    if (import.meta.client) {
      isSupported.value = 'performance' in window && 'PerformanceObserver' in window;
    }
  };

  // メトリクスを記録
  const recordMetric = (metric: PerformanceMetric) => {
    metrics.value.push(metric);

    // メトリクス数を制限（メモリ使用量を抑制）
    if (metrics.value.length > 100) {
      metrics.value = metrics.value.slice(-100);
    }

    // 開発環境でのログ出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`, metric.metadata);
    }
  };

  // 処理時間を測定
  const measure = async <T>(
    name: string,
    operation: () => Promise<T> | T,
    metadata?: Record<string, unknown>,
  ): Promise<T> => {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          status: 'success',
        },
      });

      return result;
    }
    catch (error) {
      const duration = performance.now() - startTime;

      recordMetric({
        name,
        duration,
        timestamp: Date.now(),
        metadata: {
          ...metadata,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      throw error;
    }
  };

  // Web Vitals を監視
  const observeWebVitals = () => {
    if (!isSupported.value) return;

    try {
      // First Contentful Paint
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          vitals.value.fcp = fcpEntry.startTime;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          vitals.value.lcp = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const firstEntry = entries[0] as PerformanceEventTiming;
        if (firstEntry && 'processingStart' in firstEntry) {
          vitals.value.fid = firstEntry.processingStart - firstEntry.startTime;
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const layoutShiftEntry = entry as PerformanceEntry & {
            hadRecentInput?: boolean;
            value?: number;
          };
          if (!layoutShiftEntry.hadRecentInput && layoutShiftEntry.value) {
            clsValue += layoutShiftEntry.value;
          }
        }
        vitals.value.cls = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });

      // Navigation Timing (TTFB)
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const navEntry = entries[0] as PerformanceNavigationTiming;
        if (navEntry) {
          vitals.value.ttfb = navEntry.responseStart - navEntry.requestStart;
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
    }
    catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Web Vitals monitoring failed:', error);
    }
  };

  // リソース読み込み時間を監視
  const observeResourceTiming = () => {
    if (!isSupported.value) return;

    const resourceObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();

      entries.forEach((entry) => {
        const resource = entry as PerformanceResourceTiming;

        // 画像リソースの読み込み時間を記録
        if (resource.initiatorType === 'img') {
          recordMetric({
            name: 'image-load',
            duration: resource.responseEnd - resource.requestStart,
            timestamp: Date.now(),
            metadata: {
              url: resource.name,
              size: resource.transferSize,
              cached: resource.transferSize === 0,
            },
          });
        }

        // API呼び出しの時間を記録
        if (resource.name.includes('/api/')) {
          recordMetric({
            name: 'api-request',
            duration: resource.responseEnd - resource.requestStart,
            timestamp: Date.now(),
            metadata: {
              url: resource.name,
              size: resource.transferSize,
            },
          });
        }
      });
    });

    resourceObserver.observe({ entryTypes: ['resource'] });
  };

  // コンポーネントレンダリング時間を測定
  const measureComponentRender = (componentName: string) => {
    if (!isSupported.value) return { start: () => {}, end: () => {} };

    let startTime: number;

    return {
      start: () => {
        startTime = performance.now();
      },
      end: () => {
        const duration = performance.now() - startTime;
        recordMetric({
          name: 'component-render',
          duration,
          timestamp: Date.now(),
          metadata: {
            component: componentName,
          },
        });
      },
    };
  };

  // 統計情報を取得
  const getStats = (metricName?: string) => {
    const targetMetrics = metricName
      ? metrics.value.filter(m => m.name === metricName)
      : metrics.value;

    if (targetMetrics.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p95: 0,
      };
    }

    const durations = targetMetrics.map(m => m.duration).sort((a, b) => a - b);
    const count = durations.length;
    const sum = durations.reduce((acc, d) => acc + d, 0);
    const p95Index = Math.floor(count * 0.95);

    return {
      count,
      average: sum / count,
      min: durations[0],
      max: durations[count - 1],
      p95: durations[p95Index] || 0,
    };
  };

  // パフォーマンスレポートを生成
  const generateReport = () => {
    const report = {
      vitals: vitals.value,
      metrics: {
        'component-render': getStats('component-render'),
        'api-request': getStats('api-request'),
        'image-load': getStats('image-load'),
      },
      recommendations: [] as string[],
    };

    // パフォーマンス改善の推奨事項
    if (vitals.value.fcp && vitals.value.fcp > 2500) {
      report.recommendations.push('First Contentful Paint が遅いです。画像の最適化やコードの分割を検討してください。');
    }

    if (vitals.value.lcp && vitals.value.lcp > 4000) {
      report.recommendations.push('Largest Contentful Paint が遅いです。重要なリソースの優先読み込みを検討してください。');
    }

    if (vitals.value.cls && vitals.value.cls > 0.25) {
      report.recommendations.push('Cumulative Layout Shift が大きいです。レイアウトの安定性を改善してください。');
    }

    const apiStats = getStats('api-request');
    if (apiStats.average > 1000) {
      report.recommendations.push('API レスポンス時間が遅いです。キャッシュやデータベース最適化を検討してください。');
    }

    return report;
  };

  // 初期化
  onMounted(() => {
    checkSupport();
    if (isSupported.value) {
      observeWebVitals();
      observeResourceTiming();
    }
  });

  return {
    metrics: readonly(metrics),
    vitals: readonly(vitals),
    isSupported: readonly(isSupported),
    measure,
    measureComponentRender,
    getStats,
    generateReport,
  };
};
