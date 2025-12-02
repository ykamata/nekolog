import type { VeterinaryHospital, VeterinaryDoctor, VeterinaryTreatment } from '~/types/veterinary-visit';

export const useVeterinaryMasters = () => {
  const hospitals = ref<VeterinaryHospital[]>([]);
  const doctors = ref<VeterinaryDoctor[]>([]);
  const treatments = ref<VeterinaryTreatment[]>([]);

  const createHospital = async (name: string): Promise<VeterinaryHospital> => {
    try {
      const response = await $fetch<{ hospital: VeterinaryHospital }>('/api/veterinary-hospitals', {
        method: 'POST',
        body: { name },
      });
      hospitals.value.push(response.hospital);
      return response.hospital;
    }
    catch (error) {
      console.error('Failed to create hospital:', error);
      throw error;
    }
  };

  const createDoctor = async (name: string, hospitalId?: number): Promise<VeterinaryDoctor> => {
    try {
      const response = await $fetch<{ doctor: VeterinaryDoctor }>('/api/veterinary-doctors', {
        method: 'POST',
        body: { name, hospitalId },
      });
      doctors.value.push(response.doctor);
      return response.doctor;
    }
    catch (error) {
      console.error('Failed to create doctor:', error);
      throw error;
    }
  };

  const createTreatment = async (name: string): Promise<VeterinaryTreatment> => {
    try {
      const response = await $fetch<{ treatment: VeterinaryTreatment }>('/api/veterinary-treatments', {
        method: 'POST',
        body: { name },
      });
      treatments.value.push(response.treatment);
      return response.treatment;
    }
    catch (error) {
      console.error('Failed to create treatment:', error);
      throw error;
    }
  };

  const fetchHospitals = async (): Promise<VeterinaryHospital[]> => {
    try {
      const data = await $fetch<VeterinaryHospital[]>('/api/veterinary-hospitals');
      hospitals.value = data;
      return data;
    }
    catch (error) {
      console.error('Failed to fetch hospitals:', error);
      throw error;
    }
  };

  const fetchDoctors = async (): Promise<VeterinaryDoctor[]> => {
    try {
      const data = await $fetch<VeterinaryDoctor[]>('/api/veterinary-doctors');
      doctors.value = data;
      return data;
    }
    catch (error) {
      console.error('Failed to fetch doctors:', error);
      throw error;
    }
  };

  const fetchTreatments = async (): Promise<VeterinaryTreatment[]> => {
    try {
      const data = await $fetch<VeterinaryTreatment[]>('/api/veterinary-treatments');
      treatments.value = data;
      return data;
    }
    catch (error) {
      console.error('Failed to fetch treatments:', error);
      throw error;
    }
  };

  return {
    hospitals: readonly(hospitals),
    doctors: readonly(doctors),
    treatments: readonly(treatments),
    createHospital,
    createDoctor,
    createTreatment,
    fetchHospitals,
    fetchDoctors,
    fetchTreatments,
  };
};
