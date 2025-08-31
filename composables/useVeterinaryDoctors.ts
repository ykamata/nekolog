import type {
  VeterinaryDoctor,
  VeterinaryDoctorInput,
  UseVeterinaryDoctorsReturn,
} from '~/types/veterinary-master';

/**
 * 先生管理のComposable
 * 先生のCRUD操作と検索機能を提供
 */
export const useVeterinaryDoctors = (): UseVeterinaryDoctorsReturn => {
  // リアクティブデータ
  const doctors = ref<VeterinaryDoctor[]>([]);
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
        console.log(getLoadingMessage('doctor', operation));
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
   * 先生一覧を取得（ページネーション対応）
   */
  const fetchDoctors = async (hospitalId?: string, searchQuery?: string, page: number = 1, limit: number = 20): Promise<void> => {
    setLoading(true, 'fetch');
    clearError();

    try {
      const params = new URLSearchParams();
      if (hospitalId?.trim()) {
        params.append('hospitalId', hospitalId.trim());
      }
      if (searchQuery?.trim()) {
        params.append('name', searchQuery.trim());
      }
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await $fetch<VeterinaryDoctorListResponse>('/api/veterinary-doctors', {
        query: Object.fromEntries(params),
      });

      // ページが1の場合は新しいデータで置き換え、それ以外は追加（無限スクロール対応）
      if (page === 1) {
        doctors.value = response.doctors || [];
      } else {
        doctors.value.push(...(response.doctors || []));
      }
      
      pagination.value = response.pagination;
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'doctor', 'fetch');
        error.value = errorState.message;
      }
      else {
        error.value = '先生一覧の取得に失敗しました';
      }
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 先生を新規作成
   */
  const createDoctor = async (doctorData: VeterinaryDoctorInput): Promise<VeterinaryDoctor> => {
    setLoading(true, 'create');
    clearError();

    try {
      const response = await $fetch<{ doctor: VeterinaryDoctor }>('/api/veterinary-doctors', {
        method: 'POST',
        body: doctorData,
      });

      // ローカルの配列に追加
      doctors.value.unshift(response.doctor);

      if (showSuccess) {
        showSuccess('doctor', 'create');
      }
      return response.doctor;
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'doctor', 'create');
        error.value = errorState.message;
      }
      else {
        error.value = '先生の登録に失敗しました';
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 先生情報を更新
   */
  const updateDoctor = async (id: string, doctorData: VeterinaryDoctorInput): Promise<VeterinaryDoctor> => {
    setLoading(true, 'update');
    clearError();

    try {
      const response = await $fetch<VeterinaryDoctor>(`/api/veterinary-doctors/${id}`, {
        method: 'PUT',
        body: doctorData,
      });

      // ローカルの配列を更新
      const index = doctors.value.findIndex(d => d.id === id);
      if (index !== -1) {
        doctors.value[index] = response;
      }

      if (showSuccess) {
        showSuccess('doctor', 'update');
      }
      return response;
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'doctor', 'update');
        error.value = errorState.message;
      }
      else {
        error.value = '先生情報の更新に失敗しました';
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 先生を削除
   */
  const deleteDoctor = async (id: string): Promise<void> => {
    setLoading(true, 'delete');
    clearError();

    try {
      await $fetch(`/api/veterinary-doctors/${id}`, {
        method: 'DELETE',
      });

      // ローカルの配列から削除
      doctors.value = doctors.value.filter(d => d.id !== id);

      if (showSuccess) {
        showSuccess('doctor', 'delete');
      }
    }
    catch (err: any) {
      if (handleError) {
        const errorState = handleError(err, 'doctor', 'delete');
        error.value = errorState.message;
      }
      else {
        error.value = '先生の削除に失敗しました';
      }
      throw err;
    }
    finally {
      setLoading(false);
    }
  };

  /**
   * 先生を検索（API を使用）
   */
  const searchDoctors = async (query: string, hospitalId?: string): Promise<VeterinaryDoctor[]> => {
    if (!query.trim()) {
      return doctors.value;
    }

    try {
      const params = new URLSearchParams();
      params.append('name', query.trim());
      if (hospitalId?.trim()) {
        params.append('hospitalId', hospitalId.trim());
      }

      const response = await $fetch<{ doctors: VeterinaryDoctor[] }>('/api/veterinary-doctors/search', {
        query: Object.fromEntries(params),
      });

      return response.doctors || [];
    }
    catch (err: any) {
      if (handleError) {
        handleError(err, 'doctor', 'search');
      }
      return [];
    }
  };

  /**
   * 先生IDから先生情報を取得
   */
  const getDoctorById = (id: string): VeterinaryDoctor | undefined => {
    return doctors.value.find(d => d.id === id);
  };

  /**
   * 先生名の重複チェック
   */
  const checkDuplicateName = (name: string, excludeId?: string): boolean => {
    return doctors.value.some(d =>
      d.name.toLowerCase() === name.toLowerCase() && d.id !== excludeId,
    );
  };

  /**
   * 病院IDで先生をフィルタリング
   */
  const getDoctorsByHospitalId = (hospitalId: string): VeterinaryDoctor[] => {
    return doctors.value.filter(d => d.hospitalId === hospitalId);
  };

  /**
   * 先生一覧をリフレッシュ
   */
  const refreshDoctors = async (): Promise<void> => {
    await fetchDoctors();
  };

  /**
   * 先生に関連データがあるかチェック（削除前の確認用）
   */
  const checkDoctorRelatedData = async (id: string): Promise<{ hasVisits: boolean; hasAppointments: boolean }> => {
    try {
      const response = await $fetch<{ hasVisits: boolean; hasAppointments: boolean }>(`/api/veterinary-doctors/${id}/related-data`);
      return response;
    }
    catch (err: unknown) {
      console.warn('Failed to check related data:', err);
      return { hasVisits: false, hasAppointments: false };
    }
  };

  return {
    // リアクティブデータ
    doctors: readonly(doctors),
    loading: readonly(loading),
    error: readonly(error),
    pagination: readonly(pagination),

    // メソッド
    fetchDoctors,
    createDoctor,
    updateDoctor,
    deleteDoctor,
    searchDoctors,
    getDoctorById,
    checkDuplicateName,
    getDoctorsByHospitalId,
    refreshDoctors,
    clearError,
    checkDoctorRelatedData,
  };
};; ;
