import { defineStore } from 'pinia';
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
  ReminderStatus,
} from '~/types/medication';
import { OfflineStorage } from '~/utils/offline-storage';
import { useSync } from '~/composables/useSync';
import {
  parseApiError,
  getUserFriendlyErrorMessage,
  retryWithBackoff,
  isRetryableError,
  createErrorHandler,
} from '~/utils/error-handling';

interface MedicationsState {
  medications: Medication[];
  records: MedicationRecord[];
  schedules: MedicationSchedule[];
  reminders: MedicationReminder[];
  loading: boolean;
  error: string | null;
  lastError: any | null;
  retryCount: number;
  cache: {
    lastFetch: Date | null;
    recordsLastFetch: Date | null;
    schedulesLastFetch: Date | null;
    remindersLastFetch: Date | null;
    ttl: number; // Time to live in milliseconds
  };
}

export const useMedicationsStore = defineStore('medications', {
  state: (): MedicationsState => ({
    medications: [],
    records: [],
    schedules: [],
    reminders: [],
    loading: false,
    error: null,
    lastError: null,
    retryCount: 0,
    cache: {
      lastFetch: null,
      recordsLastFetch: null,
      schedulesLastFetch: null,
      remindersLastFetch: null,
      ttl: 5 * 60 * 1000, // 5 minutes
    },
  }),

  getters: {
    getMedicationById:
      state =>
        (id: string): Medication | undefined => {
          return state.medications.find(medication => medication.id === id);
        },

    getMedicationsByName:
      state =>
        (name: string): Medication[] => {
          return state.medications.filter(medication =>
            medication.name.toLowerCase().includes(name.toLowerCase()),
          );
        },

    getMedicationsByType:
      state =>
        (type: string): Medication[] => {
          return state.medications.filter(
            medication => medication.type === type,
          );
        },

    sortedMedications: (state): Medication[] => {
      return [...state.medications].sort((a, b) =>
        a.name.localeCompare(b.name),
      );
    },

    medicationsByType: (state): Record<string, Medication[]> => {
      return state.medications.reduce((acc, medication) => {
        if (!acc[medication.type]) {
          acc[medication.type] = [];
        }
        acc[medication.type].push(medication);
        return acc;
      }, {} as Record<string, Medication[]>);
    },

    isLoading: (state): boolean => state.loading,

    hasError: (state): boolean => !!state.error,

    isCacheValid: (state): boolean => {
      if (!state.cache.lastFetch) return false;
      const now = new Date();
      const timeDiff = now.getTime() - state.cache.lastFetch.getTime();
      return timeDiff < state.cache.ttl;
    },

    isRecordsCacheValid: (state): boolean => {
      if (!state.cache.recordsLastFetch) return false;
      const now = new Date();
      const timeDiff = now.getTime() - state.cache.recordsLastFetch.getTime();
      return timeDiff < state.cache.ttl;
    },

    isSchedulesCacheValid: (state): boolean => {
      if (!state.cache.schedulesLastFetch) return false;
      const now = new Date();
      const timeDiff = now.getTime() - state.cache.schedulesLastFetch.getTime();
      return timeDiff < state.cache.ttl;
    },

    isRemindersCacheValid: (state): boolean => {
      if (!state.cache.remindersLastFetch) return false;
      const now = new Date();
      const timeDiff = now.getTime() - state.cache.remindersLastFetch.getTime();
      return timeDiff < state.cache.ttl;
    },

    // Medication Record Getters
    getMedicationRecordById:
      state =>
        (id: string): MedicationRecord | undefined => {
          return state.records.find(record => record.id === id);
        },

    getMedicationRecordsByCat:
      state =>
        (catId: string): MedicationRecord[] => {
          return state.records.filter(record => record.catId === catId);
        },

    getMedicationRecordsByCatAndMedication:
      state =>
        (catId: string, medicationId: string): MedicationRecord[] => {
          return state.records.filter(
            record => record.catId === catId && record.medicationId === medicationId,
          );
        },

    getMedicationRecordsByCatAndStatus:
      state =>
        (catId: string, status: string): MedicationRecord[] => {
          return state.records.filter(
            record => record.catId === catId && record.status === status,
          );
        },

    getMedicationRecordsByCatAndDateRange:
      state =>
        (catId: string, startDate: Date, endDate: Date): MedicationRecord[] => {
          return state.records.filter((record) => {
            if (record.catId !== catId) return false;
            const recordDate = new Date(record.administeredAt);
            return recordDate >= startDate && recordDate <= endDate;
          });
        },

    getCatMedicationSummary:
      state =>
        (catId: string): {
          totalRecords: number;
          pendingRecords: number;
          administeredRecords: number;
          lastAdministered?: Date;
          activeMedications: string[];
        } => {
          const catRecords = state.records.filter(record => record.catId === catId);
          const pendingRecords = catRecords.filter(record => record.status === 'PENDING');
          const administeredRecords = catRecords.filter(record => record.status === 'ADMINISTERED');

          const lastAdministered = administeredRecords.length > 0
            ? new Date(Math.max(...administeredRecords.map(r => new Date(r.administeredAt).getTime())))
            : undefined;

          const activeMedications = [...new Set(catRecords.map(record => record.medicationId))];

          return {
            totalRecords: catRecords.length,
            pendingRecords: pendingRecords.length,
            administeredRecords: administeredRecords.length,
            lastAdministered,
            activeMedications,
          };
        },

    getMedicationRecordsByMedication:
      state =>
        (medicationId: string): MedicationRecord[] => {
          return state.records.filter(
            record => record.medicationId === medicationId,
          );
        },

    getMedicationRecordsByStatus:
      state =>
        (status: string): MedicationRecord[] => {
          return state.records.filter(record => record.status === status);
        },

    getMedicationRecordsByDateRange:
      state =>
        (startDate: Date, endDate: Date): MedicationRecord[] => {
          return state.records.filter((record) => {
            const recordDate = new Date(record.administeredAt);
            return recordDate >= startDate && recordDate <= endDate;
          });
        },

    sortedMedicationRecords: (state): MedicationRecord[] => {
      return [...state.records].sort(
        (a, b) =>
          new Date(b.administeredAt).getTime()
            - new Date(a.administeredAt).getTime(),
      );
    },

    getTodaysMedicationRecords: (state): MedicationRecord[] => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      return state.records.filter((record) => {
        const recordDate = new Date(record.administeredAt);
        return recordDate >= startOfDay && recordDate <= endOfDay;
      });
    },

    getPendingMedicationRecords: (state): MedicationRecord[] => {
      return state.records.filter(record => record.status === 'PENDING');
    },

    getAdministeredMedicationRecords: (state): MedicationRecord[] => {
      return state.records.filter(record => record.status === 'ADMINISTERED');
    },

    getOverdueMedicationRecords: (state): MedicationRecord[] => {
      const now = new Date();
      return state.records.filter((record) => {
        if (record.status !== 'PENDING') return false;
        const recordDate = new Date(record.administeredAt);
        return recordDate < now;
      });
    },

    getMissedMedicationRecords: (state): MedicationRecord[] => {
      return state.records.filter(record => record.status === 'MISSED');
    },

    getSkippedMedicationRecords: (state): MedicationRecord[] => {
      return state.records.filter(record => record.status === 'SKIPPED');
    },

    getMedicationRecordsByStatus:
      state =>
        (status: string): MedicationRecord[] => {
          return state.records.filter(record => record.status === status);
        },

    getPendingMedicationRecordsByCat:
      state =>
        (catId: string): MedicationRecord[] => {
          return state.records.filter(
            record => record.catId === catId && record.status === 'PENDING',
          );
        },

    getOverdueMedicationRecordsByCat:
      state =>
        (catId: string): MedicationRecord[] => {
          const now = new Date();
          return state.records.filter((record) => {
            if (record.catId !== catId || record.status !== 'PENDING') return false;
            const recordDate = new Date(record.administeredAt);
            return recordDate < now;
          });
        },

    // Medication Schedule Getters
    getMedicationScheduleById:
      state =>
        (id: string): MedicationSchedule | undefined => {
          return state.schedules.find(schedule => schedule.id === id);
        },

    getMedicationSchedulesByCat:
      state =>
        (catId: string): MedicationSchedule[] => {
          return state.schedules.filter(schedule => schedule.catId === catId);
        },

    getMedicationSchedulesByMedication:
      state =>
        (medicationId: string): MedicationSchedule[] => {
          return state.schedules.filter(
            schedule => schedule.medicationId === medicationId,
          );
        },

    getActiveMedicationSchedules: (state): MedicationSchedule[] => {
      return state.schedules.filter(schedule => schedule.isActive);
    },

    getInactiveMedicationSchedules: (state): MedicationSchedule[] => {
      return state.schedules.filter(schedule => !schedule.isActive);
    },

    getMedicationSchedulesByFrequency:
      state =>
        (frequency: string): MedicationSchedule[] => {
          return state.schedules.filter(
            schedule => schedule.frequency === frequency,
          );
        },

    sortedMedicationSchedules: (state): MedicationSchedule[] => {
      return [...state.schedules].sort((a, b) => {
        // Sort by active status first, then by start date
        if (a.isActive !== b.isActive) {
          return a.isActive ? -1 : 1;
        }
        return (
          new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
        );
      });
    },

    // Medication Reminder Getters
    getMedicationReminderById:
      state =>
        (id: string): MedicationReminder | undefined => {
          return state.reminders.find(reminder => reminder.id === id);
        },

    getMedicationRemindersByCat:
      state =>
        (catId: string): MedicationReminder[] => {
          return state.reminders.filter(reminder => reminder.catId === catId);
        },

    getPendingRemindersByCat:
      state =>
        (catId: string): MedicationReminder[] => {
          return state.reminders.filter(
            reminder => reminder.catId === catId && reminder.status === 'PENDING',
          );
        },

    getTodaysRemindersByCat:
      state =>
        (catId: string): MedicationReminder[] => {
          const today = new Date();
          const startOfDay = new Date(today.setHours(0, 0, 0, 0));
          const endOfDay = new Date(today.setHours(23, 59, 59, 999));

          return state.reminders.filter((reminder) => {
            if (reminder.catId !== catId) return false;
            const reminderDate = new Date(reminder.scheduledAt);
            return reminderDate >= startOfDay && reminderDate <= endOfDay;
          });
        },

    getUpcomingRemindersByCat:
      state =>
        (catId: string): MedicationReminder[] => {
          const now = new Date();
          const nextHour = new Date(now.getTime() + 60 * 60 * 1000);

          return state.reminders.filter((reminder) => {
            if (reminder.catId !== catId || reminder.status !== 'PENDING') return false;
            const reminderDate = new Date(reminder.scheduledAt);
            return reminderDate >= now && reminderDate <= nextHour;
          });
        },

    getMedicationRemindersByMedication:
      state =>
        (medicationId: string): MedicationReminder[] => {
          return state.reminders.filter(
            reminder => reminder.medicationId === medicationId,
          );
        },

    getMedicationRemindersBySchedule:
      state =>
        (scheduleId: string): MedicationReminder[] => {
          return state.reminders.filter(
            reminder => reminder.scheduleId === scheduleId,
          );
        },

    getMedicationRemindersByStatus:
      state =>
        (status: ReminderStatus): MedicationReminder[] => {
          return state.reminders.filter(reminder => reminder.status === status);
        },

    getPendingReminders: (state): MedicationReminder[] => {
      return state.reminders.filter(reminder => reminder.status === 'PENDING');
    },

    getAcknowledgedReminders: (state): MedicationReminder[] => {
      return state.reminders.filter(reminder => reminder.status === 'ACKNOWLEDGED');
    },

    getSnoozedReminders: (state): MedicationReminder[] => {
      return state.reminders.filter(reminder => reminder.status === 'SNOOZED');
    },

    getDismissedReminders: (state): MedicationReminder[] => {
      return state.reminders.filter(reminder => reminder.status === 'DISMISSED');
    },

    getTodaysReminders: (state): MedicationReminder[] => {
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0));
      const endOfDay = new Date(today.setHours(23, 59, 59, 999));

      return state.reminders.filter((reminder) => {
        const reminderDate = new Date(reminder.scheduledAt);
        return reminderDate >= startOfDay && reminderDate <= endOfDay;
      });
    },

    getUpcomingReminders: (state): MedicationReminder[] => {
      const now = new Date();
      const nextHour = new Date(now.getTime() + 60 * 60 * 1000); // Next hour

      return state.reminders.filter((reminder) => {
        const reminderDate = new Date(reminder.scheduledAt);
        return reminderDate >= now && reminderDate <= nextHour && reminder.status === 'PENDING';
      });
    },

    getOverdueReminders: (state): MedicationReminder[] => {
      const now = new Date();

      return state.reminders.filter((reminder) => {
        const reminderDate = new Date(reminder.scheduledAt);
        return reminderDate < now && reminder.status === 'PENDING';
      });
    },

    sortedMedicationReminders: (state): MedicationReminder[] => {
      return [...state.reminders].sort(
        (a, b) =>
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
    },
  },

  actions: {
    async fetchMedications(filter?: MedicationFilter, forceRefresh = false) {
      const { syncStatus } = useSync();
      const offlineStorage = OfflineStorage.getInstance();

      // If offline, load from local storage
      if (!syncStatus.value.isOnline) {
        this.loading = true;
        try {
          const localMedications = offlineStorage.getMedications();
          this.medications = localMedications;
          this.clearError();
          return this.medications;
        }
        catch (error) {
          this.setError(error, 'オフラインデータの読み込み');
          throw error;
        }
        finally {
          this.loading = false;
        }
      }

      // Use cache if valid and not forcing refresh
      if (!forceRefresh && this.isCacheValid && this.medications.length > 0) {
        return this.medications;
      }

      this.loading = true;
      this.clearError();

      try {
        const operation = async () => {
          const query = new URLSearchParams();
          if (filter?.name) query.append('name', filter.name);
          if (filter?.type) query.append('type', filter.type);
          if (filter?.limit) query.append('limit', filter.limit.toString());
          if (filter?.offset) query.append('offset', filter.offset.toString());

          const queryString = query.toString();
          const url = `/api/medications${queryString ? `?${queryString}` : ''}`;

          return await $fetch<{
            medications: Medication[];
            total: number;
            limit: number;
            offset: number;
          }>(url);
        };

        const response = await retryWithBackoff(operation, 3);

        this.medications = response.medications.map(medication => ({
          ...medication,
          createdAt: new Date(medication.createdAt),
          updatedAt: new Date(medication.updatedAt),
        }));

        this.cache.lastFetch = new Date();
        this.retryCount = 0;
        return this.medications;
      }
      catch (error) {
        // Fallback to offline data if available
        try {
          const localMedications = offlineStorage.getMedications();
          if (localMedications.length > 0) {
            this.medications = localMedications;
            this.setError(error, 'オンラインデータの取得に失敗しました。オフラインデータを使用しています');
            return this.medications;
          }
        }
        catch {
          // Ignore offline error, use original error
        }

        this.setError(error, '薬データの取得');
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async createMedication(
      medicationInput: MedicationInput,
    ): Promise<Medication> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.clearError();

      try {
        if (syncStatus.value.isOnline) {
          // Online: Create on server with retry
          const operation = async () => {
            return await $fetch<{
              medication: Medication;
              message: string;
            }>('/api/medications', {
              method: 'POST',
              body: medicationInput,
            });
          };

          const response = await retryWithBackoff(operation, 2);

          const newMedication = {
            ...response.medication,
            createdAt: new Date(response.medication.createdAt),
            updatedAt: new Date(response.medication.updatedAt),
          };

          this.medications.push(newMedication);
          this.retryCount = 0;
          return newMedication;
        }
        else {
          // Offline: Create locally with temporary ID
          const localId = offlineOperations.addMedication({
            name: medicationInput.name,
            type: medicationInput.type,
            description: medicationInput.description,
            dosage: medicationInput.dosage,
          });

          const newMedication: Medication = {
            id: localId,
            name: medicationInput.name,
            type: medicationInput.type,
            description: medicationInput.description,
            dosage: medicationInput.dosage,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          this.medications.push(newMedication);
          return newMedication;
        }
      }
      catch (error) {
        this.setError(error, '薬の作成');
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async updateMedication(
      id: string,
      medicationUpdate: MedicationUpdate,
    ): Promise<Medication> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Update on server
          const response = await $fetch<{
            medication: Medication;
            message: string;
          }>(`/api/medications/${id}`, {
            method: 'PUT',
            body: medicationUpdate,
          });

          const updatedMedication = {
            ...response.medication,
            createdAt: new Date(response.medication.createdAt),
            updatedAt: new Date(response.medication.updatedAt),
          };

          const index = this.medications.findIndex(
            medication => medication.id === id,
          );
          if (index !== -1) {
            this.medications[index] = updatedMedication;
          }

          return updatedMedication;
        }
        else {
          // Offline: Update locally
          offlineOperations.updateMedication(id, medicationUpdate);

          const index = this.medications.findIndex(
            medication => medication.id === id,
          );
          if (index !== -1) {
            const updatedMedication = {
              ...this.medications[index],
              ...medicationUpdate,
              updatedAt: new Date(),
            };
            this.medications[index] = updatedMedication;
            return updatedMedication;
          }

          throw new Error('Medication not found');
        }
      }
      catch (error) {
        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to update medication';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async deleteMedication(id: string, cascade = false): Promise<void> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Delete on server
          const query = cascade ? '?cascade=true' : '';
          await $fetch(`/api/medications/${id}${query}`, {
            method: 'DELETE',
          });
        }
        else {
          // Offline: Mark for deletion
          offlineOperations.deleteMedication(id);
        }

        this.medications = this.medications.filter(
          medication => medication.id !== id,
        );
      }
      catch (error) {
        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to delete medication';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    clearError() {
      this.error = null;
      this.lastError = null;
      this.retryCount = 0;
    },

    setError(error: unknown, context?: string) {
      const errorHandler = createErrorHandler(context || 'Medications Store');
      const { error: parsedError, message } = errorHandler.handleError(error);

      this.error = message;
      this.lastError = parsedError;
    },

    canRetry(): boolean {
      return this.lastError ? isRetryableError(this.lastError) : false;
    },

    async retryLastOperation() {
      if (!this.canRetry() || this.retryCount >= 3) {
        return false;
      }

      this.retryCount++;
      this.clearError();

      // This would need to be implemented based on the last failed operation
      // For now, we'll just clear the error and let the user retry manually
      return true;
    },

    invalidateCache() {
      this.cache.lastFetch = null;
    },

    // Local state management methods
    addMedicationToState(medication: Medication) {
      const existingIndex = this.medications.findIndex(
        m => m.id === medication.id,
      );
      if (existingIndex !== -1) {
        this.medications[existingIndex] = medication;
      }
      else {
        this.medications.push(medication);
      }
    },

    removeMedicationFromState(id: string) {
      this.medications = this.medications.filter(
        medication => medication.id !== id,
      );
    },

    // Load offline data into state
    loadOfflineData() {
      const offlineStorage = OfflineStorage.getInstance();
      this.medications = offlineStorage.getMedications();
    },

    // Medication Record Actions
    async fetchMedicationRecords(
      filter?: MedicationRecordFilter,
      forceRefresh = false,
    ) {
      const { syncStatus } = useSync();
      const offlineStorage = OfflineStorage.getInstance();

      // If offline, load from local storage
      if (!syncStatus.value.isOnline) {
        this.loading = true;
        try {
          const localRecords = offlineStorage.getMedicationRecords();
          this.records = localRecords;
          return this.records;
        }
        catch (error) {
          this.error = 'Failed to load offline medication records';
          throw error;
        }
        finally {
          this.loading = false;
        }
      }

      // Use cache if valid and not forcing refresh
      if (
        !forceRefresh
        && this.isRecordsCacheValid
        && this.records.length > 0
      ) {
        return this.records;
      }

      this.loading = true;
      this.error = null;

      try {
        const query = new URLSearchParams();
        if (filter?.catId) query.append('catId', filter.catId);
        if (filter?.medicationId)
          query.append('medicationId', filter.medicationId);
        if (filter?.startDate)
          query.append('startDate', filter.startDate.toISOString());
        if (filter?.endDate)
          query.append('endDate', filter.endDate.toISOString());
        if (filter?.status) query.append('status', filter.status);
        if (filter?.limit) query.append('limit', filter.limit.toString());
        if (filter?.offset) query.append('offset', filter.offset.toString());

        const queryString = query.toString();
        const url = `/api/medication-records${
          queryString ? `?${queryString}` : ''
        }`;

        const response = await $fetch<{
          records: MedicationRecord[];
          total: number;
          limit: number;
          offset: number;
        }>(url);

        this.records = response.records.map(record => ({
          ...record,
          administeredAt: new Date(record.administeredAt),
          createdAt: new Date(record.createdAt),
          updatedAt: new Date(record.updatedAt),
        }));

        this.cache.recordsLastFetch = new Date();
        return this.records;
      }
      catch (error) {
        // Fallback to offline data if available
        try {
          const localRecords = offlineStorage.getMedicationRecords();
          if (localRecords.length > 0) {
            this.records = localRecords;
            this.error = 'Using offline medication records data';
            return this.records;
          }
        }
        catch {
          // Ignore offline error, use original error
        }

        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to fetch medication records';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async createMedicationRecord(
      recordInput: MedicationRecordInput,
    ): Promise<MedicationRecord> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Create on server
          const response = await $fetch<{
            record: MedicationRecord;
            message: string;
          }>('/api/medication-records', {
            method: 'POST',
            body: recordInput,
          });

          const newRecord = {
            ...response.record,
            administeredAt: new Date(response.record.administeredAt),
            createdAt: new Date(response.record.createdAt),
            updatedAt: new Date(response.record.updatedAt),
          };

          this.records.push(newRecord);
          return newRecord;
        }
        else {
          // Offline: Create locally with temporary ID
          const localId = offlineOperations.addMedicationRecord({
            catId: recordInput.catId,
            medicationId: recordInput.medicationId,
            quantity: recordInput.quantity,
            administeredAt: recordInput.administeredAt,
            status: recordInput.status,
            notes: recordInput.notes,
          });

          const newRecord: MedicationRecord = {
            id: localId,
            catId: recordInput.catId,
            medicationId: recordInput.medicationId,
            quantity: recordInput.quantity,
            administeredAt: recordInput.administeredAt,
            status: recordInput.status || 'PENDING',
            notes: recordInput.notes,
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          this.records.push(newRecord);
          return newRecord;
        }
      }
      catch (error) {
        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to create medication record';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async updateMedicationRecord(
      id: string,
      recordUpdate: MedicationRecordUpdate,
    ): Promise<MedicationRecord> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Update on server
          const response = await $fetch<{
            record: MedicationRecord;
            message: string;
          }>(`/api/medication-records/${id}`, {
            method: 'PUT',
            body: recordUpdate,
          });

          const updatedRecord = {
            ...response.record,
            administeredAt: new Date(response.record.administeredAt),
            createdAt: new Date(response.record.createdAt),
            updatedAt: new Date(response.record.updatedAt),
          };

          const index = this.records.findIndex(record => record.id === id);
          if (index !== -1) {
            this.records[index] = updatedRecord;
          }

          return updatedRecord;
        }
        else {
          // Offline: Update locally
          offlineOperations.updateMedicationRecord(id, recordUpdate);

          const index = this.records.findIndex(record => record.id === id);
          if (index !== -1) {
            const updatedRecord = {
              ...this.records[index],
              ...recordUpdate,
              updatedAt: new Date(),
            };
            this.records[index] = updatedRecord;
            return updatedRecord;
          }

          throw new Error('Medication record not found');
        }
      }
      catch (error) {
        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to update medication record';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async deleteMedicationRecord(id: string): Promise<void> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Delete on server
          await $fetch(`/api/medication-records/${id}`, {
            method: 'DELETE',
          });
        }
        else {
          // Offline: Mark for deletion
          offlineOperations.deleteMedicationRecord(id);
        }

        this.records = this.records.filter(record => record.id !== id);
      }
      catch (error) {
        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to delete medication record';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    // Local state management methods for records
    addMedicationRecordToState(record: MedicationRecord) {
      const existingIndex = this.records.findIndex(r => r.id === record.id);
      if (existingIndex !== -1) {
        this.records[existingIndex] = record;
      }
      else {
        this.records.push(record);
      }
    },

    removeMedicationRecordFromState(id: string) {
      this.records = this.records.filter(record => record.id !== id);
    },

    invalidateRecordsCache() {
      this.cache.recordsLastFetch = null;
    },

    // Medication Reminder Actions
    async fetchMedicationReminders(
      filter?: MedicationReminderFilter,
      forceRefresh = false,
    ) {
      const { syncStatus } = useSync();
      const offlineStorage = OfflineStorage.getInstance();

      // If offline, load from local storage
      if (!syncStatus.value.isOnline) {
        this.loading = true;
        try {
          const localReminders = offlineStorage.getMedicationReminders?.() || [];
          this.reminders = localReminders;
          return this.reminders;
        }
        catch (error) {
          this.error = 'Failed to load offline medication reminders';
          throw error;
        }
        finally {
          this.loading = false;
        }
      }

      // Use cache if valid and not forcing refresh
      if (
        !forceRefresh
        && this.isRemindersCacheValid
        && this.reminders.length > 0
      ) {
        return this.reminders;
      }

      this.loading = true;
      this.error = null;

      try {
        const query = new URLSearchParams();
        if (filter?.catId) query.append('catId', filter.catId);
        if (filter?.medicationId)
          query.append('medicationId', filter.medicationId);
        if (filter?.scheduleId) query.append('scheduleId', filter.scheduleId);
        if (filter?.status) query.append('status', filter.status);
        if (filter?.startDate)
          query.append('startDate', filter.startDate.toISOString());
        if (filter?.endDate)
          query.append('endDate', filter.endDate.toISOString());
        if (filter?.limit) query.append('limit', filter.limit.toString());
        if (filter?.offset) query.append('offset', filter.offset.toString());

        const queryString = query.toString();
        const url = `/api/medication-reminders${
          queryString ? `?${queryString}` : ''
        }`;

        const response = await $fetch<{
          data: MedicationReminder[];
          pagination: {
            total: number;
            limit: number;
            offset: number;
            hasMore: boolean;
          };
        }>(url);

        this.reminders = response.data.map(reminder => ({
          ...reminder,
          scheduledAt: new Date(reminder.scheduledAt),
          createdAt: new Date(reminder.createdAt),
          updatedAt: new Date(reminder.updatedAt),
        }));

        this.cache.remindersLastFetch = new Date();
        return this.reminders;
      }
      catch (error) {
        // Fallback to offline data if available
        try {
          const localReminders = offlineStorage.getMedicationReminders?.() || [];
          if (localReminders.length > 0) {
            this.reminders = localReminders;
            this.error = 'Using offline medication reminders data';
            return this.reminders;
          }
        }
        catch {
          // Ignore offline error, use original error
        }

        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to fetch medication reminders';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async createMedicationReminder(
      reminderInput: MedicationReminderInput,
    ): Promise<MedicationReminder> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Create on server
          const response = await $fetch<MedicationReminder>('/api/medication-reminders', {
            method: 'POST',
            body: reminderInput,
          });

          const newReminder = {
            ...response,
            scheduledAt: new Date(response.scheduledAt),
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt),
          };

          this.reminders.push(newReminder);
          return newReminder;
        }
        else {
          // Offline: Create locally with temporary ID
          const localId = offlineOperations.addMedicationReminder?.({
            scheduleId: reminderInput.scheduleId,
            catId: reminderInput.catId,
            medicationId: reminderInput.medicationId,
            scheduledAt: reminderInput.scheduledAt,
          }) || `temp-reminder-${Date.now()}`;

          const newReminder: MedicationReminder = {
            id: localId,
            scheduleId: reminderInput.scheduleId,
            catId: reminderInput.catId,
            medicationId: reminderInput.medicationId,
            scheduledAt: reminderInput.scheduledAt,
            status: 'PENDING',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          this.reminders.push(newReminder);
          return newReminder;
        }
      }
      catch (error) {
        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to create medication reminder';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async updateMedicationReminder(
      id: string,
      updates: { status: ReminderStatus; scheduledAt?: Date },
    ): Promise<MedicationReminder> {
      const { syncStatus, offlineOperations } = useSync();
      this.loading = true;
      this.error = null;

      try {
        if (syncStatus.value.isOnline) {
          // Online: Update on server
          const response = await $fetch<MedicationReminder>(`/api/medication-reminders/${id}`, {
            method: 'PUT',
            body: updates,
          });

          const updatedReminder = {
            ...response,
            scheduledAt: new Date(response.scheduledAt),
            createdAt: new Date(response.createdAt),
            updatedAt: new Date(response.updatedAt),
          };

          const index = this.reminders.findIndex(reminder => reminder.id === id);
          if (index !== -1) {
            this.reminders[index] = updatedReminder;
          }

          return updatedReminder;
        }
        else {
          // Offline: Update locally
          offlineOperations.updateMedicationReminder?.(id, updates);

          const index = this.reminders.findIndex(reminder => reminder.id === id);
          if (index !== -1) {
            const updatedReminder = {
              ...this.reminders[index],
              status: updates.status,
              ...(updates.scheduledAt && { scheduledAt: updates.scheduledAt }),
              updatedAt: new Date(),
            };
            this.reminders[index] = updatedReminder;
            return updatedReminder;
          }

          throw new Error('Medication reminder not found');
        }
      }
      catch (error) {
        this.error
          = error instanceof Error
            ? error.message
            : 'Failed to update medication reminder';
        throw error;
      }
      finally {
        this.loading = false;
      }
    },

    async acknowledgeReminder(id: string): Promise<MedicationReminder> {
      return this.updateMedicationReminder(id, { status: 'ACKNOWLEDGED' });
    },

    async snoozeReminder(id: string, minutes: number): Promise<MedicationReminder> {
      const currentReminder = this.getMedicationReminderById(id);
      if (!currentReminder) {
        throw new Error('Reminder not found');
      }

      const newScheduledAt = new Date(currentReminder.scheduledAt.getTime() + minutes * 60 * 1000);
      return this.updateMedicationReminder(id, {
        status: 'SNOOZED',
        scheduledAt: newScheduledAt,
      });
    },

    async dismissReminder(id: string): Promise<MedicationReminder> {
      return this.updateMedicationReminder(id, { status: 'DISMISSED' });
    },

    // Local state management methods for reminders
    addMedicationReminderToState(reminder: MedicationReminder) {
      const existingIndex = this.reminders.findIndex(r => r.id === reminder.id);
      if (existingIndex !== -1) {
        this.reminders[existingIndex] = reminder;
      }
      else {
        this.reminders.push(reminder);
      }
    },

    removeMedicationReminderFromState(id: string) {
      this.reminders = this.reminders.filter(reminder => reminder.id !== id);
    },

    invalidateRemindersCache() {
      this.cache.remindersLastFetch = null;
    },
  },
});
