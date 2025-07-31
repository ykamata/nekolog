import type {
  VeterinaryVisitWithRelations,
  CreateVeterinaryVisitInput,
  UpdateVeterinaryVisitInput,
  GetVeterinaryVisitsParams,
  GetVeterinaryVisitsResponse,
} from '~/types/veterinary-visit';
import { apiCache, createCacheKey, invalidateRelatedCache } from '~/utils/cache';

/**
 * パフォーマンス最適化された通院記録管理用のComposable
 * キャッシュ戦略、効率的なデータ取得、メモリ管理を含む
 */
export const useVeterinaryVisitsOptimized = () => {
  // リアクティブな状態管理
  const visits = ref<VeterinaryVisitWithRelations[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const hasMore = ref(false);

  // 現在のフィルタ条件を保持
  const currentParams = ref<GetVeterinaryVisitsParams>({});

  // パフォーマンス監視用
  const lastFetchTime = ref<number>(0);
  const cacheHitRate = ref<number>(0);
  const totalRequests = ref<number>(0);
  const cacheHits = ref<number>(0);

  /**
   * エラー状態をクリア
   */
  const clearError = () => {
    error.value = null;
  };

  /**
   * キャッシュキーを生成
   */
  const generateCacheKey = (params: GetVeterinaryVisitsParams): string => {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key as keyof GetVeterinaryVisitsParams];
        return result;
      }, {} as any);

    return createCacheKey('veterinary-visits', JSON.stringify(sortedParams));
  };

  /**
   * 最適化された通院記録一覧取得
   * キャッシュを活用し、必要最小限のデータのみを取得
   */
  const fetchVisits = async (params: GetVeterinaryVisitsParams = {}, append = false) => {
    const startTime = performance.now();
    loading.value = true;
    clearError();
    totalRequests.value++;

    try {
      const cacheKey = generateCacheKey(params);

      // キャッシュから取得を試行
      const cachedData = apiCache.get(cacheKey);
      if (cachedData && !append) {
        visits.value = cachedData.visits;
        total.value = cachedData.total;
        hasMore.value = cachedData.hasMore;
        currentParams.value = params;
        cacheHits.value++;
        cacheHitRate.value = (cacheHits.value / totalRequests.value) * 100;
        loading.value = false;
        return cachedData;
      }

      // 効率的なクエリパラメータの構築
      const optimizedParams = {
        ...params,
        // デフォルトのページサイズを調整（カレンダー表示用は多め、一覧表示用は少なめ）
        limit: params.limit || (params.startDate && params.endDate ? 100 : 20),
      };

      const response = await $fetch<GetVeterinaryVisitsResponse>('/api/veterinary-visits', {
        query: optimizedParams,
        // リクエストの重複を防ぐ
        // key: cacheKey, // Remove unsupported key option
      });

      // データの更新
      if (append) {
        visits.value = [...visits.value, ...response.visits];
      }
      else {
        visits.value = response.visits;
        // 成功したレスポンスをキャッシュに保存
        apiCache.set(cacheKey, response, 2 * 60 * 1000); // 2分間キャッシュ
      }

      total.value = response.total;
      hasMore.value = response.hasMore;
      currentParams.value = params;

      lastFetchTime.value = performance.now() - startTime;
      return response;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || 'データの取得に失敗しました';
      error.value = errorMessage;
      console.error('Failed to fetch veterinary visits:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
      cacheHitRate.value = (cacheHits.value / totalRequests.value) * 100;
    }
  };

  /**
   * 効率的な次ページ読み込み
   * 重複リクエストを防ぎ、メモリ使用量を監視
   */
  const loadMore = async () => {
    if (!hasMore.value || loading.value) return;

    // メモリ使用量チェック
    if (visits.value.length > 500) {
      console.warn('大量のデータが読み込まれています。パフォーマンスに影響する可能性があります。');
    }

    const offset = visits.value.length;
    await fetchVisits({ ...currentParams.value, offset }, true);
  };

  /**
   * 日付範囲での効率的な取得（カレンダー表示用）
   */
  const fetchVisitsByDateRange = async (
    startDate: Date,
    endDate: Date,
    params: Omit<GetVeterinaryVisitsParams, 'startDate' | 'endDate'> = {},
  ) => {
    // 日付範囲が大きすぎる場合は警告
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 365) {
      console.warn('大きな日付範囲が指定されました。パフォーマンスのため範囲を狭めることを推奨します。');
    }

    return await fetchVisits({
      ...params,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: Math.min(daysDiff * 2, 200), // 日数に応じて動的にlimitを調整
    });
  };

  /**
   * 猫別の効率的な取得
   */
  const fetchVisitsByCat = async (catId: string, params: Omit<GetVeterinaryVisitsParams, 'catId'> = {}) => {
    return await fetchVisits({ ...params, catId });
  };

  /**
   * 新しい通院記録を作成（キャッシュ無効化付き）
   */
  const createVisit = async (data: CreateVeterinaryVisitInput) => {
    loading.value = true;
    clearError();

    try {
      const newVisit = await $fetch<VeterinaryVisitWithRelations>('/api/veterinary-visits', {
        method: 'POST',
        body: data,
      });

      // 既存のリストに新しい記録を追加（時系列順を維持）
      visits.value = [newVisit, ...visits.value];
      total.value += 1;

      // 関連するキャッシュを無効化
      invalidateRelatedCache('veterinary-visits');

      return newVisit;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '通院記録の作成に失敗しました';
      error.value = errorMessage;
      console.error('Failed to create veterinary visit:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 通院記録を更新（キャッシュ無効化付き）
   */
  const updateVisit = async (data: UpdateVeterinaryVisitInput) => {
    loading.value = true;
    clearError();

    try {
      const updatedVisit = await $fetch<VeterinaryVisitWithRelations>(`/api/veterinary-visits/${data.id}`, {
        method: 'PUT' as any,
        body: data,
      });

      // 既存のリスト内の該当記録を更新
      const index = visits.value.findIndex(visit => visit.id === data.id);
      if (index !== -1) {
        visits.value[index] = updatedVisit;
      }

      // 関連するキャッシュを無効化
      invalidateRelatedCache('veterinary-visits');

      return updatedVisit;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '通院記録の更新に失敗しました';
      error.value = errorMessage;
      console.error('Failed to update veterinary visit:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 通院記録を削除（キャッシュ無効化付き）
   */
  const deleteVisit = async (id: string) => {
    loading.value = true;
    clearError();

    try {
      await $fetch(`/api/veterinary-visits/${id}`, {
        method: 'DELETE' as any,
      });

      // 既存のリストから該当記録を削除
      visits.value = visits.value.filter(visit => visit.id !== id);
      total.value = Math.max(0, total.value - 1);

      // 関連するキャッシュを無効化
      invalidateRelatedCache('veterinary-visits');

      return true;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '通院記録の削除に失敗しました';
      error.value = errorMessage;
      console.error('Failed to delete veterinary visit:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * プリフェッチ機能（事前にデータを読み込み）
   */
  const prefetchVisits = async (params: GetVeterinaryVisitsParams) => {
    const cacheKey = generateCacheKey(params);
    if (!apiCache.has(cacheKey)) {
      // バックグラウンドで取得（UIには影響しない）
      $fetch<GetVeterinaryVisitsResponse>('/api/veterinary-visits', {
        query: params,
      }).then((response) => {
        apiCache.set(cacheKey, response, 2 * 60 * 1000);
      }).catch(() => {
        // プリフェッチのエラーは無視
      });
    }
  };

  /**
   * データをリフレッシュ（キャッシュをクリアして再取得）
   */
  const refresh = async () => {
    const cacheKey = generateCacheKey(currentParams.value);
    apiCache.delete(cacheKey);
    await fetchVisits(currentParams.value);
  };

  /**
   * 状態をリセット
   */
  const reset = () => {
    visits.value = [];
    loading.value = false;
    error.value = null;
    total.value = 0;
    hasMore.value = false;
    currentParams.value = {};
  };

  /**
   * パフォーマンス統計を取得
   */
  const getPerformanceStats = () => {
    return {
      lastFetchTime: lastFetchTime.value,
      cacheHitRate: cacheHitRate.value,
      totalRequests: totalRequests.value,
      cacheHits: cacheHits.value,
      currentDataSize: visits.value.length,
      cacheStats: apiCache.getStats(),
    };
  };

  // 読み取り専用の computed プロパティ
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);
  const isEmpty = computed(() => visits.value.length === 0);
  const canLoadMore = computed(() => hasMore.value && !loading.value);
  const isOptimalPerformance = computed(() => lastFetchTime.value < 500); // 500ms以下を最適とする

  return {
    // 状態
    visits: readonly(visits),
    loading: readonly(loading),
    error: readonly(error),
    total: readonly(total),
    hasMore: readonly(hasMore),
    currentParams: readonly(currentParams),

    // Computed
    isLoading,
    hasError,
    isEmpty,
    canLoadMore,
    isOptimalPerformance,

    // メソッド
    fetchVisits,
    fetchVisitsByCat,
    fetchVisitsByDateRange,
    createVisit,
    updateVisit,
    deleteVisit,
    loadMore,
    prefetchVisits,
    refresh,
    reset,
    clearError,
    getPerformanceStats,
  };
};
