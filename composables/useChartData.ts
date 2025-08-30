/**
 * チャートデータ取得・キャッシュ管理用composable
 * Requirements: 4.1, 4.2 - パフォーマンス最適化とキャッシュ機能
 */

import { getChartCache, type ChartFilters, type ProcessedChartData } from '~/utils/chart-cache';

export interface ChartDataState {
  data: Ref<ProcessedChartData | null>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  lastFetch: Ref<Date | null>;
  cacheHit: Ref<boolean>;
}

export interface ChartDataActions {
  fetchData: (filters: ChartFilters, forceRefresh?: boolean) => Promise<void>;
  refreshData: () => Promise<void>;
  clearCache: (pattern?: string) => void;
  invalidateCat: (catId: string) => void;
  warmCache: (commonFilters: ChartFilters[]) => Promise<void>;
  getCacheStats: () => any;
}

export interface UseChartDataReturn extends ChartDataState, ChartDataActions {}

/**
 * チャートデータの取得とキャッシュ管理
 */
export function useChartData(): UseChartDataReturn {
  const data = ref<ProcessedChartData | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const lastFetch = ref<Date | null>(null);
  const cacheHit = ref(false);

  // 現在のフィルター状態を保持
  const currentFilters = ref<ChartFilters | null>(null);

  // キャッシュインスタンス
  const cache = getChartCache();

  /**
   * APIからチャートデータを取得
   */
  const fetchFromAPI = async (filters: ChartFilters): Promise<ProcessedChartData> => {
    const { catId, dateRange, chartType } = filters;

    // クエリパラメータを構築
    const params = new URLSearchParams();
    if (catId) {
      params.append('catId', catId);
    }
    params.append('startDate', dateRange.start.toISOString().split('T')[0]!);
    params.append('endDate', dateRange.end.toISOString().split('T')[0]!);
    params.append('chartType', chartType);

    const response = await $fetch<{
      success: boolean;
      data: {
        dailyCalories: Array<{
          date: string;
          catId: string;
          catName: string;
          totalCalories: number;
          dryFoodCalories: number;
          wetFoodCalories: number;
          mealCount: number;
        }>;
        summary: {
          totalMeals: number;
          averageCalories: number;
          dateRange: {
            start: string;
            end: string;
          };
        };
      };
      error?: string;
    }>(`/api/analytics/meals?${params.toString()}`);

    if (!response.success) {
      throw new Error(response.error || 'データの取得に失敗しました');
    }

    // APIレスポンスをProcessedChartData形式に変換
    const { dailyCalories } = response.data;

    if (!dailyCalories || dailyCalories.length === 0) {
      return {
        labels: [],
        datasets: [],
        isEmpty: true,
        dateRange: filters.dateRange,
      };
    }

    // 日付ラベルを生成
    const labels = dailyCalories.map((item) => {
      const date = new Date(item.date);
      return date.toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      });
    });

    // チャートタイプに応じてデータセットを生成
    let datasets: any[] = [];

    if (chartType === 'line') {
      // 線グラフ: 合計カロリーのみ
      datasets = [{
        label: '合計カロリー',
        data: dailyCalories.map(item => item.totalCalories),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
      }];
    }
    else if (chartType === 'bar') {
      // 棒グラフ: 合計カロリー
      datasets = [{
        label: '合計カロリー',
        data: dailyCalories.map(item => item.totalCalories),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      }];
    }
    else if (chartType === 'stacked-bar') {
      // 積み上げ棒グラフ: ドライ・ウェット別
      datasets = [
        {
          label: 'ドライフード',
          data: dailyCalories.map(item => item.dryFoodCalories),
          backgroundColor: 'rgba(245, 158, 11, 0.8)',
          borderColor: 'rgb(245, 158, 11)',
          borderWidth: 1,
        },
        {
          label: 'ウェットフード',
          data: dailyCalories.map(item => item.wetFoodCalories),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 1,
        },
      ];
    }

    return {
      labels,
      datasets,
      isEmpty: false,
      dateRange: filters.dateRange,
    };
  };

  /**
   * データを取得（キャッシュ優先）
   */
  const fetchData = async (filters: ChartFilters, forceRefresh = false): Promise<void> => {
    try {
      isLoading.value = true;
      error.value = null;
      cacheHit.value = false;
      currentFilters.value = filters;

      // キャッシュから取得を試行（強制リフレッシュでない場合）
      if (!forceRefresh) {
        const cachedData = cache.get(filters);
        if (cachedData) {
          data.value = cachedData;
          cacheHit.value = true;
          lastFetch.value = new Date();
          console.log('チャートデータをキャッシュから取得しました', {
            filters,
            dataPoints: cachedData.labels.length,
          });
          return;
        }
      }

      // APIからデータを取得
      console.log('APIからチャートデータを取得中...', filters);
      const fetchedData = await fetchFromAPI(filters);

      // キャッシュに保存
      cache.set(filters, fetchedData);

      data.value = fetchedData;
      lastFetch.value = new Date();

      console.log('チャートデータをAPIから取得しました', {
        filters,
        dataPoints: fetchedData.labels.length,
        isEmpty: fetchedData.isEmpty,
      });
    }
    catch (err) {
      console.error('チャートデータ取得エラー:', err);
      error.value = err instanceof Error ? err.message : 'データの取得に失敗しました';
      data.value = null;
    }
    finally {
      isLoading.value = false;
    }
  };

  /**
   * 現在のフィルターでデータを再取得
   */
  const refreshData = async (): Promise<void> => {
    if (!currentFilters.value) {
      throw new Error('リフレッシュするフィルターが設定されていません');
    }
    await fetchData(currentFilters.value, true);
  };

  /**
   * キャッシュをクリア
   */
  const clearCache = (pattern?: string): void => {
    cache.invalidate(pattern);
    console.log('チャートキャッシュをクリアしました', { pattern });
  };

  /**
   * 特定の猫のキャッシュを無効化
   */
  const invalidateCat = (catId: string): void => {
    cache.invalidateCat(catId);
    console.log('猫のキャッシュを無効化しました', { catId });
  };

  /**
   * よく使用されるフィルターでキャッシュをウォーミング
   */
  const warmCache = async (commonFilters: ChartFilters[]): Promise<void> => {
    console.log('キャッシュウォーミングを開始します', { filterCount: commonFilters.length });

    await cache.warmCache(commonFilters, fetchFromAPI);

    console.log('キャッシュウォーミングが完了しました');
  };

  /**
   * キャッシュ統計情報を取得
   */
  const getCacheStats = () => {
    return cache.getStats();
  };

  // コンポーネントがアンマウントされる際のクリーンアップ
  try {
    if (getCurrentInstance()) {
      onUnmounted(() => {
        // 必要に応じてクリーンアップ処理を追加
      });
    }
  }
  catch (err) {
    // テスト環境などでgetCurrentInstanceが利用できない場合は無視
  }

  return {
    // State
    data,
    isLoading,
    error,
    lastFetch,
    cacheHit,

    // Actions
    fetchData,
    refreshData,
    clearCache,
    invalidateCat,
    warmCache,
    getCacheStats,
  };
}
