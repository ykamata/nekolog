import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { VeterinaryDoctor, VeterinaryDoctorInput } from '~/types/veterinary-master';

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
const { useVeterinaryDoctors } = await import('~/composables/useVeterinaryDoctors');

describe('useVeterinaryDoctors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('先生一覧を正常に取得できる', async () => {
    const mockDoctors: VeterinaryDoctor[] = [
      {
        id: 1,
        name: 'テスト先生',
        hospitalId: 1,
        specialization: '内科',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        hospital: {
          id: 1,
          name: 'テスト病院',
          userId: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ];

    mockFetch.mockResolvedValueOnce({ doctors: mockDoctors });

    const { doctors, loading, error, fetchDoctors } = useVeterinaryDoctors();

    await fetchDoctors();

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', {
      query: {},
    });
    expect(doctors.value).toEqual(mockDoctors);
    expect(loading.value).toBe(false);
    expect(error.value).toBe(null);
  });

  it('病院IDと検索クエリ付きで先生一覧を取得できる', async () => {
    const mockDoctors: VeterinaryDoctor[] = [];
    mockFetch.mockResolvedValueOnce({ doctors: mockDoctors });

    const { fetchDoctors } = useVeterinaryDoctors();

    await fetchDoctors(1, 'テスト');

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', {
      query: { hospitalId: 1, name: 'テスト' },
    });
  });

  it('先生を正常に作成できる', async () => {
    const doctorInput: VeterinaryDoctorInput = {
      name: '新しい先生',
      hospitalId: 1,
      specialization: '外科',
    };

    const mockCreatedDoctor: VeterinaryDoctor = {
      id: 2,
      ...doctorInput,
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      hospital: {
        id: 1,
        name: 'テスト病院',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    mockFetch.mockResolvedValueOnce({ doctor: mockCreatedDoctor });

    const { doctors, createDoctor } = useVeterinaryDoctors();

    const result = await createDoctor(doctorInput);

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', {
      method: 'POST',
      body: doctorInput,
    });
    expect(result).toEqual(mockCreatedDoctor);
    expect(doctors.value[0]).toEqual(mockCreatedDoctor);
    expect(mockShowToast).toHaveBeenCalledWith('先生を登録しました', 'success');
  });

  it('先生情報を正常に更新できる', async () => {
    const doctorInput: VeterinaryDoctorInput = {
      name: '更新された先生',
      hospitalId: 2,
      specialization: '皮膚科',
    };

    const mockUpdatedDoctor: VeterinaryDoctor = {
      id: 1,
      ...doctorInput,
      userId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      hospital: {
        id: 2,
        name: '新しい病院',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    // 既存の先生を設定
    const { doctors, updateDoctor } = useVeterinaryDoctors();
    doctors.value = [
      {
        id: 1,
        name: '元の先生名',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetch.mockResolvedValueOnce(mockUpdatedDoctor);

    const result = await updateDoctor('1', doctorInput);

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors/1', {
      method: 'PUT',
      body: doctorInput,
    });
    expect(result).toEqual(mockUpdatedDoctor);
    expect(doctors.value[0]).toEqual(mockUpdatedDoctor);
    expect(mockShowToast).toHaveBeenCalledWith('先生情報を更新しました', 'success');
  });

  it('先生を正常に削除できる', async () => {
    // 既存の先生を設定
    const { doctors, deleteDoctor } = useVeterinaryDoctors();
    doctors.value = [
      {
        id: 1,
        name: '削除対象先生',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: '残る先生',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetch.mockResolvedValueOnce({ success: true });

    await deleteDoctor('1');

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors/1', {
      method: 'DELETE',
    });
    expect(doctors.value).toHaveLength(1);
    expect(doctors.value[0].id).toBe('2');
    expect(mockShowToast).toHaveBeenCalledWith('先生を削除しました', 'success');
  });

  it('先生検索を正常に実行できる', async () => {
    const mockSearchResults: VeterinaryDoctor[] = [
      {
        id: 1,
        name: 'テスト先生',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockFetch.mockResolvedValueOnce({ doctors: mockSearchResults });

    const { searchDoctors } = useVeterinaryDoctors();

    const results = await searchDoctors('テスト', 1);

    expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors/search', {
      query: { name: 'テスト', hospitalId: 1 },
    });
    expect(results).toEqual(mockSearchResults);
  });

  it('病院IDで先生をフィルタリングできる', () => {
    const { doctors, getDoctorsByHospitalId } = useVeterinaryDoctors();
    doctors.value = [
      {
        id: 1,
        name: '先生1',
        hospitalId: 1,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        name: '先生2',
        hospitalId: 2,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        name: '先生3',
        hospitalId: 1,
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const filteredDoctors = getDoctorsByHospitalId(1);

    expect(filteredDoctors).toHaveLength(2);
    expect(filteredDoctors[0].id).toBe('1');
    expect(filteredDoctors[1].id).toBe('3');
  });

  it('先生名の重複チェックが正常に動作する', () => {
    const { doctors, checkDuplicateName } = useVeterinaryDoctors();
    doctors.value = [
      {
        id: 1,
        name: '既存の先生',
        userId: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // 重複する場合
    expect(checkDuplicateName('既存の先生')).toBe(true);
    expect(checkDuplicateName('既存の先生', '2')).toBe(true);

    // 重複しない場合
    expect(checkDuplicateName('新しい先生')).toBe(false);
    expect(checkDuplicateName('既存の先生', '1')).toBe(false); // 同じIDは除外
  });

  it('エラーハンドリングが正常に動作する', async () => {
    const mockError = {
      data: { message: 'テストエラー' },
    };

    mockFetch.mockRejectedValueOnce(mockError);

    const { error, fetchDoctors } = useVeterinaryDoctors();

    await fetchDoctors();

    expect(error.value).toBe('テストエラー');
    expect(mockShowToast).toHaveBeenCalledWith('先生一覧の取得に失敗しました', 'error');
  });
});
