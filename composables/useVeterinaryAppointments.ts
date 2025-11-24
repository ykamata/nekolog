import type {
  VeterinaryAppointmentWithRelations,
  VeterinaryVisitWithRelations,
  CreateVeterinaryAppointmentInput,
  UpdateVeterinaryAppointmentInput,
  ConvertAppointmentToVisitInput,
  GetVeterinaryAppointmentsParams,
  GetVeterinaryAppointmentsResponse,
  AppointmentStatus,
} from '~/types/veterinary-visit';

/**
 * 予約管理用のComposable
 * 予約データ管理と通院記録変換機能を提供
 */
export const useVeterinaryAppointments = () => {
  // リアクティブな状態管理
  const appointments = ref<VeterinaryAppointmentWithRelations[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const total = ref(0);
  const hasMore = ref(false);

  // 現在のフィルタ条件を保持
  const currentParams = ref<GetVeterinaryAppointmentsParams>({});

  /**
   * エラー状態をクリア
   */
  const clearError = () => {
    error.value = null;
  };

  /**
   * 予約一覧を取得
   * @param params 検索・フィルタ条件
   * @param append 既存データに追加するかどうか（ページネーション用）
   */
  const fetchAppointments = async (params: GetVeterinaryAppointmentsParams = {}, append = false) => {
    loading.value = true;
    clearError();

    try {
      const response = await $fetch<GetVeterinaryAppointmentsResponse>('/api/veterinary-appointments', {
        query: params,
      });

      if (append) {
        appointments.value = [...appointments.value, ...response.appointments];
      }
      else {
        appointments.value = response.appointments;
      }

      total.value = response.total;
      hasMore.value = appointments.value.length < response.total;
      currentParams.value = params;

      return response;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '予約データの取得に失敗しました';
      error.value = errorMessage;
      console.error('Failed to fetch veterinary appointments:', err);
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

    const offset = appointments.value.length;
    await fetchAppointments({ ...currentParams.value, offset }, true);
  };

  /**
   * 特定の予約を取得
   * @param id 予約ID
   */
  const fetchAppointment = async (id: number) => {
    loading.value = true;
    clearError();

    try {
      const appointment = await $fetch<VeterinaryAppointmentWithRelations>(`/api/veterinary-appointments/${id}`);
      return appointment;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '予約の取得に失敗しました';
      error.value = errorMessage;
      console.error('Failed to fetch veterinary appointment:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 新しい予約を作成
   * @param data 作成データ
   */
  const createAppointment = async (data: CreateVeterinaryAppointmentInput) => {
    loading.value = true;
    clearError();

    try {
      const newAppointment = await $fetch<VeterinaryAppointmentWithRelations>('/api/veterinary-appointments', {
        method: 'POST',
        body: data,
      });

      // 既存のリストに新しい予約を追加（日時順を維持）
      const insertIndex = appointments.value.findIndex(
        appointment => new Date(appointment.appointmentDate) > new Date(newAppointment.appointmentDate),
      );

      if (insertIndex === -1) {
        appointments.value.push(newAppointment);
      }
      else {
        appointments.value.splice(insertIndex, 0, newAppointment);
      }

      total.value += 1;

      return newAppointment;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '予約の作成に失敗しました';
      error.value = errorMessage;
      console.error('Failed to create veterinary appointment:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 予約を更新
   * @param data 更新データ
   */
  const updateAppointment = async (data: UpdateVeterinaryAppointmentInput) => {
    loading.value = true;
    clearError();

    try {
      const updatedAppointment = await $fetch<VeterinaryAppointmentWithRelations>(`/api/veterinary-appointments/${data.id}`, {
        method: 'PUT' as any,
        body: data,
      });

      // 既存のリスト内の該当予約を更新
      const index = appointments.value.findIndex(appointment => appointment.id === data.id);
      if (index !== -1) {
        appointments.value[index] = updatedAppointment;
      }

      return updatedAppointment;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '予約の更新に失敗しました';
      error.value = errorMessage;
      console.error('Failed to update veterinary appointment:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 予約を削除
   * @param id 削除する予約ID
   */
  const deleteAppointment = async (id: number) => {
    loading.value = true;
    clearError();

    try {
      await $fetch(`/api/veterinary-appointments/${id}`, {
        method: 'DELETE' as any,
      });

      // 既存のリストから該当予約を削除
      appointments.value = appointments.value.filter(appointment => appointment.id !== id);
      total.value = Math.max(0, total.value - 1);

      return true;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '予約の削除に失敗しました';
      error.value = errorMessage;
      console.error('Failed to delete veterinary appointment:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 予約を通院記録に変換
   * @param data 変換データ
   */
  const convertToVisit = async (data: ConvertAppointmentToVisitInput) => {
    loading.value = true;
    clearError();

    try {
      const response = await $fetch<{
        visit: VeterinaryVisitWithRelations;
        appointment: VeterinaryAppointmentWithRelations;
        message: string;
      }>(`/api/veterinary-appointments/${data.appointmentId}/convert`, {
        method: 'POST',
        body: data,
      });

      // 既存のリスト内の該当予約のステータスを更新
      const index = appointments.value.findIndex(appointment => appointment.id === data.appointmentId);
      if (index !== -1) {
        appointments.value[index] = response.appointment;
      }

      return response;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '予約の変換に失敗しました';
      error.value = errorMessage;
      console.error('Failed to convert appointment to visit:', err);
      throw new Error(errorMessage);
    }
    finally {
      loading.value = false;
    }
  };

  /**
   * 予約をキャンセル（ステータスをCANCELLEDに変更）
   * @param id 予約ID
   */
  const cancelAppointment = async (id: number) => {
    return await updateAppointment({
      id,
      status: 'CANCELLED' as AppointmentStatus,
    });
  };

  /**
   * 猫別の予約を取得
   * @param catId 猫ID
   * @param params 追加の検索条件
   */
  const fetchAppointmentsByCat = async (catId: number, params: Omit<GetVeterinaryAppointmentsParams, 'catId'> = {}) => {
    return await fetchAppointments({ ...params, catId });
  };

  /**
   * ステータス別の予約を取得
   * @param status 予約ステータス
   * @param params 追加の検索条件
   */
  const fetchAppointmentsByStatus = async (status: AppointmentStatus, params: Omit<GetVeterinaryAppointmentsParams, 'status'> = {}) => {
    return await fetchAppointments({ ...params, status });
  };

  /**
   * 日付範囲で予約を取得
   * @param startDate 開始日
   * @param endDate 終了日
   * @param params 追加の検索条件
   */
  const fetchAppointmentsByDateRange = async (
    startDate: Date,
    endDate: Date,
    params: Omit<GetVeterinaryAppointmentsParams, 'startDate' | 'endDate'> = {},
  ) => {
    return await fetchAppointments({
      ...params,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  };

  /**
   * 今後の予約のみを取得
   * @param params 追加の検索条件
   */
  const fetchUpcomingAppointments = async (params: GetVeterinaryAppointmentsParams = {}) => {
    const now = new Date();
    return await fetchAppointments({
      ...params,
      startDate: now.toISOString(),
      status: 'SCHEDULED',
    });
  };

  /**
   * 過去の予約のみを取得
   * @param params 追加の検索条件
   */
  const fetchPastAppointments = async (params: GetVeterinaryAppointmentsParams = {}) => {
    const now = new Date();
    return await fetchAppointments({
      ...params,
      endDate: now.toISOString(),
    });
  };

  /**
   * データをリフレッシュ（現在のパラメータで再取得）
   */
  const refresh = async () => {
    await fetchAppointments(currentParams.value);
  };

  /**
   * 状態をリセット
   */
  const reset = () => {
    appointments.value = [];
    loading.value = false;
    error.value = null;
    total.value = 0;
    hasMore.value = false;
    currentParams.value = {};
  };

  // 読み取り専用の computed プロパティ
  const isLoading = computed(() => loading.value);
  const hasError = computed(() => error.value !== null);
  const isEmpty = computed(() => appointments.value.length === 0);
  const canLoadMore = computed(() => hasMore.value && !loading.value);

  // ステータス別の予約数を計算
  const scheduledCount = computed(() =>
    appointments.value.filter(appointment => appointment.status === 'SCHEDULED').length,
  );
  const completedCount = computed(() =>
    appointments.value.filter(appointment => appointment.status === 'COMPLETED').length,
  );
  const cancelledCount = computed(() =>
    appointments.value.filter(appointment => appointment.status === 'CANCELLED').length,
  );

  // 今後の予約のみをフィルタ
  const upcomingAppointments = computed(() => {
    const now = new Date();
    return appointments.value.filter(appointment =>
      appointment.status === 'SCHEDULED' && new Date(appointment.appointmentDate) > now,
    );
  });

  return {
    // 状態
    appointments: readonly(appointments),
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
    scheduledCount,
    completedCount,
    cancelledCount,
    upcomingAppointments,

    // メソッド
    fetchAppointments,
    fetchAppointment,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    convertToVisit,
    cancelAppointment,
    fetchAppointmentsByCat,
    fetchAppointmentsByStatus,
    fetchAppointmentsByDateRange,
    fetchUpcomingAppointments,
    fetchPastAppointments,
    loadMore,
    refresh,
    reset,
    clearError,
  };
};
