import type {
  VeterinaryHospital,
  VeterinaryDoctor,
  VeterinaryTreatment,
  CreateVeterinaryHospitalInput,
  CreateVeterinaryDoctorInput,
  CreateVeterinaryTreatmentInput,
} from '~/types/veterinary-visit';

/**
 * 通院履歴のマスタデータ管理用コンポーザブル
 */
export const useVeterinaryMasters = () => {
  const hospitals = ref<VeterinaryHospital[]>([]);
  const doctors = ref<VeterinaryDoctor[]>([]);
  const treatments = ref<VeterinaryTreatment[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 病院を作成
   */
  const createHospital = async (input: CreateVeterinaryHospitalInput): Promise<VeterinaryHospital> => {
    try {
      const hospital = await $fetch<VeterinaryHospital>('/api/veterinary-hospitals', {
        method: 'POST',
        body: input,
      });

      hospitals.value.push(hospital);
      return hospital;
    }
    catch (err) {
      error.value = 'Failed to create hospital';
      throw err;
    }
  };

  /**
   * 先生を作成
   */
  const createDoctor = async (input: CreateVeterinaryDoctorInput): Promise<VeterinaryDoctor> => {
    try {
      const doctor = await $fetch<VeterinaryDoctor>('/api/veterinary-doctors', {
        method: 'POST',
        body: input,
      });

      doctors.value.push(doctor);
      return doctor;
    }
    catch (err) {
      error.value = 'Failed to create doctor';
      throw err;
    }
  };

  /**
   * 処方内容を作成
   */
  const createTreatment = async (input: CreateVeterinaryTreatmentInput): Promise<VeterinaryTreatment> => {
    try {
      const treatment = await $fetch<VeterinaryTreatment>('/api/veterinary-treatments', {
        method: 'POST',
        body: input,
      });

      treatments.value.push(treatment);
      return treatment;
    }
    catch (err) {
      error.value = 'Failed to create treatment';
      throw err;
    }
  };

  /**
   * マスタデータを読み込み
   */
  const loadMasterData = async () => {
    loading.value = true;
    error.value = null;

    try {
      const [hospitalsResponse, doctorsResponse, treatmentsResponse] = await Promise.all([
        $fetch<VeterinaryHospital[]>('/api/veterinary-hospitals'),
        $fetch<VeterinaryDoctor[]>('/api/veterinary-doctors'),
        $fetch<VeterinaryTreatment[]>('/api/veterinary-treatments'),
      ]);

      hospitals.value = hospitalsResponse;
      doctors.value = doctorsResponse;
      treatments.value = treatmentsResponse;
    }
    catch (err) {
      error.value = 'Failed to load master data';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  return {
    hospitals: readonly(hospitals),
    doctors: readonly(doctors),
    treatments: readonly(treatments),
    loading: readonly(loading),
    error: readonly(error),
    createHospital,
    createDoctor,
    createTreatment,
    loadMasterData,
  };
};
