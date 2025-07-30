import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVeterinaryVisits } from '~/composables/useVeterinaryVisits';
import type { VeterinaryVisitWithRelations, GetVeterinaryVisitsResponse } from '~/types/veterinary-visit';

// Mock $fetch
const mockFetch = vi.fn();
global.$fetch = mockFetch;

describe('useVeterinaryVisits', () => {
  const mockVisits: VeterinaryVisitWithRelations[] = [
    {
      id: 'visit1',
      catId: 'cat1',
      visitDate: new Date('2024-01-15T10:00:00Z'),
      hospitalId: 'hospital1',
      doctorId: 'doctor1',
      cost: 5000,
      notes: 'テストメモ1',
      hasBloodTest: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: { id: 'cat1', name: 'テスト猫1', birthdate: new Date(), weight: 4.5, photoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: { id: 'doctor1', name: 'テスト先生', hospitalId: 'hospital1', specialization: '内科', createdAt: new Date(), updatedAt: new Date() },
      treatments: [
        { id: 'treatment1', name: '健康診断', category: '診察', description: '', createdAt: new Date(), updatedAt: new Date() },
      ],
    },
    {
      id: 'visit2',
      catId: 'cat2',
      visitDate: new Date('2024-01-20T14:00:00Z'),
      hospitalId: 'hospital1',
      doctorId: null,
      cost: 3000,
      notes: 'テストメモ2',
      hasBloodTest: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: { id: 'cat2', name: 'テスト猫2', birthdate: new Date(), weight: 3.2, photoUrl: null, createdAt: new Date(), updatedAt: new Date() },
      hospital: { id: 'hospital1', name: 'テスト動物病院', address: '', phone: '', createdAt: new Date(), updatedAt: new Date() },
      doctor: null,
      treatments: [
        { id: 'treatment2', name: 'ワクチン接種', category: '予防', description: '', createdAt: new Date(), updatedAt: new Date() },
      ],
    },
  ];

  const mockResponse: GetVeterinaryVisitsResponse = {
    visits: mockVisits,
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
      const { visits, loading, error, total, hasMore } = useVeterinaryVisits();

      expect(visits.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(total.value).toBe(0);
      expect(hasMore.value).toBe(false);
    });
  });

  describe('fetchVisits', () => {
    it('通院記録一覧を正常に取得できる', async () => {
      const { visits, loading, error, total, hasMore, fetchVisits } = useVeterinaryVisits();

      await fetchVisits();

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits', {
        query: {},
      });
      expect(visits.value).toEqual(mockVisits);
      expect(total.value).toBe(2);
      expect(hasMore.value).toBe(false);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
    });

    it('パラメータ付きで通院記録を取得できる', async () => {
      const { fetchVisits } = useVeterinaryVisits();

      const params = {
        catId: 'cat1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        hasBloodTest: true,
        limit: 10,
        offset: 0,
      };

      await fetchVisits(params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits', {
        query: params,
      });
    });

    it('ローディング状態が正しく管理される', async () => {
      const { loading, fetchVisits } = useVeterinaryVisits();

      // 非同期処理の開始前
      expect(loading.value).toBe(false);

      // 非同期処理中のローディング状態をテスト
      const fetchPromise = fetchVisits();
      expect(loading.value).toBe(true);

      await fetchPromise;
      expect(loading.value).toBe(false);
    });

    it('追加読み込み（ページネーション）が正しく動作する', async () => {
      const { visits, fetchVisits } = useVeterinaryVisits();

      // 初回読み込み
      await fetchVisits();
      expect(visits.value).toHaveLength(2);

      // 追加データのモック
      const additionalVisits = [
        {
          ...mockVisits[0],
          id: 'visit3',
          notes: 'テストメモ3',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        visits: additionalVisits,
        total: 3,
        hasMore: false,
        pagination: { limit: 20, offset: 2, total: 3 },
      });

      // 追加読み込み
      await fetchVisits({ offset: 2 }, true);

      expect(visits.value).toHaveLength(3);
      expect(visits.value[2].id).toBe('visit3');
    });

    it('エラーが発生した場合、エラー状態が設定される', async () => {
      const { error, loading, fetchVisits } = useVeterinaryVisits();

      const errorMessage = 'ネットワークエラー';
      mockFetch.mockRejectedValueOnce(new Error(errorMessage));

      await fetchVisits();

      expect(error.value).toBe('通院記録の取得に失敗しました');
      expect(loading.value).toBe(false);
    });
  });

  describe('createVisit', () => {
    it('通院記録を正常に作成できる', async () => {
      const { visits, createVisit } = useVeterinaryVisits();

      const newVisitData = {
        catId: 'cat1',
        visitDate: new Date('2024-01-25T10:00:00Z'),
        hospitalName: 'テスト動物病院',
        doctorName: 'テスト先生',
        treatments: ['健康診断'],
        cost: 4000,
        notes: '新しいメモ',
        hasBloodTest: false,
      };

      const createdVisit = {
        ...mockVisits[0],
        id: 'visit3',
        cost: 4000,
        notes: '新しいメモ',
        hasBloodTest: false,
      };

      mockFetch.mockResolvedValueOnce({ visit: createdVisit });

      mockFetch.mockResolvedValueOnce(createdVisit);

      const result = await createVisit(newVisitData);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits', {
        method: 'POST',
        body: newVisitData,
      });
      expect(result).toEqual(createdVisit);
      expect(visits.value).toContain(createdVisit);
    });

    it('作成エラーが発生した場合、エラーがスローされる', async () => {
      const { createVisit } = useVeterinaryVisits();

      const newVisitData = {
        catId: 'cat1',
        visitDate: new Date(),
        hospitalName: 'テスト病院',
        doctorName: '',
        treatments: ['健康診断'],
        cost: 4000,
        notes: '',
        hasBloodTest: false,
      };

      mockFetch.mockRejectedValueOnce(new Error('バリデーションエラー'));

      await expect(createVisit(newVisitData)).rejects.toThrow('通院記録の作成に失敗しました');
    });
  });
  describe('fetchVisit', () => {
    it('特定の通院記録を正常に取得できる', async () => {
      const { fetchVisit } = useVeterinaryVisits();

      mockFetch.mockResolvedValueOnce(mockVisits[0]);

      const result = await fetchVisit('visit1');

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits/visit1');
      expect(result).toEqual(mockVisits[0]);
    });

    it('存在しない記録の取得でエラーがスローされる', async () => {
      const { fetchVisit } = useVeterinaryVisits();

      mockFetch.mockRejectedValueOnce(new Error('記録が見つかりません'));

      await expect(fetchVisit('nonexistent')).rejects.toThrow('通院記録の取得に失敗しました');
    });
  });

  describe('updateVisit', () => {
    it('通院記録を正常に更新できる', async () => {
      const { visits, updateVisit, fetchVisits } = useVeterinaryVisits();

      // 初期データを設定
      await fetchVisits();

      const updateData = {
        id: 'visit1',
        cost: 6000,
        notes: '更新されたメモ',
        hasBloodTest: true,
      };

      const updatedVisit = {
        ...mockVisits[0],
        cost: 6000,
        notes: '更新されたメモ',
        hasBloodTest: true,
      };

      mockFetch.mockResolvedValueOnce(updatedVisit);

      const result = await updateVisit(updateData);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits/visit1', {
        method: 'PUT',
        body: updateData,
      });
      expect(result).toEqual(updatedVisit);

      // 一覧内のデータも更新されることを確認
      const updatedItem = visits.value.find(v => v.id === 'visit1');
      expect(updatedItem?.cost).toBe(6000);
      expect(updatedItem?.notes).toBe('更新されたメモ');
    });

    it('存在しない記録の更新でエラーがスローされる', async () => {
      const { updateVisit } = useVeterinaryVisits();

      mockFetch.mockRejectedValueOnce(new Error('記録が見つかりません'));

      await expect(updateVisit({ id: 'nonexistent', cost: 1000 })).rejects.toThrow('通院記録の更新に失敗しました');
    });
  });

  describe('deleteVisit', () => {
    it('通院記録を正常に削除できる', async () => {
      const { visits, deleteVisit, fetchVisits } = useVeterinaryVisits();

      // 初期データを設定
      await fetchVisits();
      expect(visits.value).toHaveLength(2);

      mockFetch.mockResolvedValueOnce({ message: '削除されました' });

      const result = await deleteVisit('visit1');

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits/visit1', {
        method: 'DELETE',
      });

      expect(result).toBe(true);
      // 一覧から削除されることを確認
      expect(visits.value).toHaveLength(1);
      expect(visits.value.find(v => v.id === 'visit1')).toBeUndefined();
    });

    it('削除エラーが発生した場合、エラーがスローされる', async () => {
      const { deleteVisit } = useVeterinaryVisits();

      mockFetch.mockRejectedValueOnce(new Error('削除に失敗しました'));

      await expect(deleteVisit('visit1')).rejects.toThrow('通院記録の削除に失敗しました');
    });
  });

  describe('loadMore', () => {
    it('次のページを正常に読み込める', async () => {
      const { visits, loadMore, fetchVisits } = useVeterinaryVisits();

      // 初期データ（hasMore: true）
      const initialResponse = {
        ...mockResponse,
        hasMore: true,
      };
      mockFetch.mockResolvedValueOnce(initialResponse);
      await fetchVisits();

      expect(visits.value).toHaveLength(2);

      // 追加データ
      const additionalVisit = {
        ...mockVisits[0],
        id: 'visit3',
        notes: '追加記録',
      };

      mockFetch.mockResolvedValueOnce({
        visits: [additionalVisit],
        total: 3,
        hasMore: false,
        pagination: { limit: 20, offset: 2, total: 3 },
      });

      await loadMore();

      expect(visits.value).toHaveLength(3);
      expect(visits.value[2].id).toBe('visit3');
    });

    it('hasMoreがfalseの場合、読み込みを行わない', async () => {
      const { loadMore, fetchVisits } = useVeterinaryVisits();

      await fetchVisits(); // hasMore: false

      const initialCallCount = mockFetch.mock.calls.length;
      await loadMore();

      // 追加のAPIコールが行われないことを確認
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });
  });

  describe('fetchVisitsByCat', () => {
    it('猫別の通院記録を取得できる', async () => {
      const { fetchVisitsByCat } = useVeterinaryVisits();

      const catId = 'cat1';
      const params = { limit: 10 };

      await fetchVisitsByCat(catId, params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits', {
        query: { ...params, catId },
      });
    });
  });

  describe('fetchVisitsByDateRange', () => {
    it('日付範囲で通院記録を取得できる', async () => {
      const { fetchVisitsByDateRange } = useVeterinaryVisits();

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const params = { limit: 10 };

      await fetchVisitsByDateRange(startDate, endDate, params);

      expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-visits', {
        query: {
          ...params,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      });
    });
  });

  describe('fetchBloodTestVisits', () => {
    it('血液検査実施記録のみを取得できる', async () => {
      const { fetchBloodTestVisits } = useVeterinaryVisits();

      const result = await fetchBloodTestVisits();

      expect(result.visits).toHaveLength(1);
      expect(result.visits[0].hasBloodTest).toBe(true);
      expect(result.total).toBe(1);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('refresh', () => {
    it('現在のパラメータで記録を再取得できる', async () => {
      const { refresh, fetchVisits } = useVeterinaryVisits();

      const params = { catId: 'cat1', limit: 10 };
      await fetchVisits(params);

      // 新しいデータでモックを更新
      const refreshedData = {
        visits: [mockVisits[0]],
        total: 1,
        hasMore: false,
        pagination: { limit: 10, offset: 0, total: 1 },
      };
      mockFetch.mockResolvedValueOnce(refreshedData);

      await refresh();

      // 同じパラメータで再度呼び出されることを確認
      expect(mockFetch).toHaveBeenLastCalledWith('/api/veterinary-visits', {
        query: params,
      });
    });
  });

  describe('reset', () => {
    it('状態をリセットできる', async () => {
      const { visits, loading, error, total, hasMore, reset, fetchVisits } = useVeterinaryVisits();

      // データを設定
      await fetchVisits();
      expect(visits.value).toHaveLength(2);

      // リセット
      reset();

      expect(visits.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(error.value).toBeNull();
      expect(total.value).toBe(0);
      expect(hasMore.value).toBe(false);
    });
  });

  describe('clearError', () => {
    it('エラー状態をクリアできる', async () => {
      const { error, clearError, fetchVisits } = useVeterinaryVisits();

      // エラーを発生させる
      mockFetch.mockRejectedValueOnce(new Error('テストエラー'));
      await fetchVisits();

      expect(error.value).toBeTruthy();

      clearError();
      expect(error.value).toBeNull();
    });
  });

  describe('Computed プロパティ', () => {
    it('isLoading が正しく計算される', async () => {
      const { isLoading, fetchVisits } = useVeterinaryVisits();

      expect(isLoading.value).toBe(false);

      const fetchPromise = fetchVisits();
      expect(isLoading.value).toBe(true);

      await fetchPromise;
      expect(isLoading.value).toBe(false);
    });

    it('hasError が正しく計算される', async () => {
      const { hasError, fetchVisits } = useVeterinaryVisits();

      expect(hasError.value).toBe(false);

      mockFetch.mockRejectedValueOnce(new Error('エラー'));
      await fetchVisits();

      expect(hasError.value).toBe(true);
    });

    it('isEmpty が正しく計算される', async () => {
      const { isEmpty, fetchVisits } = useVeterinaryVisits();

      expect(isEmpty.value).toBe(true);

      await fetchVisits();
      expect(isEmpty.value).toBe(false);
    });

    it('canLoadMore が正しく計算される', async () => {
      const { canLoadMore, fetchVisits } = useVeterinaryVisits();

      expect(canLoadMore.value).toBe(false);

      // hasMore: true のデータを設定
      mockFetch.mockResolvedValueOnce({
        ...mockResponse,
        hasMore: true,
      });
      await fetchVisits();

      expect(canLoadMore.value).toBe(true);
    });
  });

  describe('リアクティブ性', () => {
    it('visits配列の変更が正しく反映される', async () => {
      const { visits, fetchVisits } = useVeterinaryVisits();

      // 初期状態
      expect(visits.value).toHaveLength(0);

      // データ取得後
      await fetchVisits();
      expect(visits.value).toHaveLength(2);

      // 手動でデータを変更
      visits.value.push({
        ...mockVisits[0],
        id: 'visit3',
      });
      expect(visits.value).toHaveLength(3);
    });

    it('loading状態の変更が正しく反映される', async () => {
      const { loading, fetchVisits } = useVeterinaryVisits();

      expect(loading.value).toBe(false);

      const fetchPromise = fetchVisits();
      expect(loading.value).toBe(true);

      await fetchPromise;
      expect(loading.value).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('ネットワークエラーが適切に処理される', async () => {
      const { error, fetchVisits } = useVeterinaryVisits();

      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      await fetchVisits();

      expect(error.value).toBe('通院記録の取得に失敗しました');
    });

    it('APIエラーレスポンスが適切に処理される', async () => {
      const { error, createVisit } = useVeterinaryVisits();

      const apiError = {
        statusCode: 400,
        statusMessage: 'バリデーションエラー',
        data: { errors: ['猫を選択してください'] },
      };

      mockFetch.mockRejectedValueOnce(apiError);

      await expect(createVisit({
        catId: '',
        visitDate: new Date(),
        hospitalName: 'テスト病院',
        doctorName: '',
        treatments: ['健康診断'],
        cost: 1000,
        notes: '',
        hasBloodTest: false,
      })).rejects.toThrow('通院記録の作成に失敗しました');
    });
  });
});
