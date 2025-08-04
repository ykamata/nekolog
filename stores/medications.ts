import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  Medication,
  MedicationInput,
  MedicationUpdate,
  MedicationFilter,
  MedicationRecord,
  MedicationRecordInput,
  MedicationRecordUpdate,
  MedicationRecordFilter,
  MedicationSchedule,
  MedicationReminder,
  MedicationReminderInput,
  MedicationReminderFilter,
} from '~/types/medication';

import {
  MedicationStatus,
  ReminderStatus,
} from '~/types/medication';

export const useMedicationsStore = defineStore('medications', () => {
  // State
  const medications = ref<Medication[]>([]);
  const medicationRecords = ref<MedicationRecord[]>([]);
  const medicationSchedules = ref<MedicationSchedule[]>([]);
  const medicationReminders = ref<MedicationReminder[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const cache = ref({
    lastFetch: null as Date | null,
    recordsLastFetch: null as Date | null,
    schedulesLastFetch: null as Date | null,
    remindersLastFetch: null as Date | null,
  });
  const retryCount = ref(0);
  const lastErrorTime = ref<Date | null>(null);

  // Basic getters
  const isLoading = computed((): boolean => loading.value);
  const hasError = computed((): boolean => !!error.value);

  const isCacheValid = computed((): boolean => {
    if (!cache.value.lastFetch) return false;
    const now = new Date();
    return now.getTime() - cache.value.lastFetch.getTime() < 5 * 60 * 1000; // 5 minutes
  });

  const isRecordsCacheValid = computed((): boolean => {
    if (!cache.value.recordsLastFetch) return false;
    const now = new Date();
    return now.getTime() - cache.value.recordsLastFetch.getTime() < 5 * 60 * 1000;
  });

  const isSchedulesCacheValid = computed((): boolean => {
    if (!cache.value.schedulesLastFetch) return false;
    const now = new Date();
    return now.getTime() - cache.value.schedulesLastFetch.getTime() < 5 * 60 * 1000;
  });

  const isRemindersCacheValid = computed((): boolean => {
    if (!cache.value.remindersLastFetch) return false;
    const now = new Date();
    return now.getTime() - cache.value.remindersLastFetch.getTime() < 5 * 60 * 1000;
  });

  // Medication getters
  const getMedicationById = computed(() => (id: string): Medication | undefined => {
    return medications.value.find(med => med.id === id);
  });

  const getMedicationsByType = computed(() => (type: string): Medication[] => {
    return medications.value.filter(med => med.type === type);
  });

  const activeMedications = computed((): Medication[] => {
    return medications.value.filter(med => med.type === 'MEDICINE');
  });

  const sortedMedications = computed((): Medication[] => {
    return [...medications.value].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Record getters
  const getMedicationRecordById = computed(() => (id: string): MedicationRecord | undefined => {
    return medicationRecords.value.find(record => record.id === id);
  });

  const getMedicationRecordsByCat = computed(() => (catId: string): MedicationRecord[] => {
    return medicationRecords.value.filter(record => record.catId === catId);
  });

  const getMedicationRecordsByCatAndMedication = computed(() =>
    (catId: string, medicationId: string): MedicationRecord[] => {
      return medicationRecords.value.filter(
        record => record.catId === catId && record.medicationId === medicationId,
      );
    },
  );

  const getMedicationRecordsByCatAndStatus = computed(() =>
    (catId: string, status: MedicationStatus): MedicationRecord[] => {
      return medicationRecords.value.filter(
        record => record.catId === catId && record.status === status,
      );
    },
  );

  const getMedicationRecordsByCatAndDateRange = computed(() =>
    (catId: string, startDate: Date, endDate: Date): MedicationRecord[] => {
      return medicationRecords.value.filter((record) => {
        const recordDate = new Date(record.administeredAt);
        return record.catId === catId && recordDate >= startDate && recordDate <= endDate;
      });
    },
  );

  const getCatMedicationSummary = computed(() => (catId: string) => {
    const records = medicationRecords.value.filter(r => r.catId === catId);
    const reminders = medicationReminders.value.filter(r => r.catId === catId);
    const pendingRecords = records.filter(r => r.status === MedicationStatus.PENDING);
    const lastRecord = records.sort((a, b) => new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime())[0];

    return {
      totalRecords: records.length,
      pendingRecords: pendingRecords.length,
      pendingReminders: reminders.filter(r => r.status === ReminderStatus.PENDING).length,
      lastAdministered: lastRecord?.administeredAt || null,
    };
  });

  const getMedicationRecordsByMedication = computed(() =>
    (medicationId: string): MedicationRecord[] => {
      return medicationRecords.value.filter(record => record.medicationId === medicationId);
    },
  );

  const getMedicationRecordsByDateRange = computed(() =>
    (startDate: Date, endDate: Date): MedicationRecord[] => {
      return medicationRecords.value.filter((record) => {
        const recordDate = new Date(record.administeredAt);
        return recordDate >= startDate && recordDate <= endDate;
      });
    },
  );

  const sortedMedicationRecords = computed((): MedicationRecord[] => {
    return [...medicationRecords.value].sort((a, b) =>
      new Date(b.administeredAt).getTime() - new Date(a.administeredAt).getTime(),
    );
  });

  const getTodaysMedicationRecords = computed((): MedicationRecord[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return medicationRecords.value.filter((record) => {
      const recordDate = new Date(record.administeredAt);
      return recordDate >= today && recordDate < tomorrow;
    });
  });

  const getPendingMedicationRecords = computed((): MedicationRecord[] => {
    return medicationRecords.value.filter(record => record.status === MedicationStatus.PENDING);
  });

  const getAdministeredMedicationRecords = computed((): MedicationRecord[] => {
    return medicationRecords.value.filter(record => record.status === MedicationStatus.ADMINISTERED);
  });

  const getOverdueMedicationRecords = computed((): MedicationRecord[] => {
    const now = new Date();
    return medicationRecords.value.filter((record) => {
      const recordDate = new Date(record.administeredAt);
      return recordDate < now && record.status === MedicationStatus.PENDING;
    });
  });

  const getMissedMedicationRecords = computed((): MedicationRecord[] => {
    return medicationRecords.value.filter(record => record.status === MedicationStatus.MISSED);
  });

  const getSkippedMedicationRecords = computed((): MedicationRecord[] => {
    return medicationRecords.value.filter(record => record.status === MedicationStatus.SKIPPED);
  });

  const getMedicationRecordsByStatus = computed(() =>
    (status: MedicationStatus): MedicationRecord[] => {
      return medicationRecords.value.filter(record => record.status === status);
    },
  );

  const getPendingMedicationRecordsByCat = computed(() =>
    (catId: string): MedicationRecord[] => {
      return medicationRecords.value.filter(
        record => record.catId === catId && record.status === MedicationStatus.PENDING,
      );
    },
  );

  const getOverdueMedicationRecordsByCat = computed(() =>
    (catId: string): MedicationRecord[] => {
      const now = new Date();
      return medicationRecords.value.filter((record) => {
        const recordDate = new Date(record.administeredAt);
        return record.catId === catId && recordDate < now && record.status === MedicationStatus.PENDING;
      });
    },
  );

  // Schedule getters
  const getMedicationScheduleById = computed(() => (id: string): MedicationSchedule | undefined => {
    return medicationSchedules.value.find(schedule => schedule.id === id);
  });

  const getMedicationSchedulesByCat = computed(() => (catId: string): MedicationSchedule[] => {
    return medicationSchedules.value.filter(schedule => schedule.catId === catId);
  });

  const getMedicationSchedulesByMedication = computed(() =>
    (medicationId: string): MedicationSchedule[] => {
      return medicationSchedules.value.filter(schedule => schedule.medicationId === medicationId);
    },
  );

  const getActiveMedicationSchedules = computed((): MedicationSchedule[] => {
    return medicationSchedules.value.filter(schedule => schedule.isActive);
  });

  const getInactiveMedicationSchedules = computed((): MedicationSchedule[] => {
    return medicationSchedules.value.filter(schedule => !schedule.isActive);
  });

  const getMedicationSchedulesByFrequency = computed(() =>
    (frequency: string): MedicationSchedule[] => {
      return medicationSchedules.value.filter(schedule => schedule.frequency === frequency);
    },
  );

  const sortedMedicationSchedules = computed((): MedicationSchedule[] => {
    return [...medicationSchedules.value].sort((a, b) => {
      // Sort by active status first, then by creation date
      if (a.isActive !== b.isActive) {
        return a.isActive ? -1 : 1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  // Reminder getters
  const getMedicationReminderById = computed(() => (id: string): MedicationReminder | undefined => {
    return medicationReminders.value.find(reminder => reminder.id === id);
  });

  const getMedicationRemindersByCat = computed(() => (catId: string): MedicationReminder[] => {
    return medicationReminders.value.filter(reminder => reminder.catId === catId);
  });

  const getPendingRemindersByCat = computed(() => (catId: string): MedicationReminder[] => {
    return medicationReminders.value.filter(reminder =>
      reminder.catId === catId && reminder.status === ReminderStatus.PENDING,
    );
  });

  const getTodaysRemindersByCat = computed(() => (catId: string): MedicationReminder[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return medicationReminders.value.filter((reminder) => {
      const reminderDate = new Date(reminder.scheduledAt);
      return reminderDate >= today && reminderDate < tomorrow && reminder.catId === catId;
    });
  });

  const getUpcomingRemindersByCat = computed(() =>
    (catId: string, hours = 24): MedicationReminder[] => {
      const now = new Date();
      const futureTime = new Date(now.getTime() + hours * 60 * 60 * 1000);

      return medicationReminders.value.filter((reminder) => {
        const reminderTime = new Date(reminder.scheduledAt);
        return reminder.catId === catId
          && reminderTime > now
          && reminderTime <= futureTime
          && reminder.status === ReminderStatus.PENDING;
      });
    },
  );

  const getMedicationRemindersByMedication = computed(() =>
    (medicationId: string): MedicationReminder[] => {
      return medicationReminders.value.filter(reminder => reminder.medicationId === medicationId);
    },
  );

  const getMedicationRemindersBySchedule = computed(() =>
    (scheduleId: string): MedicationReminder[] => {
      return medicationReminders.value.filter(reminder => reminder.scheduleId === scheduleId);
    },
  );

  const getMedicationRemindersByStatus = computed(() =>
    (status: ReminderStatus): MedicationReminder[] => {
      return medicationReminders.value.filter(reminder => reminder.status === status);
    },
  );

  const getPendingReminders = computed((): MedicationReminder[] => {
    return medicationReminders.value.filter(reminder => reminder.status === ReminderStatus.PENDING);
  });

  const getAcknowledgedReminders = computed((): MedicationReminder[] => {
    return medicationReminders.value.filter(reminder => reminder.status === ReminderStatus.ACKNOWLEDGED);
  });

  const getSnoozedReminders = computed((): MedicationReminder[] => {
    return medicationReminders.value.filter(reminder => reminder.status === ReminderStatus.SNOOZED);
  });

  const getDismissedReminders = computed((): MedicationReminder[] => {
    return medicationReminders.value.filter(reminder => reminder.status === ReminderStatus.DISMISSED);
  });

  const getTodaysReminders = computed((): MedicationReminder[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return medicationReminders.value.filter((reminder) => {
      const reminderDate = new Date(reminder.scheduledAt);
      return reminderDate >= today && reminderDate < tomorrow;
    });
  });

  const getUpcomingReminders = computed((): MedicationReminder[] => {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    return medicationReminders.value.filter((reminder) => {
      const reminderTime = new Date(reminder.scheduledAt);
      return reminderTime > now && reminderTime <= next24Hours && reminder.status === ReminderStatus.PENDING;
    });
  });

  const getOverdueReminders = computed((): MedicationReminder[] => {
    const now = new Date();
    return medicationReminders.value.filter((reminder) => {
      const reminderTime = new Date(reminder.scheduledAt);
      return reminderTime < now && reminder.status === ReminderStatus.PENDING;
    });
  });

  const sortedMedicationReminders = computed((): MedicationReminder[] => {
    return [...medicationReminders.value].sort((a, b) =>
      new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
    );
  });

  // Compatibility getters for components
  const records = computed(() => medicationRecords.value);
  const reminders = computed(() => medicationReminders.value);

  // Actions
  const fetchMedications = async (filter?: MedicationFilter) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (filter?.type) params.append('type', filter.type);

      const response = await $fetch<{ medications: Medication[]; total: number }>(`/api/medications?${params.toString()}`);
      medications.value = response.medications;
      cache.value.lastFetch = new Date();
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch medications';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const createMedication = async (data: MedicationInput): Promise<Medication> => {
    loading.value = true;
    error.value = null;

    try {
      const medication = await $fetch<Medication>('/api/medications', {
        method: 'POST',
        body: data,
      });

      medications.value.push(medication);
      return medication;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create medication';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const updateMedication = async (id: string, data: MedicationUpdate): Promise<Medication> => {
    loading.value = true;
    error.value = null;

    try {
      const medication = await $fetch<Medication>(`/api/medications/${id}`, {
        method: 'PUT',
        body: data,
      });

      const index = medications.value.findIndex(m => m.id === id);
      if (index !== -1) {
        medications.value[index] = medication;
      }

      return medication;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update medication';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const deleteMedication = async (id: string) => {
    loading.value = true;
    error.value = null;

    try {
      await $fetch(`/api/medications/${id}`, {
        method: 'DELETE',
      });

      medications.value = medications.value.filter(m => m.id !== id);
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to delete medication';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  // Record actions
  const fetchMedicationRecords = async (filter?: MedicationRecordFilter) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (filter?.catId) params.append('catId', filter.catId);
      if (filter?.medicationId) params.append('medicationId', filter.medicationId);
      if (filter?.status) params.append('status', filter.status);
      if (filter?.startDate) params.append('startDate', filter.startDate.toISOString());
      if (filter?.endDate) params.append('endDate', filter.endDate.toISOString());

      const response = await $fetch<{ records: MedicationRecord[]; total: number }>(`/api/medication-records?${params.toString()}`);
      medicationRecords.value = response.records;
      cache.value.recordsLastFetch = new Date();
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch medication records';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const createMedicationRecord = async (data: MedicationRecordInput): Promise<MedicationRecord> => {
    loading.value = true;
    error.value = null;

    try {
      const record = await $fetch<MedicationRecord>('/api/medication-records', {
        method: 'POST',
        body: data,
      });

      medicationRecords.value.push(record);
      return record;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create medication record';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const updateMedicationRecord = async (id: string, data: MedicationRecordUpdate): Promise<MedicationRecord> => {
    loading.value = true;
    error.value = null;

    try {
      const record = await $fetch<MedicationRecord>(`/api/medication-records/${id}`, {
        method: 'PUT',
        body: data,
      });

      const index = medicationRecords.value.findIndex(r => r.id === id);
      if (index !== -1) {
        medicationRecords.value[index] = record;
      }

      return record;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update medication record';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  // Reminder actions
  const fetchMedicationReminders = async (filter?: MedicationReminderFilter) => {
    loading.value = true;
    error.value = null;

    try {
      const params = new URLSearchParams();
      if (filter?.catId) params.append('catId', filter.catId);
      if (filter?.status) params.append('status', filter.status);
      if (filter?.startDate) params.append('startDate', filter.startDate.toISOString());
      if (filter?.endDate) params.append('endDate', filter.endDate.toISOString());

      const response = await $fetch<{ reminders: MedicationReminder[]; total: number }>(`/api/medication-reminders?${params.toString()}`);
      medicationReminders.value = response.reminders;
      cache.value.remindersLastFetch = new Date();
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to fetch medication reminders';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const createMedicationReminder = async (data: MedicationReminderInput): Promise<MedicationReminder> => {
    loading.value = true;
    error.value = null;

    try {
      const reminder = await $fetch<MedicationReminder>('/api/medication-reminders', {
        method: 'POST',
        body: data,
      });

      medicationReminders.value.push(reminder);
      return reminder;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create medication reminder';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  const updateReminderStatus = async (id: string, status: ReminderStatus): Promise<MedicationReminder> => {
    loading.value = true;
    error.value = null;

    try {
      const reminder = await $fetch<MedicationReminder>(`/api/medication-reminders/${id}`, {
        method: 'PUT',
        body: { status },
      });

      const index = medicationReminders.value.findIndex(r => r.id === id);
      if (index !== -1) {
        medicationReminders.value[index] = reminder;
      }

      return reminder;
    }
    catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to update reminder status';
      throw err;
    }
    finally {
      loading.value = false;
    }
  };

  // Utility actions
  const clearError = () => {
    error.value = null;
    retryCount.value = 0;
    lastErrorTime.value = null;
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchMedications(),
      fetchMedicationRecords(),
      fetchMedicationReminders(),
    ]);
  };

  return {
    // State
    medications,
    medicationRecords,
    medicationSchedules,
    medicationReminders,
    loading,
    error,
    cache,
    retryCount,
    lastErrorTime,

    // Basic getters
    isLoading,
    hasError,
    isCacheValid,
    isRecordsCacheValid,
    isSchedulesCacheValid,
    isRemindersCacheValid,

    // Medication getters
    getMedicationById,
    getMedicationsByType,
    activeMedications,
    sortedMedications,

    // Record getters
    getMedicationRecordById,
    getMedicationRecordsByCat,
    getMedicationRecordsByCatAndMedication,
    getMedicationRecordsByCatAndStatus,
    getMedicationRecordsByCatAndDateRange,
    getCatMedicationSummary,
    getMedicationRecordsByMedication,
    getMedicationRecordsByDateRange,
    sortedMedicationRecords,
    getTodaysMedicationRecords,
    getPendingMedicationRecords,
    getAdministeredMedicationRecords,
    getOverdueMedicationRecords,
    getMissedMedicationRecords,
    getSkippedMedicationRecords,
    getMedicationRecordsByStatus,
    getPendingMedicationRecordsByCat,
    getOverdueMedicationRecordsByCat,

    // Schedule getters
    getMedicationScheduleById,
    getMedicationSchedulesByCat,
    getMedicationSchedulesByMedication,
    getActiveMedicationSchedules,
    getInactiveMedicationSchedules,
    getMedicationSchedulesByFrequency,
    sortedMedicationSchedules,

    // Reminder getters
    getMedicationReminderById,
    getMedicationRemindersByCat,
    getPendingRemindersByCat,
    getTodaysRemindersByCat,
    getUpcomingRemindersByCat,
    getMedicationRemindersByMedication,
    getMedicationRemindersBySchedule,
    getMedicationRemindersByStatus,
    getPendingReminders,
    getAcknowledgedReminders,
    getSnoozedReminders,
    getDismissedReminders,
    getTodaysReminders,
    getUpcomingReminders,
    getOverdueReminders,
    sortedMedicationReminders,

    // Compatibility getters
    records,
    reminders,

    // Actions
    fetchMedications,
    createMedication,
    updateMedication,
    deleteMedication,
    fetchMedicationRecords,
    createMedicationRecord,
    updateMedicationRecord,
    fetchMedicationReminders,
    createMedicationReminder,
    updateReminderStatus,
    clearError,
    refreshAll,
  };
});
