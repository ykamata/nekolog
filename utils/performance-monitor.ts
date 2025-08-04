/**
 * パフォーマンス監視ユーティリティ
 */

interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 100; // メモリ使用量を制限

  /**
   * API呼び出しのパフォーマンスを測定
   */
  async measureApiCall<T>(
    name: string,
    apiCall: () => Promise<T>,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await apiCall();
      const duration = performance.now() - startTime;

      this.recordMetric({
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

      this.recordMetric({
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
  }

  /**
   * 一般的な処理のパフォーマンスを測定
   */
  async measure<T>(
    name: string,
    operation: () => Promise<T> | T,
    metadata?: Record<string, unknown>,
  ): Promise<T> {
    const startTime = performance.now();

    try {
      const result = await operation();
      const duration = performance.now() - startTime;

      this.recordMetric({
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

      this.recordMetric({
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
  }

  /**
   * メトリクスを記録
   */
  private recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // メトリクス数を制限
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 開発環境でのログ出力
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log(`[Performance] ${metric.name}: ${metric.duration.toFixed(2)}ms`, metric.metadata);
    }
  }

  /**
   * 記録されたメトリクスを取得
   */
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 特定の名前のメトリクスを取得
   */
  getMetricsByName(name: string): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name);
  }

  /**
   * メトリクスをクリア
   */
  clearMetrics() {
    this.metrics = [];
  }

  /**
   * 統計情報を取得
   */
  getStats(name?: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    successRate: number;
  } {
    const targetMetrics = name
      ? this.metrics.filter(metric => metric.name === name)
      : this.metrics;

    if (targetMetrics.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
      };
    }

    const durations = targetMetrics.map(metric => metric.duration);
    const successCount = targetMetrics.filter(
      metric => metric.metadata?.status === 'success',
    ).length;

    return {
      count: targetMetrics.length,
      averageDuration: durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      successRate: successCount / targetMetrics.length,
    };
  }
}

// シングルトンインスタンス
export const performanceMonitor = new PerformanceMonitor();
