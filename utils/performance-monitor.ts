/**
 * パフォーマンス監視ユーティリティ
 * API レスポンス時間、メモリ使用量、キャッシュ効率を監視
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  apiResponseTime: number; // ms
  memoryUsage: number; // bytes
  cacheHitRate: number; // percentage
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private readonly maxMetrics = 1000;
  private readonly thresholds: PerformanceThresholds = {
    apiResponseTime: 1000, // 1秒
    memoryUsage: 50 * 1024 * 1024, // 50MB
    cacheHitRate: 70, // 70%
  };

  /**
   * メトリクスを記録
   */
  recordMetric(name: string, value: number, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.metrics.push(metric);

    // 古いメトリクスを削除してメモリ使用量を制限
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 閾値チェック
    this.checkThresholds(metric);
  }

  /**
   * API レスポンス時間を測定
   */
  measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> {
    const startTime = performance.now();

    return apiCall()
      .then((result) => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_${name}`, duration, {
          ...metadata,
          success: true,
        });
        return result;
      })
      .catch((error) => {
        const duration = performance.now() - startTime;
        this.recordMetric(`api_${name}`, duration, {
          ...metadata,
          success: false,
          error: error.message,
        });
        throw error;
      });
  }

  /**
   * メモリ使用量を監視
   */
  monitorMemoryUsage(): void {
    if (import.meta.client && 'memory' in performance) {
      const memory = (performance as any).memory;
      this.recordMetric('memory_used', memory.usedJSHeapSize, {
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      });
    }
  }

  /**
   * キャッシュ効率を記録
   */
  recordCacheMetrics(hitRate: number, totalRequests: number, hits: number): void {
    this.recordMetric('cache_hit_rate', hitRate, {
      totalRequests,
      hits,
      misses: totalRequests - hits,
    });
  }

  /**
   * 特定のメトリクスの統計を取得
   */
  getMetricStats(metricName: string, timeWindow?: number): {
    count: number;
    average: number;
    min: number;
    max: number;
    p95: number;
    recent: PerformanceMetric[];
  } {
    const now = Date.now();
    const windowStart = timeWindow ? now - timeWindow : 0;

    const relevantMetrics = this.metrics.filter(
      metric => metric.name === metricName && metric.timestamp >= windowStart,
    );

    if (relevantMetrics.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p95: 0,
        recent: [],
      };
    }

    const values = relevantMetrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((acc, val) => acc + val, 0);
    const p95Index = Math.floor(values.length * 0.95);

    return {
      count: relevantMetrics.length,
      average: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p95: values[p95Index] || values[values.length - 1],
      recent: relevantMetrics.slice(-10), // 最新10件
    };
  }

  /**
   * パフォーマンスレポートを生成
   */
  generateReport(timeWindow = 5 * 60 * 1000): {
    summary: Record<string, any>;
    apiPerformance: Record<string, any>;
    memoryUsage: Record<string, any>;
    cacheEfficiency: Record<string, any>;
    recommendations: string[];
  } {
    const apiMetrics = this.getUniqueMetricNames()
      .filter(name => name.startsWith('api_'))
      .reduce((acc, name) => {
        acc[name] = this.getMetricStats(name, timeWindow);
        return acc;
      }, {} as Record<string, any>);

    const memoryStats = this.getMetricStats('memory_used', timeWindow);
    const cacheStats = this.getMetricStats('cache_hit_rate', timeWindow);

    const recommendations = this.generateRecommendations(apiMetrics, memoryStats, cacheStats);

    return {
      summary: {
        totalMetrics: this.metrics.length,
        timeWindow: timeWindow / 1000 / 60, // minutes
        generatedAt: new Date().toISOString(),
      },
      apiPerformance: apiMetrics,
      memoryUsage: memoryStats,
      cacheEfficiency: cacheStats,
      recommendations,
    };
  }

  /**
   * パフォーマンス改善の推奨事項を生成
   */
  private generateRecommendations(
    apiMetrics: Record<string, any>,
    memoryStats: any,
    cacheStats: any,
  ): string[] {
    const recommendations: string[] = [];

    // API パフォーマンスの推奨事項
    Object.entries(apiMetrics).forEach(([name, stats]: [string, any]) => {
      if (stats.average > this.thresholds.apiResponseTime) {
        recommendations.push(
          `${name} のレスポンス時間が平均 ${Math.round(stats.average)}ms と遅いです。キャッシュの活用やクエリの最適化を検討してください。`,
        );
      }
      if (stats.p95 > this.thresholds.apiResponseTime * 2) {
        recommendations.push(
          `${name} の95パーセンタイルが ${Math.round(stats.p95)}ms と非常に遅いです。データベースインデックスの確認が必要です。`,
        );
      }
    });

    // メモリ使用量の推奨事項
    if (memoryStats.average > this.thresholds.memoryUsage) {
      recommendations.push(
        `メモリ使用量が平均 ${Math.round(memoryStats.average / 1024 / 1024)}MB と高いです。データの削減やページネーションの改善を検討してください。`,
      );
    }

    // キャッシュ効率の推奨事項
    if (cacheStats.average < this.thresholds.cacheHitRate) {
      recommendations.push(
        `キャッシュヒット率が ${Math.round(cacheStats.average)}% と低いです。キャッシュ戦略の見直しやTTLの調整を検討してください。`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('パフォーマンスは良好です。現在の最適化戦略を継続してください。');
    }

    return recommendations;
  }

  /**
   * 閾値チェック
   */
  private checkThresholds(metric: PerformanceMetric): void {
    if (metric.name.startsWith('api_') && metric.value > this.thresholds.apiResponseTime) {
      console.warn(`⚠️ API ${metric.name} のレスポンス時間が ${metric.value}ms と遅いです`);
    }

    if (metric.name === 'memory_used' && metric.value > this.thresholds.memoryUsage) {
      console.warn(`⚠️ メモリ使用量が ${Math.round(metric.value / 1024 / 1024)}MB と高いです`);
    }

    if (metric.name === 'cache_hit_rate' && metric.value < this.thresholds.cacheHitRate) {
      console.warn(`⚠️ キャッシュヒット率が ${metric.value}% と低いです`);
    }
  }

  /**
   * ユニークなメトリクス名を取得
   */
  private getUniqueMetricNames(): string[] {
    return Array.from(new Set(this.metrics.map(m => m.name)));
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * メトリクスをエクスポート（デバッグ用）
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
}

// グローバルインスタンス
export const performanceMonitor = new PerformanceMonitor();

// 自動メモリ監視を開始
if (import.meta.client) {
  setInterval(() => {
    performanceMonitor.monitorMemoryUsage();
  }, 30000); // 30秒ごと
}

// パフォーマンス監視用のComposable
export const usePerformanceMonitor = () => {
  const isMonitoring = ref(false);
  const currentReport = ref<any>(null);

  const startMonitoring = () => {
    isMonitoring.value = true;
  };

  const stopMonitoring = () => {
    isMonitoring.value = false;
  };

  const generateReport = (timeWindow?: number) => {
    currentReport.value = performanceMonitor.generateReport(timeWindow);
    return currentReport.value;
  };

  const measureApiCall = <T>(
    name: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, any>,
  ): Promise<T> => {
    if (!isMonitoring.value) {
      return apiCall();
    }
    return performanceMonitor.measureApiCall(name, apiCall, metadata);
  };

  return {
    isMonitoring: readonly(isMonitoring),
    currentReport: readonly(currentReport),
    startMonitoring,
    stopMonitoring,
    generateReport,
    measureApiCall,
  };
};

export default PerformanceMonitor;
