import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVeterinaryAppointments } from '~/composables/useVeterinaryAppointments';
import type { VeterinaryAppointmentWithRelations, GetVeterinaryAppointmentsResponse } from '~/types/veterinary-visit';

// Mock $fetch
const mockFetch = vi.fn();
global.$fetch = mockFetch;

describe('useVeterinaryAppointments', () => {
  const futureDate1 = new Date();
  futureDate1.setDate(futureDate1.getDate() + 7); // 1週間後

  const futureDate2 = new Date();
  futureDate2.setDate(futureDate2.getDate() + 14); // 2週間後

  const mockAppointments: VeterinaryAppointmentWithRelations[] = [
    {
      id: 1,
      catId: 1,
      appointmentDate: futureDate1,
      hospitalId: 1,
      doctorId: 1,
      plannedTreatments: '定期検診予定',
      notes: 'テスト予約メモ1',
      status: 'SCHEDULED',
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: { id: 1, name: 'テスト猫1', birthdate: new Date(), weight: 4.5, photoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      hospital: { id: 1, name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: { id: 1, name: 'テスト先生', hospitalId: 1, specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
    },
    {
      id: 'appointment2',
      catId: 2,
      appointmentDate: futureDate2,
      hospitalId: 1,
      doctorId: null,
      plannedTreatments: 'ワクチン接種予定',
      notes: 'テスト予約メモ2',
      status: 'SCHEDULED',
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: { id: 2, name: 'テスト猫2', birthdate: new Date(), weight: 3.2, photoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      hospital: { id: 1, name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: null,
    },
  ];

  const mockResponse: GetVeterinaryAppointmentsResponse = {
    appointments: mockAppointments,
    total: 2,
    hasMore: false,
    pagination: {
      limit: 20,
      offset: 0,
      total: 2,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });
  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      const { appointments, loading, error, total, hasMore } = useVeterinaryAppointments();

      expect(appointments.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(total.value).toBe(0);
      expect(hasMore.value).toBe(false);
    });
  });

  describe('fetchAppointments', () => {
    it('予約一覧を正常に取得できる', async () => {
      const { appointments, loading, error, total, hasMore, fetchAppointments } = useVeterinaryAppointments();

      await fetchAppointments();

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        query: {},
      });
      expect(appointments.value).toEqual(mockAppointments);
      expect(total.value).toBe(2);
      expect(hasMore.value).toBe(false);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it('パラメータ付きで予約を取得できる', async () => {
      const { fetchAppointments } = useVeterinaryAppointments();

      const params = {
        catId: 1,
        status: 'SCHEDULED' as const,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        limit: 10,
        offset: 0,
      };

      await fetchAppointments(params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        query: params,
      });
    });

    it('ローディング状態が正しく管理される', async () => {
      const { loading, fetchAppointments } = useVeterinaryAppointments();

      expect(loading.value).toBe(false);

      const fetchPromise = fetchAppointments();
      expect(loading.value).toBe(true);

      await fetchPromise;
      expect(loading.value).toBe(false);
    });

    it('追加読み込み（ページネーション）が正しく動作する', async () => {
      const { appointments, fetchAppointments } = useVeterinaryAppointments();

      // 初回読み込み
      await fetchAppointments();
      expect(appointments.value).toHaveLength(2);

      // 追加データのモック
      const additionalAppointments = [
        {
          ...mockAppointments[0],
          id: 3,
          notes: 'テスト予約メモ3',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        appointments: additionalAppointments,
        total: 3,
        hasMore: false,
        pagination: { limit: 20, offset: 2, total: 3 },
      });

      // 追加読み込み
      await fetchAppointments({ offset: 2 }, true);

      expect(appointments.value).toHaveLength(3);
      expect(appointments.value[2].id).toBe('appointment3');
    });

    it('エラーが発生した場合、エラー状態が設定される', async () => {
      const { error, loading, fetchAppointments } = useVeterinaryAppointments();

      mockFetch.mockRejectedValueOnce(new Error('ネットワークエラー'));

      await fetchAppointments();

      expect(error.value).toBe('予約の取得に失敗しました');
      expect(loading.value).toBe(false);
    });
  });

  describe('createAppointment', () => {
    it('予約を正常に作成できる', async () => {
      const { appointments, createAppointment } = useVeterinaryAppointments();

      const newAppointmentData = {
        catId: 1,
        appointmentDate: futureDate1,
        hospitalName: 'テスト動物病院',
        doctorName: 'テスト先生',
        plannedTreatments: '新しい検診予定',
        notes: '新しい予約メモ',
      };

      const createdAppointment = {
        ...mockAppointments[0],
        id: 3,
        plannedTreatments: '新しい検診予定',
        notes: '新しい予約メモ',
      };

      mockFetch.mockResolvedValueOnce({ appointment: createdAppointment });

      mockFetch.mockResolvedValueOnce(createdAppointment);

      const result = await createAppointment(newAppointmentData);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        method: 'POST',
        body: newAppointmentData,
      });
      expect(result).toEqual(createdAppointment);
      expect(appointments.value).toContain(createdAppointment);
    });

    it('作成エラーが発生した場合、エラーがスローされる', async () => {
      const { createAppointment } = useVeterinaryAppointments();

      const newAppointmentData = {
        catId: '',
        appointmentDate: new Date(),
        hospitalName: 'テスト病院',
        doctorName: '',
        plannedTreatments: '',
        notes: '',
      };

      mockFetch.mockRejectedValueOnce(new Error('バリデーションエラー'));

      await expect(createAppointment(newAppointmentData)).rejects.toThrow('予約の作成に失敗しました');
    });
  });

  describe('updateAppointment', () => {
    it('予約を正常に更新できる', async () => {
      const { appointments, updateAppointment, fetchAppointments } = useVeterinaryAppointments();

      // 初期データを設定
      await fetchAppointments();

      const updateData = {
        plannedTreatments: '更新された処方予定',
        notes: '更新されたメモ',
        status: 'CANCELLED' as const,
      };

      const updatedAppointment = {
        ...mockAppointments[0],
        plannedTreatments: '更新された処方予定',
        notes: '更新されたメモ',
        status: 'CANCELLED' as const,
      };

      mockFetch.mockResolvedValueOnce({ appointment: updatedAppointment });

      const result = await updateAppointment(updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments/appointment1', {
        method: 'PUT',
        body: updateData,
      });
      expect(result).toEqual(updatedAppointment);

      // 一覧内のデータも更新されることを確認
      const updatedItem = appointments.value.find(a => a.id === 1);
      expect(updatedItem?.plannedTreatments).toBe('更新された処方予定');
      expect(updatedItem?.status).toBe('CANCELLED');
    });

    it('存在しない予約の更新でエラーがスローされる', async () => {
      const { updateAppointment } = useVeterinaryAppointments();

      mockFetch.mockRejectedValueOnce(new Error('予約が見つかりません'));

      await expect(updateAppointment({ id: 'nonexistent', notes: 'テスト' })).rejects.toThrow('予約の更新に失敗しました');
    });
  });
  describe('deleteAppointment', () => {
    it('予約を正常に削除できる', async () => {
      const { appointments, deleteAppointment, fetchAppointments } = useVeterinaryAppointments();

      // 初期データを設定
      await fetchAppointments();
      expect(appointments.value).toHaveLength(2);

      mockFetch.mockResolvedValueOnce({ message: '削除されました' });

      const result = await deleteAppointment(1);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments/appointment1', {
        method: 'DELETE',
      });

      expect(result).toBe(true);
      // 一覧から削除されることを確認
      expect(appointments.value).toHaveLength(1);
      expect(appointments.value.find(a => a.id === 1)).toBeUndefined();
    });

    it('削除エラーが発生した場合、エラーがスローされる', async () => {
      const { deleteAppointment } = useVeterinaryAppointments();

      mockFetch.mockRejectedValueOnce(new Error('削除に失敗しました'));

      await expect(deleteAppointment(1)).rejects.toThrow('予約の削除に失敗しました');
    });
  });

  describe('convertToVisit', () => {
    it('予約を通院記録に正常に変換できる', async () => {
      const { appointments, convertToVisit, fetchAppointments } = useVeterinaryAppointments();

      // 初期データを設定
      await fetchAppointments();

      const conversionData = {
        actualVisitDate: new Date(),
        actualCost: 5000,
        actualTreatments: ['健康診断', 'ワクチン接種'],
        actualNotes: '実際の診察メモ',
        hasBloodTest: true,
      };

      const convertedVisit = {
        id: 1,
        catId: 1,
        visitDate: conversionData.actualVisitDate,
        hospitalId: 1,
        doctorId: 1,
        cost: conversionData.actualCost,
        notes: conversionData.actualNotes,
        hasBloodTest: conversionData.hasBloodTest,
        createdAt: new Date(),
        updatedAt: new Date(),
        cat: mockAppointments[0].cat,
        hospital: mockAppointments[0].hospital,
        doctor: mockAppointments[0].doctor,
        treatments: [
          { id: 1, name: '健康診断', category: '診察', description: '', createdAt: new Date(), updatedAt: new Date() },
          { id: 2, name: 'ワクチン接種', category: '予防', description: '', createdAt: new Date(), updatedAt: new Date() },
        ],
      };

      const updatedAppointment = {
        ...mockAppointments[0],
        status: 'COMPLETED' as const,
      };

      mockFetch.mockResolvedValueOnce({
        visit: convertedVisit,
        appointment: updatedAppointment,
      });

      const result = await convertToVisit({ appointmentId: 1, ...conversionData });

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments/appointment1/convert', {
        method: 'POST',
        body: { appointmentId: 1, ...conversionData },
      });
      expect(result.visit).toEqual(convertedVisit);
      expect(result.appointment).toEqual(updatedAppointment);

      // 予約のステータスが更新されることを確認
      const updatedItem = appointments.value.find(a => a.id === 1);
      expect(updatedItem?.status).toBe('COMPLETED');
    });

    it('変換エラーが発生した場合、エラーがスローされる', async () => {
      const { convertToVisit } = useVeterinaryAppointments();

      mockFetch.mockRejectedValueOnce(new Error('変換に失敗しました'));

      await expect(convertToVisit({
        appointmentId: 1,
        actualCost: 5000,
      })).rejects.toThrow('予約の変換に失敗しました');
    });

    it('COMPLETED状態の予約は変換できない', async () => {
      const { convertToVisit } = useVeterinaryAppointments();

      mockFetch.mockRejectedValueOnce({
        statusCode: 400,
        statusMessage: 'この予約は既に処理済みです',
      });

      await expect(convertToVisit({
        appointmentId: 1,
        actualCost: 5000,
      })).rejects.toThrow('予約の変換に失敗しました');
    });
  });

  describe('fetchAppointment', () => {
    it('特定の予約を正常に取得できる', async () => {
      const { fetchAppointment } = useVeterinaryAppointments();

      mockFetch.mockResolvedValueOnce(mockAppointments[0]);

      const result = await fetchAppointment(1);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments/appointment1');
      expect(result).toEqual(mockAppointments[0]);
    });

    it('存在しない予約の取得でエラーがスローされる', async () => {
      const { fetchAppointment } = useVeterinaryAppointments();

      mockFetch.mockRejectedValueOnce(new Error('予約が見つかりません'));

      await expect(fetchAppointment('nonexistent')).rejects.toThrow('予約の取得に失敗しました');
    });
  });

  describe('loadMore', () => {
    it('次のページを正常に読み込める', async () => {
      const { appointments, loadMore, fetchAppointments } = useVeterinaryAppointments();

      // 初期データ（hasMore: true）
      const initialResponse = {
        ...mockResponse,
        hasMore: true,
      };
      mockFetch.mockResolvedValueOnce(initialResponse);
      await fetchAppointments();

      expect(appointments.value).toHaveLength(2);

      // 追加データ
      const additionalAppointment = {
        ...mockAppointments[0],
        id: 3,
        notes: '追加予約',
      };

      mockFetch.mockResolvedValueOnce({
        appointments: [additionalAppointment],
        total: 3,
        hasMore: false,
        pagination: { limit: 20, offset: 2, total: 3 },
      });

      await loadMore();

      expect(appointments.value).toHaveLength(3);
      expect(appointments.value[2].id).toBe('appointment3');
    });

    it('hasMoreがfalseの場合、読み込みを行わない', async () => {
      const { loadMore, fetchAppointments } = useVeterinaryAppointments();

      await fetchAppointments(); // hasMore: false

      const initialCallCount = mockFetch.mock.calls.length;
      await loadMore();

      // 追加のAPIコールが行われないことを確認
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('cancelAppointment', () => {
    it('予約をキャンセルできる', async () => {
      const { cancelAppointment } = useVeterinaryAppointments();

      const cancelledAppointment = {
        ...mockAppointments[0],
        status: 'CANCELLED' as const,
      };

      mockFetch.mockResolvedValueOnce(cancelledAppointment);

      const result = await cancelAppointment(1);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments/appointment1', {
        method: 'PUT',
        body: { id: 1, status: 'CANCELLED' },
      });
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('fetchAppointmentsByCat', () => {
    it('猫別の予約を取得できる', async () => {
      const { fetchAppointmentsByCat } = useVeterinaryAppointments();

      const catId = 'cat1';
      const params = { limit: 10 };

      await fetchAppointmentsByCat(catId, params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        query: { ...params, catId },
      });
    });
  });

  describe('fetchAppointmentsByStatus', () => {
    it('ステータス別の予約を取得できる', async () => {
      const { fetchAppointmentsByStatus } = useVeterinaryAppointments();

      const status = 'SCHEDULED' as const;
      const params = { limit: 10 };

      await fetchAppointmentsByStatus(status, params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        query: { ...params, status },
      });
    });
  });

  describe('fetchAppointmentsByDateRange', () => {
    it('日付範囲で予約を取得できる', async () => {
      const { fetchAppointmentsByDateRange } = useVeterinaryAppointments();

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const params = { limit: 10 };

      await fetchAppointmentsByDateRange(startDate, endDate, params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        query: {
          ...params,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    });
  });

  describe('fetchUpcomingAppointments', () => {
    it('今後の予約のみを取得できる', async () => {
      const { fetchUpcomingAppointments } = useVeterinaryAppointments();

      const params = { limit: 10 };

      await fetchUpcomingAppointments(params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        query: expect.objectContaining({
          ...params,
          status: 'SCHEDULED',
          startDate: expect.any(String),
        }),
      });
    });
  });

  describe('fetchPastAppointments', () => {
    it('過去の予約のみを取得できる', async () => {
      const { fetchPastAppointments } = useVeterinaryAppointments();

      const params = { limit: 10 };

      await fetchPastAppointments(params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-appointments', {
        query: expect.objectContaining({
          ...params,
          endDate: expect.any(String),
        }),
      });
    });
  });

  describe('refresh', () => {
    it('現在のパラメータで予約を再取得できる', async () => {
      const { refresh, fetchAppointments } = useVeterinaryAppointments();

      const params = { catId: 1, status: 'SCHEDULED' as const };
      await fetchAppointments(params);

      // 新しいデータでモックを更新
      const refreshedData = {
        appointments: [mockAppointments[0]],
        total: 1,
        hasMore: false,
        pagination: { limit: 20, offset: 0, total: 1 },
      };
      mockFetch.mockResolvedValueOnce(refreshedData);

      await refresh();

      // 同じパラメータで再度呼び出されることを確認
      expect(mockFetch).toHaveBeenLastCalledWith('/api/veterinary-appointments', {
        query: params,
      });
    });
  });

  describe('reset', () => {
    it('状態をリセットできる', async () => {
      const { appointments, loading, error, total, hasMore, reset, fetchAppointments } = useVeterinaryAppointments();

      // データを設定
      await fetchAppointments();
      expect(appointments.value).toHaveLength(2);

      // リセット
      reset();

      expect(appointments.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(total.value).toBe(0);
      expect(hasMore.value).toBe(false);
    });
  });

  describe('Computed プロパティ', () => {
    it('isLoading が正しく計算される', async () => {
      const { isLoading, fetchAppointments } = useVeterinaryAppointments();

      expect(isLoading.value).toBe(false);

      const fetchPromise = fetchAppointments();
      expect(isLoading.value).toBe(true);

      await fetchPromise;
      expect(isLoading.value).toBe(false);
    });

    it('hasError が正しく計算される', async () => {
      const { hasError, fetchAppointments } = useVeterinaryAppointments();

      expect(hasError.value).toBe(false);

      mockFetch.mockRejectedValueOnce(new Error('エラー'));
      await fetchAppointments();

      expect(hasError.value).toBe(true);
    });

    it('isEmpty が正しく計算される', async () => {
      const { isEmpty, fetchAppointments } = useVeterinaryAppointments();

      expect(isEmpty.value).toBe(true);

      await fetchAppointments();
      expect(isEmpty.value).toBe(false);
    });

    it('canLoadMore が正しく計算される', async () => {
      const { canLoadMore, fetchAppointments } = useVeterinaryAppointments();

      expect(canLoadMore.value).toBe(false);

      // hasMore: true のデータを設定
      mockFetch.mockResolvedValueOnce({
        ...mockResponse,
        hasMore: true,
      });
      await fetchAppointments();

      expect(canLoadMore.value).toBe(true);
    });

    it('scheduledCount が正しく計算される', async () => {
      const { scheduledCount, fetchAppointments } = useVeterinaryAppointments();

      // 異なるステータスの予約を含むデータを設定
      const mixedStatusAppointments = [
        ...mockAppointments,
        {
          ...mockAppointments[0],
          id: 3,
          status: 'COMPLETED' as const,
        },
        {
          ...mockAppointments[0],
          id: 'appointment4',
          status: 'CANCELLED' as const,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        appointments: mixedStatusAppointments,
        total: 4,
        hasMore: false,
        pagination: { limit: 20, offset: 0, total: 4 },
      });

      await fetchAppointments();

      expect(scheduledCount.value).toBe(2);
    });

    it('upcomingAppointments が正しく計算される', async () => {
      const { upcomingAppointments, fetchAppointments } = useVeterinaryAppointments();

      // 過去の予約を含むデータを設定
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7); // 1週間前

      const mixedDateAppointments = [
        ...mockAppointments,
        {
          ...mockAppointments[0],
          id: 3,
          appointmentDate: pastDate,
          status: 'SCHEDULED' as const,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        appointments: mixedDateAppointments,
        total: 3,
        hasMore: false,
        pagination: { limit: 20, offset: 0, total: 3 },
      });

      await fetchAppointments();

      expect(upcomingAppointments.value).toHaveLength(2);
      expect(upcomingAppointments.value.every(a =>
        a.status === 'SCHEDULED' && a.appointmentDate > new Date(),
      )).toBe(true);
    });
  });

  describe('clearError', () => {
    it('エラー状態をクリアできる', async () => {
      const { error, clearError, fetchAppointments } = useVeterinaryAppointments();

      // エラーを発生させる
      mockFetch.mockRejectedValueOnce(new Error('テストエラー'));
      await fetchAppointments();

      expect(error.value).toBeTruthy();

      clearError();
      expect(error.value).toBeNull();
    });
  });

  describe('リアクティブ性', () => {
    it('appointments配列の変更が正しく反映される', async () => {
      const { appointments, fetchAppointments } = useVeterinaryAppointments();

      // 初期状態
      expect(appointments.value).toHaveLength(0);

      // データ取得後
      await fetchAppointments();
      expect(appointments.value).toHaveLength(2);

      // 手動でデータを変更
      appointments.value.push({
        ...mockAppointments[0],
        id: 3,
      });
      expect(appointments.value).toHaveLength(3);
    });

    it('loading状態の変更が正しく反映される', async () => {
      const { loading, fetchAppointments } = useVeterinaryAppointments();

      expect(loading.value).toBe(false);

      const fetchPromise = fetchAppointments();
      expect(loading.value).toBe(true);

      await fetchPromise;
      expect(loading.value).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーが適切に処理される', async () => {
      const { error, fetchAppointments } = useVeterinaryAppointments();

      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      await fetchAppointments();

      expect(error.value).toBe('予約の取得に失敗しました');
    });

    it('APIエラーレスポンスが適切に処理される', async () => {
      const { createAppointment } = useVeterinaryAppointments();

      const apiError = {
        statusCode: 400,
        statusMessage: 'バリデーションエラー',
        data: { errors: ['猫を選択してください'] },
      };

      mockFetch.mockRejectedValueOnce(apiError);

      await expect(createAppointment({
        catId: '',
        appointmentDate: new Date(),
        hospitalName: 'テスト病院',
        doctorName: '',
        plannedTreatments: '',
        notes: '',
      })).rejects.toThrow('予約の作成に失敗しました');
    });
  });
});
