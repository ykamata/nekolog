import type {
  VeterinaryVisitWithRelations,
  CreateVeterinaryVisitInput,
  UpdateVeterinaryVisitInput,
  GetVeterinaryVisitsParams,
  GetVeterinaryVisitsResponse,
} from '~/types/veterinary-visit';
import { performanceMonitor } from '~/utils/performance-monitor';

/**
 * 通院記録管理用のComposable
 * データ取得・作成・更新・削除機能とエラーハンドリング、ローディング状態管理を提供
 */
export const useVeterinaryVisits = () => {
  // リアクティブな状態管理
  const visits = ref<VeterinaryVisitWithRelations[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const hasMore = ref(false);

  // 現在のフィルタ条件を保持
  const currentParams = ref<GetVeterinaryVisitsParams>({});

  /**
   * エラー状態をクリア
   */
  const clearError = () => {
    error.value = null;
  };

  /**
   * 通院記録一覧を取得
   * @param params 検索・フィルタ条件
   * @param append 既存データに追加するかどうか（ページネーション用）
   */
  const fetchVisits = async (params: GetVeterinaryVisitsParams = {}, append = false) => {
    loading.value = true;
    clearError();

    try {
      const response = await performanceMonitor.measureApiCall(
        'veterinary-visits-fetch',
        () => $fetch<GetVeterinaryVisitsResponse>('/api/veterinary-visits', {
          query: params,
        }),
        { params, append },
      );

      if (append) {
        visits.value = [...visits.value, ...response.visits];
      }
      else {
        visits.value = response.visits;
      }

      total.value = response.total;
      hasMore.value = response.hasMore;
      currentParams.value = params;

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
    }
  };

  /**
   * 次のページを読み込み（ページネーション）
   */
  const loadMore = async () => {
    if (!hasMore.value || loading.value) return;

    const offset = visits.value.length;
    await fetchVisits({ ...currentParams.value, offset }, true);
  };

  /**
   * 特定の通院記録を取得
   * @param id 通院記録ID
   */
  const fetchVisit = async (id: number) => {
    loading.value = true;
    clearError();

    try {
      const visit = await $fetch<VeterinaryVisitWithRelations>(`/api/veterinary-visits/${id}`);
      return visit;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '通院記録の取得に失敗しました';
      error.value = errorMessage;
      console.error('Failed to fetch veterinary visit:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 新しい通院記録を作成
   * @param data 作成データ
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
   * 通院記録を更新
   * @param data 更新データ
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
   * 通院記録を削除
   * @param id 削除する通院記録ID
   */
  const deleteVisit = async (id: number) => {
    loading.value = true;
    clearError();

    try {
      await $fetch(`/api/veterinary-visits/${id}`, {
        method: 'DELETE' as any,
      });

      // 既存のリストから該当記録を削除
      visits.value = visits.value.filter(visit => visit.id !== id);
      total.value = Math.max(0, total.value - 1);

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
   * 猫別の通院記録を取得
   * @param catId 猫ID
   * @param params 追加の検索条件
   */
  const fetchVisitsByCat = async (catId: number, params: Omit<GetVeterinaryVisitsParams, 'catId'> = {}) => {
    return await fetchVisits({ ...params, catId });
  };

  /**
   * 日付範囲で通院記録を取得
   * @param startDate 開始日
   * @param endDate 終了日
   * @param params 追加の検索条件
   */
  const fetchVisitsByDateRange = async (
    startDate: Date,
    endDate: Date,
    params: Omit<GetVeterinaryVisitsParams, 'startDate' | 'endDate'> = {},
  ) => {
    return await fetchVisits({
      ...params,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  /**
   * 血液検査実施記録のみを取得
   * @param params 追加の検索条件
   */
  const fetchBloodTestVisits = async (params: GetVeterinaryVisitsParams = {}) => {
    // Note: hasBloodTest フィルタは API 側で実装されていないため、
    // クライアント側でフィルタリングを行う
    const response = await fetchVisits(params);
    const bloodTestVisits = visits.value.filter(visit => visit.hasBloodTest);

    return {
      visits: bloodTestVisits,
      total: bloodTestVisits.length,
      hasMore: false,
    };
  };

  /**
   * データをリフレッシュ（現在のパラメータで再取得）
   */
  const refresh = async () => {
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

  // 読み取り専用の computed プロパティ
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);
  const isEmpty = computed(() => visits.value.length === 0);
  const canLoadMore = computed(() => hasMore.value && !loading.value);

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

    // メソッド
    fetchVisits,
    fetchVisit,
    createVisit,
    updateVisit,
    deleteVisit,
    fetchVisitsByCat,
    fetchVisitsByDateRange,
    fetchBloodTestVisits,
    loadMore,
    refresh,
    reset,
    clearError,
  };
};
