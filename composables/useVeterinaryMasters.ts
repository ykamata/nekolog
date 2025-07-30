import type {
  VeterinaryHospital,
  VeterinaryDoctor,
  VeterinaryTreatment,
  VeterinaryHospitalWithRelations,
  VeterinaryDoctorWithRelations,
  VeterinaryTreatmentWithRelations,
  CreateVeterinaryHospitalInput,
  CreateVeterinaryDoctorInput,
  CreateVeterinaryTreatmentInput,
} from '~/types/veterinary-visit';

// API レスポンス型の定義
interface GetHospitalsResponse {
  hospitals: (VeterinaryHospital & { _count: { visits: number; appointments: number; doctors: number } })[];
  total: number;
  hasMore: boolean;
}

interface GetDoctorsResponse {
  doctors: (VeterinaryDoctor & {
    hospital?: VeterinaryHospital | null;
    _count: { visits: number; appointments: number };
  })[];
  total: number;
  hasMore: boolean;
}

interface GetTreatmentsResponse {
  treatments: (VeterinaryTreatment & { _count: { visitTreatments: number } })[];
  total: number;
  hasMore: boolean;
}

// フィルタパラメータ型の定義
interface HospitalFilterParams {
  name?: string;
  limit?: number;
  offset?: number;
}

interface DoctorFilterParams {
  name?: string;
  hospitalId?: string;
  specialization?: string;
  limit?: number;
  offset?: number;
}

interface TreatmentFilterParams {
  name?: string;
  category?: string;
  limit?: number;
  offset?: number;
}

/**
 * 通院関連マスタデータ管理用のComposable
 * 病院・先生・処方内容マスタの管理と動的マスタ追加機能を提供
 */
