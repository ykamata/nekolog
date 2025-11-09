import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVeterinaryMasters } from '~/composables/useVeterinaryMasters';
import type {
  VeterinaryHospital,
  VeterinaryDoctor,
  VeterinaryTreatment,
  CreateVeterinaryHospitalInput,
  CreateVeterinaryDoctorInput,
  CreateVeterinaryTreatmentInput,
} from '~/types/veterinary-visit';

// Mock $fetch
const mockFetch = vi.fn();
global.$fetch = mockFetch;

describe('useVeterinaryMasters', () => {
  const mockHospitals: (VeterinaryHospital & { _count: { visits: number; appointments: number; doctors: number } })[] = [
    {
      id: 1,
      name: 'テスト動物病院',
      address: '東京都渋谷区',
      phone: '03-1234-5678',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { visits: 5, appointments: 2, doctors: 3 },
    },
    {
      id: 2,
      name: 'サンプル獣医クリニック',
      address: '東京都新宿区',
      phone: '03-9876-5432',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { visits: 3, appointments: 1, doctors: 2 },
    },
  ];

  const mockDoctors: (VeterinaryDoctor & {
    hospital?: VeterinaryHospital | null;
    _count: { visits: number; appointments: number };
  })[] = [
    {
      id: 1,
      name: 'テスト先生',
      hospitalId: 1,
      specialization: '内科',
      createdAt: new Date(),
      updatedAt: new Date(),
      hospital: mockHospitals[0],
      _count: { visits: 10, appointments: 3 },
    },
    {
      id: 2,
      name: 'サンプル先生',
      hospitalId: 1,
      specialization: '外科',
      createdAt: new Date(),
      updatedAt: new Date(),
      hospital: mockHospitals[0],
      _count: { visits: 8, appointments: 2 },
    },
  ];

  const mockTreatments: (VeterinaryTreatment & { _count: { visitTreatments: number } })[] = [
    {
      id: 1,
      name: '健康診断',
      category: '診察',
      description: '定期的な健康チェック',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { visitTreatments: 15 },
    },
    {
      id: 2,
      name: 'ワクチン接種',
      category: '予防',
      description: '感染症予防のためのワクチン',
      createdAt: new Date(),
      updatedAt: new Date(),
      _count: { visitTreatments: 12 },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期状態', () => {
    it('初期状態が正しく設定される', () => {
      const {
        hospitals,
        doctors,
        treatments,
        loading,
        hospitalsLoading,
        doctorsLoading,
        treatmentsLoading,
        hospitalsError,
        doctorsError,
        treatmentsError,
      } = useVeterinaryMasters();

      expect(hospitals.value).toEqual([]);
      expect(doctors.value).toEqual([]);
      expect(treatments.value).toEqual([]);
      expect(loading.value).toBe(false);
      expect(hospitalsLoading.value).toBe(false);
      expect(doctorsLoading.value).toBe(false);
      expect(treatmentsLoading.value).toBe(false);
      expect(hospitalsError.value).toBeNull();
      expect(doctorsError.value).toBeNull();
      expect(treatmentsError.value).toBeNull();
    });
  });

  describe('病院マスタ管理', () => {
    describe('fetchHospitals', () => {
      it('病院マスタを正常に取得できる', async () => {
        const { hospitals, hospitalsLoading, hospitalsError, fetchHospitals } = useVeterinaryMasters();

        const mockResponse = {
          hospitals: mockHospitals,
          total: 2,
          hasMore: false,
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await fetchHospitals();

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', {
          query: {},
        });
        expect(hospitals.value).toEqual(mockHospitals);
        expect(result).toEqual(mockResponse);
        expect(hospitalsLoading.value).toBe(false);
        expect(hospitalsError.value).toBeNull();
      });

      it('パラメータ付きで病院を検索できる', async () => {
        const { fetchHospitals } = useVeterinaryMasters();

        const params = { name: 'テスト', limit: 10 };
        mockFetch.mockResolvedValueOnce({ hospitals: [], total: 0, hasMore: false });

        await fetchHospitals(params);

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', {
          query: params,
        });
      });

      it('エラーが発生した場合、エラー状態が設定される', async () => {
        const { hospitalsError, fetchHospitals } = useVeterinaryMasters();

        mockFetch.mockRejectedValueOnce(new Error('ネットワークエラー'));

        await expect(fetchHospitals()).rejects.toThrow('病院マスタの取得に失敗しました');
        expect(hospitalsError.value).toBe('病院マスタの取得に失敗しました');
      });
    });

    describe('createHospital', () => {
      it('新しい病院を正常に作成できる', async () => {
        const { hospitals, createHospital } = useVeterinaryMasters();

        const newHospitalData: CreateVeterinaryHospitalInput = {
          name: '新しい動物病院',
          address: '東京都港区',
          phone: '03-1111-2222',
        };

        const createdHospital: VeterinaryHospital = {
          id: 3,
          ...newHospitalData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockFetch.mockResolvedValueOnce(createdHospital);

        const result = await createHospital(newHospitalData);

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', {
          method: 'POST',
          body: newHospitalData,
        });
        expect(result).toEqual(createdHospital);
        expect(hospitals.value.find(h => h.id === createdHospital.id)).toEqual(createdHospital);
      });

      it('作成エラーが発生した場合、エラーがスローされる', async () => {
        const { createHospital } = useVeterinaryMasters();

        mockFetch.mockRejectedValueOnce(new Error('バリデーションエラー'));

        await expect(createHospital({ name: '' })).rejects.toThrow('病院の作成に失敗しました');
      });
    });

    describe('findOrCreateHospital', () => {
      it('既存の病院が見つかった場合、それを返す', async () => {
        const { hospitals, findOrCreateHospital, fetchHospitals } = useVeterinaryMasters();

        // 初期データを設定
        mockFetch.mockResolvedValueOnce({
          hospitals: mockHospitals,
          total: 2,
          hasMore: false,
        });
        await fetchHospitals();

        const result = await findOrCreateHospital('テスト動物病院');

        expect(result).toEqual(mockHospitals[0]);
        // 新規作成のAPIは呼ばれない
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('存在しない病院の場合、新規作成する', async () => {
        const { findOrCreateHospital } = useVeterinaryMasters();

        const newHospital: VeterinaryHospital = {
          id: 3,
          name: '新しい病院',
          address: null,
          phone: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 検索結果が空
        mockFetch.mockResolvedValueOnce({
          hospitals: [],
          total: 0,
          hasMore: false,
        });

        // 新規作成
        mockFetch.mockResolvedValueOnce(newHospital);

        const result = await findOrCreateHospital('新しい病院');

        expect(result).toEqual(newHospital);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('先生マスタ管理', () => {
    describe('fetchDoctors', () => {
      it('先生マスタを正常に取得できる', async () => {
        const { doctors, doctorsLoading, doctorsError, fetchDoctors } = useVeterinaryMasters();

        const mockResponse = {
          doctors: mockDoctors,
          total: 2,
          hasMore: false,
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await fetchDoctors();

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', {
          query: {},
        });
        expect(doctors.value).toEqual(mockDoctors);
        expect(result).toEqual(mockResponse);
        expect(doctorsLoading.value).toBe(false);
        expect(doctorsError.value).toBeNull();
      });

      it('病院IDでフィルタリングして先生を取得できる', async () => {
        const { fetchDoctorsByHospital } = useVeterinaryMasters();

        const hospitalId = 1;
        mockFetch.mockResolvedValueOnce({ doctors: [], total: 0, hasMore: false });

        await fetchDoctorsByHospital(hospitalId);

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', {
          query: { hospitalId },
        });
      });
    });

    describe('createDoctor', () => {
      it('新しい先生を正常に作成できる', async () => {
        const { doctors, createDoctor } = useVeterinaryMasters();

        const newDoctorData: CreateVeterinaryDoctorInput = {
          name: '新しい先生',
          hospitalId: 1,
          specialization: '皮膚科',
        };

        const createdDoctor: VeterinaryDoctor = {
          id: 3,
          ...newDoctorData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockFetch.mockResolvedValueOnce(createdDoctor);

        const result = await createDoctor(newDoctorData);

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', {
          method: 'POST',
          body: newDoctorData,
        });
        expect(result).toEqual(createdDoctor);
        expect(doctors.value.find(d => d.id === createdDoctor.id)).toEqual(createdDoctor);
      });
    });

    describe('findOrCreateDoctor', () => {
      it('既存の先生が見つかった場合、それを返す', async () => {
        const { doctors, findOrCreateDoctor, fetchDoctors } = useVeterinaryMasters();

        // 初期データを設定
        mockFetch.mockResolvedValueOnce({
          doctors: mockDoctors,
          total: 2,
          hasMore: false,
        });
        await fetchDoctors();

        const result = await findOrCreateDoctor('テスト先生', 1);

        expect(result).toEqual(mockDoctors[0]);
      });

      it('存在しない先生の場合、新規作成する', async () => {
        const { findOrCreateDoctor } = useVeterinaryMasters();

        const newDoctor: VeterinaryDoctor = {
          id: 3,
          name: '新しい先生',
          hospitalId: 1,
          specialization: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 検索結果が空
        mockFetch.mockResolvedValueOnce({
          doctors: [],
          total: 0,
          hasMore: false,
        });

        // 新規作成
        mockFetch.mockResolvedValueOnce(newDoctor);

        const result = await findOrCreateDoctor('新しい先生', 1);

        expect(result).toEqual(newDoctor);
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('処方内容マスタ管理', () => {
    describe('fetchTreatments', () => {
      it('処方内容マスタを正常に取得できる', async () => {
        const { treatments, treatmentsLoading, treatmentsError, fetchTreatments } = useVeterinaryMasters();

        const mockResponse = {
          treatments: mockTreatments,
          total: 2,
          hasMore: false,
        };

        mockFetch.mockResolvedValueOnce(mockResponse);

        const result = await fetchTreatments();

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-treatments', {
          query: {},
        });
        expect(treatments.value).toEqual(mockTreatments);
        expect(result).toEqual(mockResponse);
        expect(treatmentsLoading.value).toBe(false);
        expect(treatmentsError.value).toBeNull();
      });

      it('カテゴリでフィルタリングして処方内容を取得できる', async () => {
        const { fetchTreatmentsByCategory } = useVeterinaryMasters();

        const category = '診察';
        mockFetch.mockResolvedValueOnce({ treatments: [], total: 0, hasMore: false });

        await fetchTreatmentsByCategory(category);

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-treatments', {
          query: { category },
        });
      });
    });

    describe('createTreatment', () => {
      it('新しい処方内容を正常に作成できる', async () => {
        const { treatments, createTreatment } = useVeterinaryMasters();

        const newTreatmentData: CreateVeterinaryTreatmentInput = {
          name: '新しい処方',
          category: '治療',
          description: '新しい治療法',
        };

        const createdTreatment: VeterinaryTreatment = {
          id: 3,
          ...newTreatmentData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockFetch.mockResolvedValueOnce(createdTreatment);

        const result = await createTreatment(newTreatmentData);

        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-treatments', {
          method: 'POST',
          body: newTreatmentData,
        });
        expect(result).toEqual(createdTreatment);
        expect(treatments.value.find(t => t.id === createdTreatment.id)).toEqual(createdTreatment);
      });
    });

    describe('findOrCreateTreatments', () => {
      it('複数の処方内容を一括で検索・作成できる', async () => {
        const { findOrCreateTreatments } = useVeterinaryMasters();

        const treatmentNames = ['健康診断', '新しい処方'];

        // 既存の処方内容
        const existingTreatment = mockTreatments[0];

        // 新しい処方内容
        const newTreatment: VeterinaryTreatment = {
          id: 3,
          name: '新しい処方',
          category: null,
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        // 1回目の検索（健康診断）
        mockFetch.mockResolvedValueOnce({
          treatments: [existingTreatment],
          total: 1,
          hasMore: false,
        });

        // 2回目の検索（新しい処方）
        mockFetch.mockResolvedValueOnce({
          treatments: [],
          total: 0,
          hasMore: false,
        });

        // 新規作成
        mockFetch.mockResolvedValueOnce(newTreatment);

        const results = await findOrCreateTreatments(treatmentNames);

        expect(results).toHaveLength(2);
        expect(results[0]).toEqual(existingTreatment);
        expect(results[1]).toEqual(newTreatment);
        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe('全体管理', () => {
    describe('initializeAll', () => {
      it('すべてのマスタデータを初期化できる', async () => {
        const { initializeAll } = useVeterinaryMasters();

        mockFetch.mockResolvedValueOnce({ hospitals: mockHospitals, total: 2, hasMore: false });
        mockFetch.mockResolvedValueOnce({ doctors: mockDoctors, total: 2, hasMore: false });
        mockFetch.mockResolvedValueOnce({ treatments: mockTreatments, total: 2, hasMore: false });

        await initializeAll();

        expect(mockFetch).toHaveBeenCalledTimes(3);
        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-hospitals', { query: { limit: 100 } });
        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-doctors', { query: { limit: 100 } });
        expect(mockFetch).toHaveBeenCalledWith('/api/veterinary-treatments', { query: { limit: 100 } });
      });
    });

    describe('reset', () => {
      it('すべての状態をリセットできる', async () => {
        const {
          hospitals,
          doctors,
          treatments,
          hospitalsLoading,
          doctorsLoading,
          treatmentsLoading,
          reset,
          fetchHospitals,
        } = useVeterinaryMasters();

        // データを設定
        mockFetch.mockResolvedValueOnce({ hospitals: mockHospitals, total: 2, hasMore: false });
        await fetchHospitals();

        expect(hospitals.value).toHaveLength(2);

        // リセット
        reset();

        expect(hospitals.value).toEqual([]);
        expect(doctors.value).toEqual([]);
        expect(treatments.value).toEqual([]);
        expect(hospitalsLoading.value).toBe(false);
        expect(doctorsLoading.value).toBe(false);
        expect(treatmentsLoading.value).toBe(false);
      });
    });
  });

  describe('Computed プロパティ', () => {
    it('hasHospitals が正しく計算される', async () => {
      const { hasHospitals, fetchHospitals } = useVeterinaryMasters();

      expect(hasHospitals.value).toBe(false);

      mockFetch.mockResolvedValueOnce({ hospitals: mockHospitals, total: 2, hasMore: false });
      await fetchHospitals();

      expect(hasHospitals.value).toBe(true);
    });

    it('loading が正しく計算される', async () => {
      const { loading, fetchHospitals } = useVeterinaryMasters();

      expect(loading.value).toBe(false);

      mockFetch.mockResolvedValueOnce({ hospitals: [], total: 0, hasMore: false });

      const fetchPromise = fetchHospitals();
      expect(loading.value).toBe(true);

      await fetchPromise;

      expect(loading.value).toBe(false);
    });

    it('hasErrors が正しく計算される', async () => {
      const { hasErrors, fetchHospitals } = useVeterinaryMasters();

      expect(hasErrors.value).toBe(false);

      mockFetch.mockRejectedValueOnce(new Error('エラー'));
      await expect(fetchHospitals()).rejects.toThrow();

      expect(hasErrors.value).toBe(true);
    });
  });

  describe('エラーハンドリング', () => {
    it('clearErrors でエラー状態をクリアできる', async () => {
      const { hospitalsError, clearErrors, fetchHospitals } = useVeterinaryMasters();

      mockFetch.mockRejectedValueOnce(new Error('テストエラー'));
      await expect(fetchHospitals()).rejects.toThrow();

      expect(hospitalsError.value).toBeTruthy();

      clearErrors();
      expect(hospitalsError.value).toBeNull();
    });

    it('APIエラーレスポンスが適切に処理される', async () => {
      const { createHospital } = useVeterinaryMasters();

      const apiError = {
        statusCode: 400,
        statusMessage: 'バリデーションエラー',
        data: { errors: ['病院名は必須です'] },
      };

      mockFetch.mockRejectedValueOnce(apiError);

      await expect(createHospital({ name: '' })).rejects.toThrow('病院の作成に失敗しました');
    });
  });

  describe('ローディング状態管理', () => {
    it('各マスタのローディング状態が独立して管理される', async () => {
      const {
        hospitalsLoading,
        doctorsLoading,
        treatmentsLoading,
        fetchHospitals,
        fetchDoctors,
      } = useVeterinaryMasters();

      // 病院取得開始
      mockFetch.mockResolvedValueOnce({ hospitals: [], total: 0, hasMore: false });
      const hospitalPromise = fetchHospitals();
      expect(hospitalsLoading.value).toBe(true);
      expect(doctorsLoading.value).toBe(false);
      expect(treatmentsLoading.value).toBe(false);

      await hospitalPromise;

      expect(hospitalsLoading.value).toBe(false);

      // 先生取得開始
      mockFetch.mockResolvedValueOnce({ doctors: [], total: 0, hasMore: false });
      const doctorPromise = fetchDoctors();
      expect(hospitalsLoading.value).toBe(false);
      expect(doctorsLoading.value).toBe(true);
      expect(treatmentsLoading.value).toBe(false);

      await doctorPromise;

      expect(doctorsLoading.value).toBe(false);
    });
  });
});
