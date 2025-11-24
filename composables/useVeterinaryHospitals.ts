import type {
  VeterinaryHospital,
  VeterinaryHospitalInput,
  UseVeterinaryHospitalsReturn,
  PaginationInfo,
  VeterinaryHospitalListResponse,
} from '~/types/veterinary-master';

/**
 * 病院管理のComposable
 * 病院のCRUD操作と検索機能を提供
 */
export const useVeterinaryHospitals = (): UseVeterinaryHospitalsReturn => {
  // リアクティブデータ
  const hospitals = ref<VeterinaryHospital[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const pagination = ref<PaginationInfo | null>(null);

  // エラーハンドリング用（テスト環境では利用できない場合がある）
  let handleError: ((error: unknown, context: 'hospital' | 'doctor', operation: string, showNotification?: boolean) => any) | null = null;
  let showSuccess: ((context: 'hospital' | 'doctor', operation: string, customMessage?: string) => void) | null = null;
  let getLoadingMessage: ((context: 'hospital' | 'doctor', operation: string) => string) | null = null;

  try {
    const errorHandler = useVeterinaryMasterError();
    handleError = errorHandler.handleError;
    showSuccess = errorHandler.showSuccess;
    getLoadingMessage = errorHandler.getLoadingMessage;
  }
  catch (error) {
    // テスト環境などで利用できない場合
    console.warn('useVeterinaryMasterError is not available, error handling will be limited');
    handleError = (error: unknown) => ({ hasError: true, message: 'エラーが発生しました' });
    showSuccess = () => {};
    getLoadingMessage = () => '処理中...';
  }

  /**
   * ローディング状態を管理
   */
  const setLoading = (isLoading: boolean, operation?: string): void => {
    loading.value = isLoading;
    if (isLoading && operation) {
      // ローディングメッセージをログに出力（必要に応じてUIに表示）
      if (getLoadingMessage) {
        console.log(getLoadingMessage('hospital', operation));
      }
    }
  };

  /**
   * エラー状態をクリア
   */
  const clearError = (): void => {
    error.value = null;
  };

  /**
   * 病院一覧を取得（ページネーション対応）
   */
  const fetchHospitals = async (searchQuery?: string, page: number = 1, limit: number = 20): Promise<void> => {
    setLoading(true, 'fetch');
    clearError();

    try {
      const params = new URLSearchParams();
      if (searchQuery?.trim()) {
        params.append('query', searchQuery.trim());
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await $fetch<VeterinaryHospitalListResponse>('/api/veterinary-hospitals', {
        query: Object.fromEntries(params),
      });

      // ページが1の場合は新しいデータで置き換え、それ以外は追加（無限スクロール対応）
      if (page === 1) {
        hospitals.value = response.hospitals;
      }
      else {
        hospitals.value.push(...response.hospitals);
      }

      pagination.value = response.pagination;
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'hospital', 'fetch');
        error.value = errorState.message;
      }
      else {
        error.value = '病院一覧の取得に失敗しました';
      }
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 病院を新規作成
   */
  const createHospital = async (hospitalData: VeterinaryHospitalInput): Promise<VeterinaryHospital> => {
    setLoading(true, 'create');
    clearError();

    try {
      const response = await $fetch<VeterinaryHospital>('/api/veterinary-hospitals', {
        method: 'POST',
        body: hospitalData,
      });

      // ローカルの配列に追加
      hospitals.value.unshift(response);

      if (showSuccess) {
        showSuccess('hospital', 'create');
      }
      return response;
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'hospital', 'create');
        error.value = errorState.message;
      }
      else {
        error.value = '病院の登録に失敗しました';
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 病院情報を更新
   */
  const updateHospital = async (id: number, hospitalData: VeterinaryHospitalInput): Promise<VeterinaryHospital> => {
    setLoading(true, 'update');
    clearError();

    try {
      const response = await $fetch<VeterinaryHospital>(`/api/veterinary-hospitals/${id}`, {
        method: 'PUT',
        body: hospitalData,
      });

      // ローカルの配列を更新
      const index = hospitals.value.findIndex(h => h.id === id);
      if (index !== -1) {
        hospitals.value[index] = response;
      }

      if (showSuccess) {
        showSuccess('hospital', 'update');
      }
      return response;
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'hospital', 'update');
        error.value = errorState.message;
      }
      else {
        error.value = '病院情報の更新に失敗しました';
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 病院を削除
   */
  const deleteHospital = async (id: number): Promise<void> => {
    setLoading(true, 'delete');
    clearError();

    try {
      await $fetch(`/api/veterinary-hospitals/${id}`, {
        method: 'DELETE' as any,
      });

      // ローカルの配列から削除
      hospitals.value = hospitals.value.filter(h => h.id !== id);

      if (showSuccess) {
        showSuccess('hospital', 'delete');
      }
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'hospital', 'delete');
        error.value = errorState.message;
      }
      else {
        error.value = '病院の削除に失敗しました';
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 病院を検索（API を使用）
   */
  const searchHospitals = async (query: string): Promise<VeterinaryHospital[]> => {
    if (!query.trim()) {
      return hospitals.value;
    }

    try {
      const response = await $fetch<VeterinaryHospital[]>('/api/veterinary-hospitals/search', {
        query: { query: query.trim() },
      });

      return response;
    }
    catch (err: any) {
      if (handleError) {
        handleError(err, 'hospital', 'search');
      }
      return [];
    }
  };

  /**
   * 病院IDから病院情報を取得
   */
  const getHospitalById = (id: number): VeterinaryHospital | undefined => {
    return hospitals.value.find(h => h.id === id);
  };

  /**
   * 病院名の重複チェック
   */
  const checkDuplicateName = (name: string, excludeId?: number): boolean => {
    return hospitals.value.some(h =>
      h.name.toLowerCase() === name.toLowerCase() && h.id !== excludeId,
    );
  };

  /**
   * 病院一覧をリフレッシュ
   */
  const refreshHospitals = async (): Promise<void> => {
    await fetchHospitals();
  };

  /**
   * 病院に関連データがあるかチェック（削除前の確認用）
   */
  const checkHospitalRelatedData = async (id: number): Promise<{ hasDoctors: boolean; hasVisits: boolean; hasAppointments: boolean }> => {
    try {
      const response = await $fetch<{ hasDoctors: boolean; hasVisits: boolean; hasAppointments: boolean }>(`/api/veterinary-hospitals/${id}/related-data`);
      return response;
    }
    catch (err: unknown) {
      console.warn('Failed to check related data:', err);
      return { hasDoctors: false, hasVisits: false, hasAppointments: false };
    }
  };

  return {
    // リアクティブデータ
    hospitals: readonly(hospitals) as Readonly<Ref<VeterinaryHospital[]>>,
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),

    // メソッド
    fetchHospitals,
    createHospital,
    updateHospital,
    deleteHospital,
    searchHospitals,
    getHospitalById,
    checkDuplicateName,
    refreshHospitals,
    clearError,
    checkHospitalRelatedData,
  };
}; ; ;