export const useVeterinaryMasters = () => {
  // 病院マスタの状態管理
  const hospitals = ref<VeterinaryHospital[]>([]);
  const hospitalsLoading = ref(false);
  const hospitalsError = ref<string | null>(null);

  // 先生マスタの状態管理
  const doctors = ref<VeterinaryDoctor[]>([]);
  const doctorsLoading = ref(false);
  const doctorsError = ref<string | null>(null);

  // 処方内容マスタの状態管理
  const treatments = ref<VeterinaryTreatment[]>([]);
  const treatmentsLoading = ref(false);
  const treatmentsError = ref<string | null>(null);

  // 全体のローディング状態
  const loading = computed(() =>
    hospitalsLoading.value || doctorsLoading.value || treatmentsLoading.value,
  );

  /**
   * エラー状態をクリア
   */
  const clearErrors = () => {
    hospitalsError.value = null;
    doctorsError.value = null;
    treatmentsError.value = null;
  };

  // === 病院マスタ管理 ===

  /**
   * 病院マスタを取得
   * @param params フィルタ条件
   */
  const fetchHospitals = async (params: HospitalFilterParams = {}) => {
    hospitalsLoading.value = true;
    hospitalsError.value = null;

    try {
      const response = await $fetch<GetHospitalsResponse>('/api/veterinary-hospitals', {
        query: params,
      });

      hospitals.value = response.hospitals;
      return response;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '病院マスタの取得に失敗しました';
      hospitalsError.value = errorMessage;
      console.error('Failed to fetch hospitals:', err);
      throw new Error(errorMessage);
    }
    finally {
      hospitalsLoading.value = false;
    }
  };

  /**
   * 病院を検索（名前による部分一致）
   * @param name 検索する病院名
   */
  const searchHospitals = async (name: string) => {
    return await fetchHospitals({ name, limit: 50 });
  };

  /**
   * 新しい病院を作成
   * @param data 病院データ
   */
  const createHospital = async (data: CreateVeterinaryHospitalInput) => {
    hospitalsLoading.value = true;
    hospitalsError.value = null;

    try {
      const newHospital = await $fetch<VeterinaryHospital>('/api/veterinary-hospitals', {
        method: 'POST',
        body: data,
      });

      // 既存のリストに追加
      hospitals.value = [...hospitals.value, newHospital].sort((a, b) => a.name.localeCompare(b.name));
      return newHospital;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '病院の作成に失敗しました';
      hospitalsError.value = errorMessage;
      console.error('Failed to create hospital:', err);
      throw new Error(errorMessage);
    }
    finally {
      hospitalsLoading.value = false;
    }
  };

  /**
   * 病院名で検索し、存在しない場合は新規作成
   * @param name 病院名
   */
  const findOrCreateHospital = async (name: string) => {
    // まず既存の病院から検索
    let hospital = hospitals.value.find(h => h.name === name);

    if (hospital) {
      return hospital;
    }

    // サーバーから検索
    try {
      const response = await searchHospitals(name);
      hospital = response.hospitals.find(h => h.name === name);

      if (hospital) {
        return hospital;
      }
    }
    catch (error) {
      console.warn('Failed to search hospitals:', error);
    }

    // 存在しない場合は新規作成
    return await createHospital({ name });
  };

  // === 先生マスタ管理 ===

  /**
   * 先生マスタを取得
   * @param params フィルタ条件
   */
  const fetchDoctors = async (params: DoctorFilterParams = {}) => {
    doctorsLoading.value = true;
    doctorsError.value = null;

    try {
      const response = await $fetch<GetDoctorsResponse>('/api/veterinary-doctors', {
        query: params,
      });

      doctors.value = response.doctors;
      return response;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '先生マスタの取得に失敗しました';
      doctorsError.value = errorMessage;
      console.error('Failed to fetch doctors:', err);
      throw new Error(errorMessage);
    }
    finally {
      doctorsLoading.value = false;
    }
  };

  /**
   * 先生を検索（名前による部分一致）
   * @param name 検索する先生名
   * @param hospitalId 病院IDでフィルタ（オプション）
   */
  const searchDoctors = async (name: string, hospitalId?: string) => {
    return await fetchDoctors({ name, hospitalId, limit: 50 });
  };

  /**
   * 病院別の先生一覧を取得
   * @param hospitalId 病院ID
   */
  const fetchDoctorsByHospital = async (hospitalId: string) => {
    return await fetchDoctors({ hospitalId });
  };

  /**
   * 新しい先生を作成
   * @param data 先生データ
   */
  const createDoctor = async (data: CreateVeterinaryDoctorInput) => {
    doctorsLoading.value = true;
    doctorsError.value = null;

    try {
      const newDoctor = await $fetch<VeterinaryDoctor>('/api/veterinary-doctors', {
        method: 'POST',
        body: data,
      });

      // 既存のリストに追加
      doctors.value = [...doctors.value, newDoctor].sort((a, b) => a.name.localeCompare(b.name));
      return newDoctor;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '先生の作成に失敗しました';
      doctorsError.value = errorMessage;
      console.error('Failed to create doctor:', err);
      throw new Error(errorMessage);
    }
    finally {
      doctorsLoading.value = false;
    }
  };

  /**
   * 先生名で検索し、存在しない場合は新規作成
   * @param name 先生名
   * @param hospitalId 病院ID（オプション）
   */
  const findOrCreateDoctor = async (name: string, hospitalId?: string) => {
    // まず既存の先生から検索
    let doctor = doctors.value.find(d => d.name === name && (!hospitalId || d.hospitalId === hospitalId));

    if (doctor) {
      return doctor;
    }

    // サーバーから検索
    try {
      const response = await searchDoctors(name, hospitalId);
      doctor = response.doctors.find(d => d.name === name && (!hospitalId || d.hospitalId === hospitalId));

      if (doctor) {
        return doctor;
      }
    }
    catch (error) {
      console.warn('Failed to search doctors:', error);
    }

    // 存在しない場合は新規作成
    return await createDoctor({ name, hospitalId });
  };

  // === 処方内容マスタ管理 ===

  /**
   * 処方内容マスタを取得
   * @param params フィルタ条件
   */
  const fetchTreatments = async (params: TreatmentFilterParams = {}) => {
    treatmentsLoading.value = true;
    treatmentsError.value = null;

    try {
      const response = await $fetch<GetTreatmentsResponse>('/api/veterinary-treatments', {
        query: params,
      });

      treatments.value = response.treatments;
      return response;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '処方内容マスタの取得に失敗しました';
      treatmentsError.value = errorMessage;
      console.error('Failed to fetch treatments:', err);
      throw new Error(errorMessage);
    }
    finally {
      treatmentsLoading.value = false;
    }
  };

  /**
   * 処方内容を検索（名前による部分一致）
   * @param name 検索する処方内容名
   * @param category カテゴリでフィルタ（オプション）
   */
  const searchTreatments = async (name: string, category?: string) => {
    return await fetchTreatments({ name, category, limit: 50 });
  };

  /**
   * カテゴリ別の処方内容一覧を取得
   * @param category カテゴリ名
   */
  const fetchTreatmentsByCategory = async (category: string) => {
    return await fetchTreatments({ category });
  };

  /**
   * 新しい処方内容を作成
   * @param data 処方内容データ
   */
  const createTreatment = async (data: CreateVeterinaryTreatmentInput) => {
    treatmentsLoading.value = true;
    treatmentsError.value = null;

    try {
      const newTreatment = await $fetch<VeterinaryTreatment>('/api/veterinary-treatments', {
        method: 'POST',
        body: data,
      });

      // 既存のリストに追加
      treatments.value = [...treatments.value, newTreatment].sort((a, b) => a.name.localeCompare(b.name));
      return newTreatment;
    }
    catch (err: any) {
      const errorMessage = err?.data?.statusMessage || '処方内容の作成に失敗しました';
      treatmentsError.value = errorMessage;
      console.error('Failed to create treatment:', err);
      throw new Error(errorMessage);
    }
    finally {
      treatmentsLoading.value = false;
    }
  };

  /**
   * 処方内容名で検索し、存在しない場合は新規作成
   * @param name 処方内容名
   * @param category カテゴリ（オプション）
   */
  const findOrCreateTreatment = async (name: string, category?: string) => {
    // まず既存の処方内容から検索
    let treatment = treatments.value.find(t => t.name === name);

    if (treatment) {
      return treatment;
    }

    // サーバーから検索
    try {
      const response = await searchTreatments(name);
      treatment = response.treatments.find(t => t.name === name);

      if (treatment) {
        return treatment;
      }
    }
    catch (error) {
      console.warn('Failed to search treatments:', error);
    }

    // 存在しない場合は新規作成
    return await createTreatment({ name, category });
  };

  /**
   * 複数の処方内容を一括で検索・作成
   * @param names 処方内容名の配列
   */
  const findOrCreateTreatments = async (names: string[]) => {
    const results = [];

    for (const name of names) {
      const treatment = await findOrCreateTreatment(name);
      results.push(treatment);
    }

    return results;
  };

  // === 全体管理 ===

  /**
   * すべてのマスタデータを初期化
   */
  const initializeAll = async () => {
    await Promise.all([
      fetchHospitals({ limit: 100 }),
      fetchDoctors({ limit: 100 }),
      fetchTreatments({ limit: 100 }),
    ]);
  };

  /**
   * すべてのマスタデータをリフレッシュ
   */
  const refreshAll = async () => {
    await initializeAll();
  };

  /**
   * 状態をリセット
   */
  const reset = () => {
    hospitals.value = [];
    doctors.value = [];
    treatments.value = [];
    hospitalsLoading.value = false;
    doctorsLoading.value = false;
    treatmentsLoading.value = false;
    clearErrors();
  };

  // Computed プロパティ
  const hasHospitals = computed(() => hospitals.value.length > 0);
  const hasDoctors = computed(() => doctors.value.length > 0);
  const hasTreatments = computed(() => treatments.value.length > 0);
  const hasAnyData = computed(() => hasHospitals.value || hasDoctors.value || hasTreatments.value);
  const hasErrors = computed(() =>
    hospitalsError.value !== null || doctorsError.value !== null || treatmentsError.value !== null,
  );

  return {
    // 状態
    hospitals: readonly(hospitals),
    doctors: readonly(doctors),
    treatments: readonly(treatments),
    loading: readonly(loading),
    hospitalsLoading: readonly(hospitalsLoading),
    doctorsLoading: readonly(doctorsLoading),
    treatmentsLoading: readonly(treatmentsLoading),
    hospitalsError: readonly(hospitalsError),
    doctorsError: readonly(doctorsError),
    treatmentsError: readonly(treatmentsError),

    // Computed
    hasHospitals,
    hasDoctors,
    hasTreatments,
    hasAnyData,
    hasErrors,

    // 病院関連メソッド
    fetchHospitals,
    searchHospitals,
    createHospital,
    findOrCreateHospital,

    // 先生関連メソッド
    fetchDoctors,
    searchDoctors,
    fetchDoctorsByHospital,
    createDoctor,
    findOrCreateDoctor,

    // 処方内容関連メソッド
    fetchTreatments,
    searchTreatments,
    fetchTreatmentsByCategory,
    createTreatment,
    findOrCreateTreatment,
    findOrCreateTreatments,

    // 全体管理メソッド
    initializeAll,
    refreshAll,
    reset,
    clearErrors,
  };
};
