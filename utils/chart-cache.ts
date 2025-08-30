/**
 * チャートデータキャッシュユーティリティ
 * TTLベースの無効化とフィルターパラメータベースのキー生成を提供
 */

export interface ChartFilters {
  catId?: string;
  dateRange: {
    start: Date;
    end: Date;
  };
  chartType: 'line' | 'bar' | 'stacked-bar';
}

export interface ProcessedChartData {
  labels: string[];
  datasets: any[];
  isEmpty: boolean;
  dateRange: {
    start: Date;
    end: Date;
  };
}

interface CacheEntry {
  key: string;
  data: ProcessedChartData;
  timestamp: Date;
  ttl: number;
}

/**
 * チャートデータキャッシュクラス
 * メモリベースのキャッシュでTTL機能付き
 */
export class ChartDataCache {
  private cache = new Map<string, CacheEntry>();
  private defaultTTL = 5 * 60 * 1000; // 5分（ミリ秒）
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(defaultTTL?: number) {
    if (defaultTTL) {
      this.defaultTTL = defaultTTL;
    }

    // 定期的なクリーンアップを開始
    this.startCleanup();
  }

  /**
   * フィルターパラメータからキャッシュキーを生成
   */
  private generateKey(filters: ChartFilters): string {
    const { catId, dateRange, chartType } = filters;
    const startStr = dateRange.start.toISOString().split('T')[0];
    const endStr = dateRange.end.toISOString().split('T')[0];

    return `chart_${catId || 'all'}_${startStr}_${endStr}_${chartType}`;
  }

  /**
   * キャッシュからデータを取得
   */
  get(filters: ChartFilters): ProcessedChartData | null {
    const key = this.generateKey(filters);
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // TTLチェック
    const now = new Date();
    const isExpired = (now.getTime() - entry.timestamp.getTime()) > entry.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * キャッシュにデータを保存
   */
  set(filters: ChartFilters, data: ProcessedChartData, ttl?: number): void {
    const key = this.generateKey(filters);
    const entry: CacheEntry = {
      key,
      data,
      timestamp: new Date(),
      ttl: ttl || this.defaultTTL,
    };

    this.cache.set(key, entry);
  }

  /**
   * パターンに基づいてキャッシュを無効化
   */
  invalidate(pattern?: string): void {
    if (!pattern) {
      // 全キャッシュをクリア
      this.cache.clear();
      return;
    }

    // パターンマッチングでキャッシュを削除
    const keysToDelete: string[] = [];

    for (const [key] of this.cache) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 特定の猫のキャッシュを無効化
   */
  invalidateCat(catId: string): void {
    this.invalidate(`_${catId}_`);
  }

  /**
   * 期限切れエントリのクリーンアップ
   */
  private cleanup(): void {
    const now = new Date();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      const isExpired = (now.getTime() - entry.timestamp.getTime()) > entry.ttl;
      if (isExpired) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * 定期クリーンアップを開始
   */
  private startCleanup(): void {
    // 1分ごとにクリーンアップを実行
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  /**
   * クリーンアップを停止
   */
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * キャッシュ統計情報を取得
   */
  getStats() {
    const now = new Date();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      const isExpired = (now.getTime() - entry.timestamp.getTime()) > entry.ttl;
      if (isExpired) {
        expiredEntries++;
      }
      else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      hitRate: 0, // 実装時に追加予定
    };
  }

  /**
   * よく使用されるデータのキャッシュウォーミング
   */
  async warmCache(commonFilters: ChartFilters[], dataFetcher: (filters: ChartFilters) => Promise<ProcessedChartData>): Promise<void> {
    const promises = commonFilters.map(async (filters) => {
      try {
        const data = await dataFetcher(filters);
        this.set(filters, data);
      }
      catch (error) {
        console.warn('キャッシュウォーミング中にエラーが発生しました:', error);
      }
    });

    await Promise.all(promises);
  }
}

// シングルトンインスタンス
let cacheInstance: ChartDataCache | null = null;

/**
 * グローバルキャッシュインスタンスを取得
 */
export function getChartCache(): ChartDataCache {
  if (!cacheInstance) {
    cacheInstance = new ChartDataCache();
  }
  return cacheInstance;
}

/**
 * キャッシュインスタンスを破棄（テスト用）
 */
export function destroyChartCache(): void {
  if (cacheInstance) {
    cacheInstance.stopCleanup();
    cacheInstance = null;
  }
}
