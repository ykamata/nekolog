import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VeterinaryHospital, VeterinaryHospitalInput } from '~/types/veterinary-master';

// $fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// useToastのモック
const mockShowToast = vi.fn();
vi.mock('~/composables/useToast', () => ({
  useToast: vi.fn(() => ({
    showToast: mockShowToast,
  })),
}));

// Composableを動的にインポート
const { useVeterinaryHospitals } = await import('~/composables/useVeterinaryHospitals');

describe('useVeterinaryHospitals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('病院一覧を正常に取得できる', async () => {
    const mockHospitals: VeterinaryHospital[] = [
      {
        id: '1',
        name: 'テスト動物病院',
        address: 'テスト住所',
        phone: '03-1234-5678',
        memo: null,
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { doctors: 2 },
      },
    ];

    mockFetch.mockResolvedValueOnce(mockHospitals);

    const { hospitals, loading, error, fetchHospitals } = useVeterinaryHospitals();

    await fetchHospitals();

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', {
      query: {},
    });
    expect(hospitals.value).toEqual(mockHospitals);
    expect(loading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it('検索クエリ付きで病院一覧を取得できる', async () => {
    const mockHospitals: VeterinaryHospital[] = [];
    mockFetch.mockResolvedValueOnce(mockHospitals);

    const { fetchHospitals } = useVeterinaryHospitals();

    await fetchHospitals('テスト');

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', {
      query: { query: 'テスト' },
    });
  });

  it('病院を正常に作成できる', async () => {
    const hospitalInput: VeterinaryHospitalInput = {
      name: '新しい動物病院',
      address: '新しい住所',
      phone: '03-9999-9999',
      memo: 'テストメモ',
    };

    const mockCreatedHospital: VeterinaryHospital = {
      id: '2',
      ...hospitalInput,
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    mockFetch.mockResolvedValueOnce(mockCreatedHospital);

    const { hospitals, createHospital } = useVeterinaryHospitals();

    const result = await createHospital(hospitalInput);

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', {
      method: 'POST',
      body: hospitalInput,
    });
    expect(result).toEqual(mockCreatedHospital);
    expect(hospitals.value[0]).toEqual(mockCreatedHospital);
    expect(mockShowToast).toHaveBeenCalledWith('病院を登録しました', 'success');
  });

  it('病院情報を正常に更新できる', async () => {
    const hospitalInput: VeterinaryHospitalInput = {
      name: '更新された動物病院',
      address: '更新された住所',
    };

    const mockUpdatedHospital: VeterinaryHospital = {
      id: '1',
      ...hospitalInput,
      phone: null,
      memo: null,
      userId: 'user1',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 既存の病院を設定
    const { hospitals, updateHospital } = useVeterinaryHospitals();
    hospitals.value = [
      {
        id: '1',
        name: '元の病院名',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetch.mockResolvedValueOnce(mockUpdatedHospital);

    const result = await updateHospital('1', hospitalInput);

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals/1', {
      method: 'PUT',
      body: hospitalInput,
    });
    expect(result).toEqual(mockUpdatedHospital);
    expect(hospitals.value[0]).toEqual(mockUpdatedHospital);
    expect(mockShowToast).toHaveBeenCalledWith('病院情報を更新しました', 'success');
  });

  it('病院を正常に削除できる', async () => {
    // 既存の病院を設定
    const { hospitals, deleteHospital } = useVeterinaryHospitals();
    hospitals.value = [
      {
        id: '1',
        name: '削除対象病院',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        name: '残る病院',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetch.mockResolvedValueOnce({ success: true });

    await deleteHospital('1');

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals/1', {
      method: 'DELETE',
    });
    expect(hospitals.value).toHaveLength(1);
    expect(hospitals.value[0].id).toBe('2');
    expect(mockShowToast).toHaveBeenCalledWith('病院を削除しました', 'success');
  });

  it('病院検索を正常に実行できる', async () => {
    const mockSearchResults: VeterinaryHospital[] = [
      {
        id: '1',
        name: 'テスト動物病院',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetch.mockResolvedValueOnce(mockSearchResults);

    const { searchHospitals } = useVeterinaryHospitals();

    const results = await searchHospitals('テスト');

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals/search', {
      query: { query: 'テスト' },
    });
    expect(results).toEqual(mockSearchResults);
  });

  it('病院名の重複チェックが正常に動作する', () => {
    const { hospitals, checkDuplicateName } = useVeterinaryHospitals();
    hospitals.value = [
      {
        id: '1',
        name: '既存の病院',
        userId: 'user1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // 重複する場合
    expect(checkDuplicateName('既存の病院')).toBe(true);
    expect(checkDuplicateName('既存の病院', '2')).toBe(true);

    // 重複しない場合
    expect(checkDuplicateName('新しい病院')).toBe(false);
    expect(checkDuplicateName('既存の病院', '1')).toBe(false); // 同じIDは除外
  });

  it('エラーハンドリングが正常に動作する', async () => {
    const mockError = {
      data: { message: 'テストエラー' },
    };

    mockFetch.mockRejectedValueOnce(mockError);

    const { error, fetchHospitals } = useVeterinaryHospitals();

    await fetchHospitals();

    expect(error.value).toBe('テストエラー');
    expect(mockShowToast).toHaveBeenCalledWith('病院一覧の取得に失敗しました', 'error');
  });
});
