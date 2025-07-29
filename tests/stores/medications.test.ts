import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMedicationsStore } from '~/stores/medications';
import { MedicationType, MedicationStatus, ReminderStatus } from '~/types/medication';
import type {
  Medication,
  MedicationInput,
  MedicationUpdate,
  MedicationRecord,
  MedicationRecordInput,
  MedicationRecordUpdate,
  MedicationReminder,
  MedicationReminderInput,
} from '~/types/medication';

// Mock the composables and utilities
vi.mock('~/composables/useSync', () => ({
  useSync: () => ({
    syncStatus: { value: { isOnline: true } },
    offlineOperations: {
      addMedication: vi.fn().mockReturnValue('local-medication-123'),
      updateMedication: vi.fn(),
      deleteMedication: vi.fn(),
      addMedicationRecord: vi.fn().mockReturnValue('local-record-123'),
      updateMedicationRecord: vi.fn(),
      deleteMedicationRecord: vi.fn(),
      addMedicationReminder: vi.fn().mockReturnValue('local-reminder-123'),
      updateMedicationReminder: vi.fn(),
    },
  }),
}));

vi.mock('~/utils/offline-storage', () => ({
  OfflineStorage: {
    getInstance: () => ({
      getMedications: vi.fn().mockReturnValue([]),
      getMedicationRecords: vi.fn().mockReturnValue([]),
      getMedicationReminders: vi.fn().mockReturnValue([]),
    }),
  },
}));

// Mock $fetch
global.$fetch = vi.fn();

describe('Medications Store', () => {
  let store: ReturnType<typeof useMedicationsStore>;

  const mockMedication: Medication = {
    id: 'med-1',
    name: 'テスト薬',
    type: MedicationType.MEDICINE,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockMedicationInput: MedicationInput = {
    name: 'テスト薬',
    type: MedicationType.MEDICINE,
    description: 'テスト用の薬です',
    dosage: '1日1回',
  };

  const mockMedicationRecord: MedicationRecord = {
    id: 'record-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    quantity: 2,
    administeredAt: new Date('2024-01-01T08:00:00Z'),
    status: MedicationStatus.ADMINISTERED,
    notes: 'テストメモ',
    createdAt: new Date('2024-01-01T08:00:00Z'),
    updatedAt: new Date('2024-01-01T08:00:00Z'),
  };

  const mockMedicationRecordInput: MedicationRecordInput = {
    catId: 'cat-1',
    medicationId: 'med-1',
    quantity: 2,
    administeredAt: new Date('2024-01-01T08:00:00Z'),
    status: MedicationStatus.ADMINISTERED,
    notes: 'テストメモ',
  };

  const mockMedicationReminder: MedicationReminder = {
    id: 'reminder-1',
    scheduleId: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    scheduledAt: new Date('2024-01-01T08:00:00Z'),
    status: ReminderStatus.PENDING,
    createdAt: new Date('2024-01-01T08:00:00Z'),
    updatedAt: new Date('2024-01-01T08:00:00Z'),
  };

  const mockMedicationReminderInput: MedicationReminderInput = {
    scheduleId: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    scheduledAt: new Date('2024-01-01T08:00:00Z'),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useMedicationsStore();
    vi.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(store.medications).toEqual([]);
      expect(store.records).toEqual([]);
      expect(store.reminders).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.cache.lastFetch).toBe(null);
      expect(store.cache.recordsLastFetch).toBe(null);
      expect(store.cache.remindersLastFetch).toBe(null);
      expect(store.cache.ttl).toBe(5 * 60 * 1000); // 5 minutes
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      store.medications = [
        mockMedication,
        {
          ...mockMedication,
          id: 'med-2',
          name: 'テストサプリ',
          type: MedicationType.SUPPLEMENT,
        },
      ];
    });

    it('should get medication by id', () => {
      const medication = store.getMedicationById('med-1');
      expect(medication).toEqual(mockMedication);
    });

    it('should return undefined for non-existent medication', () => {
      const medication = store.getMedicationById('non-existent');
      expect(medication).toBeUndefined();
    });

    it('should get medications by name', () => {
      const medications = store.getMedicationsByName('テスト');
      expect(medications).toHaveLength(2);
    });

    it('should get medications by type', () => {
      const medicines = store.getMedicationsByType(MedicationType.MEDICINE);
      expect(medicines).toHaveLength(1);
      expect(medicines[0].type).toBe(MedicationType.MEDICINE);
    });

    it('should return sorted medications', () => {
      const sorted = store.sortedMedications;
      expect(sorted[0].name).toBe('テストサプリ');
      expect(sorted[1].name).toBe('テスト薬');
    });

    it('should group medications by type', () => {
      const grouped = store.medicationsByType;
      expect(grouped[MedicationType.MEDICINE]).toHaveLength(1);
      expect(grouped[MedicationType.SUPPLEMENT]).toHaveLength(1);
    });

    it('should return loading state', () => {
      store.loading = true;
      expect(store.isLoading).toBe(true);
    });

    it('should return error state', () => {
      store.error = 'Test error';
      expect(store.hasError).toBe(true);
    });

    it('should check cache validity', () => {
      // Cache is invalid initially
      expect(store.isCacheValid).toBe(false);

      // Set recent cache
      store.cache.lastFetch = new Date();
      expect(store.isCacheValid).toBe(true);

      // Set old cache
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 10); // 10 minutes ago
      store.cache.lastFetch = oldDate;
      expect(store.isCacheValid).toBe(false);
    });

    it('should check records cache validity', () => {
      // Cache is invalid initially
      expect(store.isRecordsCacheValid).toBe(false);

      // Set recent cache
      store.cache.recordsLastFetch = new Date();
      expect(store.isRecordsCacheValid).toBe(true);

      // Set old cache
      const oldDate = new Date();
      oldDate.setMinutes(oldDate.getMinutes() - 10); // 10 minutes ago
      store.cache.recordsLastFetch = oldDate;
      expect(store.isRecordsCacheValid).toBe(false);
    });
  });

  describe('Medication Record Getters', () => {
    beforeEach(() => {
      store.records = [
        mockMedicationRecord,
        {
          ...mockMedicationRecord,
          id: 'record-2',
          catId: 'cat-2',
          status: MedicationStatus.PENDING,
          administeredAt: new Date('2024-01-02T08:00:00Z'),
        },
      ];
    });

    it('should get medication record by id', () => {
      const record = store.getMedicationRecordById('record-1');
      expect(record).toEqual(mockMedicationRecord);
    });

    it('should return undefined for non-existent record', () => {
      const record = store.getMedicationRecordById('non-existent');
      expect(record).toBeUndefined();
    });

    it('should get medication records by cat', () => {
      const records = store.getMedicationRecordsByCat('cat-1');
      expect(records).toHaveLength(1);
      expect(records[0].catId).toBe('cat-1');
    });

    it('should get medication records by medication', () => {
      const records = store.getMedicationRecordsByMedication('med-1');
      expect(records).toHaveLength(2);
    });

    it('should get medication records by status', () => {
      const administeredRecords = store.getMedicationRecordsByStatus(
        MedicationStatus.ADMINISTERED,
      );
      const pendingRecords = store.getMedicationRecordsByStatus(
        MedicationStatus.PENDING,
      );

      expect(administeredRecords).toHaveLength(1);
      expect(pendingRecords).toHaveLength(1);
    });

    it('should get medication records by date range', () => {
      const startDate = new Date('2024-01-01T00:00:00Z');
      const endDate = new Date('2024-01-01T23:59:59Z');

      const records = store.getMedicationRecordsByDateRange(startDate, endDate);
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('record-1');
    });

    it('should return sorted medication records', () => {
      const sorted = store.sortedMedicationRecords;
      expect(sorted[0].id).toBe('record-2'); // More recent date
      expect(sorted[1].id).toBe('record-1');
    });

    it('should get today\'s medication records', () => {
      // Set one record to today
      const today = new Date();
      store.records[0].administeredAt = today;

      const todaysRecords = store.getTodaysMedicationRecords;
      expect(todaysRecords).toHaveLength(1);
    });

    it('should get pending medication records', () => {
      const pendingRecords = store.getPendingMedicationRecords;
      expect(pendingRecords).toHaveLength(1);
      expect(pendingRecords[0].status).toBe(MedicationStatus.PENDING);
    });

    it('should get administered medication records', () => {
      const administeredRecords = store.getAdministeredMedicationRecords;
      expect(administeredRecords).toHaveLength(1);
      expect(administeredRecords[0].status).toBe(MedicationStatus.ADMINISTERED);
    });
  });

  describe('Actions', () => {
    describe('fetchMedications', () => {
      it('should fetch medications successfully', async () => {
        const mockResponse = {
          medications: [mockMedication],
          total: 1,
          limit: 20,
          offset: 0,
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        const result = await store.fetchMedications();

        expect($fetch).toHaveBeenCalledWith('/api/medications');
        expect(store.medications).toHaveLength(1);
        expect(store.medications[0].name).toBe('テスト薬');
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
        expect(result).toEqual(store.medications);
      });

      it('should fetch medications with filter', async () => {
        const mockResponse = {
          medications: [mockMedication],
          total: 1,
          limit: 10,
          offset: 0,
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        await store.fetchMedications({
          name: 'テスト',
          type: MedicationType.MEDICINE,
          limit: 10,
          offset: 0,
        });

        expect($fetch).toHaveBeenCalledWith(
          '/api/medications?name=%E3%83%86%E3%82%B9%E3%83%88&type=MEDICINE&limit=10',
        );
      });

      it('should use cache when valid', async () => {
        // Set up valid cache
        store.medications = [mockMedication];
        store.cache.lastFetch = new Date();

        const result = await store.fetchMedications();

        expect($fetch).not.toHaveBeenCalled();
        expect(result).toEqual([mockMedication]);
      });

      it('should handle fetch error', async () => {
        const error = new Error('Network error');
        vi.mocked($fetch).mockRejectedValueOnce(error);

        await expect(store.fetchMedications()).rejects.toThrow('Network error');
        expect(store.error).toBe('Network error');
        expect(store.loading).toBe(false);
      });
    });

    describe('createMedication', () => {
      it('should create medication successfully when online', async () => {
        const mockResponse = {
          medication: mockMedication,
          message: '薬が正常に登録されました',
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        const result = await store.createMedication(mockMedicationInput);

        expect($fetch).toHaveBeenCalledWith('/api/medications', {
          method: 'POST',
          body: mockMedicationInput,
        });
        expect(store.medications).toHaveLength(1);
        expect(store.medications[0].id).toBe(result.id);
        expect(result.name).toBe('テスト薬');
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle create error', async () => {
        const error = new Error('Validation error');
        vi.mocked($fetch).mockRejectedValueOnce(error);

        await expect(
          store.createMedication(mockMedicationInput),
        ).rejects.toThrow('Validation error');
        expect(store.error).toBe('Validation error');
        expect(store.loading).toBe(false);
      });
    });

    describe('updateMedication', () => {
      beforeEach(() => {
        store.medications = [mockMedication];
      });

      it('should update medication successfully when online', async () => {
        const updateData: MedicationUpdate = {
          name: '更新された薬',
          dosage: '1日2回',
        };

        const updatedMedication = {
          ...mockMedication,
          ...updateData,
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        };

        const mockResponse = {
          medication: updatedMedication,
          message: '薬の情報が正常に更新されました',
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        const result = await store.updateMedication('med-1', updateData);

        expect($fetch).toHaveBeenCalledWith('/api/medications/med-1', {
          method: 'PUT',
          body: updateData,
        });
        expect(result.name).toBe('更新された薬');
        expect(result.dosage).toBe('1日2回');
        expect(store.medications[0]).toEqual(result);
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle update error', async () => {
        const error = new Error('Not found');
        vi.mocked($fetch).mockRejectedValueOnce(error);

        await expect(
          store.updateMedication('med-1', { name: 'Updated' }),
        ).rejects.toThrow('Not found');
        expect(store.error).toBe('Not found');
        expect(store.loading).toBe(false);
      });
    });

    describe('deleteMedication', () => {
      beforeEach(() => {
        store.medications = [mockMedication];
      });

      it('should delete medication successfully when online', async () => {
        vi.mocked($fetch).mockResolvedValueOnce({
          message: '薬が正常に削除されました',
        });

        await store.deleteMedication('med-1');

        expect($fetch).toHaveBeenCalledWith('/api/medications/med-1', {
          method: 'DELETE',
        });
        expect(store.medications).toHaveLength(0);
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should delete medication with cascade', async () => {
        vi.mocked($fetch).mockResolvedValueOnce({
          message: '薬が正常に削除されました',
        });

        await store.deleteMedication('med-1', true);

        expect($fetch).toHaveBeenCalledWith(
          '/api/medications/med-1?cascade=true',
          {
            method: 'DELETE',
          },
        );
        expect(store.medications).toHaveLength(0);
      });

      it('should handle delete error', async () => {
        const error = new Error('Cannot delete');
        vi.mocked($fetch).mockRejectedValueOnce(error);

        await expect(store.deleteMedication('med-1')).rejects.toThrow(
          'Cannot delete',
        );
        expect(store.error).toBe('Cannot delete');
        expect(store.loading).toBe(false);
      });
    });

    describe('Utility Actions', () => {
      it('should clear error', () => {
        store.error = 'Test error';
        store.clearError();
        expect(store.error).toBe(null);
      });

      it('should invalidate cache', () => {
        store.cache.lastFetch = new Date();
        store.invalidateCache();
        expect(store.cache.lastFetch).toBe(null);
      });

      it('should add medication to state', () => {
        store.addMedicationToState(mockMedication);
        expect(store.medications).toHaveLength(1);
        expect(store.medications[0].id).toBe(mockMedication.id);

        // Should update existing medication
        const updatedMedication = { ...mockMedication, name: 'Updated' };
        store.addMedicationToState(updatedMedication);
        expect(store.medications).toHaveLength(1);
        expect(store.medications[0].name).toBe('Updated');
      });

      it('should remove medication from state', () => {
        store.medications = [mockMedication];
        store.removeMedicationFromState('med-1');
        expect(store.medications).toHaveLength(0);
      });
    });

    describe('Medication Record Actions', () => {
      describe('fetchMedicationRecords', () => {
        it('should fetch medication records successfully', async () => {
          const mockResponse = {
            records: [mockMedicationRecord],
            total: 1,
            limit: 20,
            offset: 0,
          };

          vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

          const result = await store.fetchMedicationRecords();

          expect($fetch).toHaveBeenCalledWith('/api/medication-records');
          expect(store.records).toHaveLength(1);
          expect(store.records[0].id).toBe('record-1');
          expect(store.loading).toBe(false);
          expect(store.error).toBe(null);
          expect(result).toEqual(store.records);
        });

        it('should fetch medication records with filter', async () => {
          const mockResponse = {
            records: [mockMedicationRecord],
            total: 1,
            limit: 10,
            offset: 0,
          };

          vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

          await store.fetchMedicationRecords({
            catId: 'cat-1',
            medicationId: 'med-1',
            status: MedicationStatus.ADMINISTERED,
            limit: 10,
            offset: 5,
          });

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-records?catId=cat-1&medicationId=med-1&status=ADMINISTERED&limit=10&offset=5',
          );
        });

        it('should use cache when valid', async () => {
          // Set up valid cache
          store.records = [mockMedicationRecord];
          store.cache.recordsLastFetch = new Date();

          const result = await store.fetchMedicationRecords();

          expect($fetch).not.toHaveBeenCalled();
          expect(result).toEqual([mockMedicationRecord]);
        });

        it('should handle fetch error', async () => {
          const error = new Error('Network error');
          vi.mocked($fetch).mockRejectedValueOnce(error);

          await expect(store.fetchMedicationRecords()).rejects.toThrow(
            'Network error',
          );
          expect(store.error).toBe('Network error');
          expect(store.loading).toBe(false);
        });
      });

      describe('createMedicationRecord', () => {
        it('should create medication record successfully when online', async () => {
          const mockResponse = {
            record: mockMedicationRecord,
            message: '投与記録が正常に登録されました',
          };

          vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

          const result = await store.createMedicationRecord(
            mockMedicationRecordInput,
          );

          expect($fetch).toHaveBeenCalledWith('/api/medication-records', {
            method: 'POST',
            body: mockMedicationRecordInput,
          });
          expect(store.records).toHaveLength(1);
          expect(store.records[0].id).toBe(result.id);
          expect(result.catId).toBe('cat-1');
          expect(store.loading).toBe(false);
          expect(store.error).toBe(null);
        });

        it('should handle create error', async () => {
          const error = new Error('Validation error');
          vi.mocked($fetch).mockRejectedValueOnce(error);

          await expect(
            store.createMedicationRecord(mockMedicationRecordInput),
          ).rejects.toThrow('Validation error');
          expect(store.error).toBe('Validation error');
          expect(store.loading).toBe(false);
        });
      });

      describe('updateMedicationRecord', () => {
        beforeEach(() => {
          store.records = [mockMedicationRecord];
        });

        it('should update medication record successfully when online', async () => {
          const updateData: MedicationRecordUpdate = {
            quantity: 3,
            status: MedicationStatus.ADMINISTERED,
            notes: '更新されたメモ',
          };

          const updatedRecord = {
            ...mockMedicationRecord,
            ...updateData,
            updatedAt: new Date('2024-01-02T00:00:00Z'),
          };

          const mockResponse = {
            record: updatedRecord,
            message: '投与記録が正常に更新されました',
          };

          vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

          const result = await store.updateMedicationRecord(
            'record-1',
            updateData,
          );

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-records/record-1',
            {
              method: 'PUT',
              body: updateData,
            },
          );
          expect(result.quantity).toBe(3);
          expect(result.notes).toBe('更新されたメモ');
          expect(store.records[0]).toEqual(result);
          expect(store.loading).toBe(false);
          expect(store.error).toBe(null);
        });

        it('should handle update error', async () => {
          const error = new Error('Not found');
          vi.mocked($fetch).mockRejectedValueOnce(error);

          await expect(
            store.updateMedicationRecord('record-1', { quantity: 3 }),
          ).rejects.toThrow('Not found');
          expect(store.error).toBe('Not found');
          expect(store.loading).toBe(false);
        });
      });

      describe('deleteMedicationRecord', () => {
        beforeEach(() => {
          store.records = [mockMedicationRecord];
        });

        it('should delete medication record successfully when online', async () => {
          vi.mocked($fetch).mockResolvedValueOnce({
            message: '投与記録が正常に削除されました',
          });

          await store.deleteMedicationRecord('record-1');

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-records/record-1',
            {
              method: 'DELETE',
            },
          );
          expect(store.records).toHaveLength(0);
          expect(store.loading).toBe(false);
          expect(store.error).toBe(null);
        });

        it('should handle delete error', async () => {
          const error = new Error('Cannot delete');
          vi.mocked($fetch).mockRejectedValueOnce(error);

          await expect(
            store.deleteMedicationRecord('record-1'),
          ).rejects.toThrow('Cannot delete');
          expect(store.error).toBe('Cannot delete');
          expect(store.loading).toBe(false);
        });
      });

      describe('Medication Record Utility Actions', () => {
        it('should add medication record to state', () => {
          store.addMedicationRecordToState(mockMedicationRecord);
          expect(store.records).toHaveLength(1);
          expect(store.records[0].id).toBe(mockMedicationRecord.id);

          // Should update existing record
          const updatedRecord = { ...mockMedicationRecord, quantity: 5 };
          store.addMedicationRecordToState(updatedRecord);
          expect(store.records).toHaveLength(1);
          expect(store.records[0].quantity).toBe(5);
        });

        it('should remove medication record from state', () => {
          store.records = [mockMedicationRecord];
          store.removeMedicationRecordFromState('record-1');
          expect(store.records).toHaveLength(0);
        });

        it('should invalidate records cache', () => {
          store.cache.recordsLastFetch = new Date();
          store.invalidateRecordsCache();
          expect(store.cache.recordsLastFetch).toBe(null);
        });
      });
    });

    describe('Medication Reminder Getters', () => {
      beforeEach(() => {
        store.reminders = [
          mockMedicationReminder,
          {
            ...mockMedicationReminder,
            id: 'reminder-2',
            catId: 'cat-2',
            status: ReminderStatus.ACKNOWLEDGED,
            scheduledAt: new Date('2024-01-02T08:00:00Z'),
          },
          {
            ...mockMedicationReminder,
            id: 'reminder-3',
            status: ReminderStatus.SNOOZED,
            scheduledAt: new Date('2024-01-01T09:00:00Z'),
          },
        ];
      });

      it('should get medication reminder by id', () => {
        const reminder = store.getMedicationReminderById('reminder-1');
        expect(reminder).toEqual(mockMedicationReminder);
      });

      it('should return undefined for non-existent reminder', () => {
        const reminder = store.getMedicationReminderById('non-existent');
        expect(reminder).toBeUndefined();
      });

      it('should get medication reminders by cat', () => {
        const reminders = store.getMedicationRemindersByCat('cat-1');
        expect(reminders).toHaveLength(2);
        expect(reminders.every(r => r.catId === 'cat-1')).toBe(true);
      });

      it('should get medication reminders by medication', () => {
        const reminders = store.getMedicationRemindersByMedication('med-1');
        expect(reminders).toHaveLength(3);
      });

      it('should get medication reminders by schedule', () => {
        const reminders = store.getMedicationRemindersBySchedule('schedule-1');
        expect(reminders).toHaveLength(3);
      });

      it('should get medication reminders by status', () => {
        const pendingReminders = store.getMedicationRemindersByStatus(ReminderStatus.PENDING);
        const acknowledgedReminders = store.getMedicationRemindersByStatus(ReminderStatus.ACKNOWLEDGED);
        const snoozedReminders = store.getMedicationRemindersByStatus(ReminderStatus.SNOOZED);

        expect(pendingReminders).toHaveLength(1);
        expect(acknowledgedReminders).toHaveLength(1);
        expect(snoozedReminders).toHaveLength(1);
      });

      it('should get pending reminders', () => {
        const pendingReminders = store.getPendingReminders;
        expect(pendingReminders).toHaveLength(1);
        expect(pendingReminders[0].status).toBe(ReminderStatus.PENDING);
      });

      it('should get acknowledged reminders', () => {
        const acknowledgedReminders = store.getAcknowledgedReminders;
        expect(acknowledgedReminders).toHaveLength(1);
        expect(acknowledgedReminders[0].status).toBe(ReminderStatus.ACKNOWLEDGED);
      });

      it('should get snoozed reminders', () => {
        const snoozedReminders = store.getSnoozedReminders;
        expect(snoozedReminders).toHaveLength(1);
        expect(snoozedReminders[0].status).toBe(ReminderStatus.SNOOZED);
      });

      it('should get today\'s reminders', () => {
        // Set one reminder to today
        const today = new Date();
        store.reminders[0].scheduledAt = today;

        const todaysReminders = store.getTodaysReminders;
        expect(todaysReminders).toHaveLength(1);
      });

      it('should get upcoming reminders', () => {
        // Set one reminder to next 30 minutes
        const soon = new Date(Date.now() + 30 * 60 * 1000);
        store.reminders[0].scheduledAt = soon;
        store.reminders[0].status = ReminderStatus.PENDING;

        const upcomingReminders = store.getUpcomingReminders;
        expect(upcomingReminders).toHaveLength(1);
      });

      it('should get overdue reminders', () => {
        // Set one reminder to past
        const past = new Date(Date.now() - 60 * 60 * 1000);
        store.reminders[0].scheduledAt = past;
        store.reminders[0].status = ReminderStatus.PENDING;

        const overdueReminders = store.getOverdueReminders;
        expect(overdueReminders).toHaveLength(1);
      });

      it('should return sorted medication reminders', () => {
        const sorted = store.sortedMedicationReminders;
        // Check that reminders are sorted by scheduledAt in ascending order
        expect(sorted).toHaveLength(3);
        expect(sorted[0].scheduledAt.getTime()).toBeLessThanOrEqual(sorted[1].scheduledAt.getTime());
        expect(sorted[1].scheduledAt.getTime()).toBeLessThanOrEqual(sorted[2].scheduledAt.getTime());
      });
    });

    describe('Medication Reminder Actions', () => {
      describe('fetchMedicationReminders', () => {
        it('should fetch medication reminders successfully', async () => {
          const mockResponse = {
            data: [mockMedicationReminder],
            pagination: {
              total: 1,
              limit: 50,
              offset: 0,
              hasMore: false,
            },
          };

          vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

          const result = await store.fetchMedicationReminders();

          expect($fetch).toHaveBeenCalledWith('/api/medication-reminders');
          expect(store.reminders).toHaveLength(1);
          expect(store.reminders[0].id).toBe('reminder-1');
          expect(store.loading).toBe(false);
          expect(store.error).toBe(null);
          expect(result).toEqual(store.reminders);
        });

        it('should fetch medication reminders with filter', async () => {
          const mockResponse = {
            data: [mockMedicationReminder],
            pagination: {
              total: 1,
              limit: 10,
              offset: 0,
              hasMore: false,
            },
          };

          vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

          await store.fetchMedicationReminders({
            catId: 'cat-1',
            status: ReminderStatus.PENDING,
            limit: 10,
            offset: 5,
          });

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-reminders?catId=cat-1&status=PENDING&limit=10&offset=5',
          );
        });

        it('should use cache when valid', async () => {
          // Set up valid cache
          store.reminders = [mockMedicationReminder];
          store.cache.remindersLastFetch = new Date();

          const result = await store.fetchMedicationReminders();

          expect($fetch).not.toHaveBeenCalled();
          expect(result).toEqual([mockMedicationReminder]);
        });

        it('should handle fetch error', async () => {
          const error = new Error('Network error');
          vi.mocked($fetch).mockRejectedValueOnce(error);

          await expect(store.fetchMedicationReminders()).rejects.toThrow(
            'Network error',
          );
          expect(store.error).toBe('Network error');
          expect(store.loading).toBe(false);
        });
      });

      describe('createMedicationReminder', () => {
        it('should create medication reminder successfully when online', async () => {
          vi.mocked($fetch).mockResolvedValueOnce(mockMedicationReminder);

          const result = await store.createMedicationReminder(
            mockMedicationReminderInput,
          );

          expect($fetch).toHaveBeenCalledWith('/api/medication-reminders', {
            method: 'POST',
            body: mockMedicationReminderInput,
          });
          expect(store.reminders).toHaveLength(1);
          expect(store.reminders[0].id).toBe(result.id);
          expect(result.scheduleId).toBe('schedule-1');
          expect(store.loading).toBe(false);
          expect(store.error).toBe(null);
        });

        it('should handle create error', async () => {
          const error = new Error('Validation error');
          vi.mocked($fetch).mockRejectedValueOnce(error);

          await expect(
            store.createMedicationReminder(mockMedicationReminderInput),
          ).rejects.toThrow('Validation error');
          expect(store.error).toBe('Validation error');
          expect(store.loading).toBe(false);
        });
      });

      describe('updateMedicationReminder', () => {
        beforeEach(() => {
          store.reminders = [mockMedicationReminder];
        });

        it('should update medication reminder successfully when online', async () => {
          const updatedReminder = {
            ...mockMedicationReminder,
            status: ReminderStatus.ACKNOWLEDGED,
            updatedAt: new Date('2024-01-02T00:00:00Z'),
          };

          vi.mocked($fetch).mockResolvedValueOnce(updatedReminder);

          const result = await store.updateMedicationReminder('reminder-1', {
            status: ReminderStatus.ACKNOWLEDGED,
          });

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-reminders/reminder-1',
            {
              method: 'PUT',
              body: { status: ReminderStatus.ACKNOWLEDGED },
            },
          );
          expect(result.status).toBe(ReminderStatus.ACKNOWLEDGED);
          expect(store.reminders[0]).toEqual(result);
          expect(store.loading).toBe(false);
          expect(store.error).toBe(null);
        });

        it('should handle update error', async () => {
          const error = new Error('Not found');
          vi.mocked($fetch).mockRejectedValueOnce(error);

          await expect(
            store.updateMedicationReminder('reminder-1', {
              status: ReminderStatus.ACKNOWLEDGED,
            }),
          ).rejects.toThrow('Not found');
          expect(store.error).toBe('Not found');
          expect(store.loading).toBe(false);
        });
      });

      describe('acknowledgeReminder', () => {
        beforeEach(() => {
          store.reminders = [mockMedicationReminder];
        });

        it('should acknowledge reminder successfully', async () => {
          const acknowledgedReminder = {
            ...mockMedicationReminder,
            status: ReminderStatus.ACKNOWLEDGED,
          };

          vi.mocked($fetch).mockResolvedValueOnce(acknowledgedReminder);

          const result = await store.acknowledgeReminder('reminder-1');

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-reminders/reminder-1',
            {
              method: 'PUT',
              body: { status: ReminderStatus.ACKNOWLEDGED },
            },
          );
          expect(result.status).toBe(ReminderStatus.ACKNOWLEDGED);
        });
      });

      describe('snoozeReminder', () => {
        beforeEach(() => {
          store.reminders = [mockMedicationReminder];
        });

        it('should snooze reminder successfully', async () => {
          const originalTime = mockMedicationReminder.scheduledAt;
          const newTime = new Date(originalTime.getTime() + 30 * 60 * 1000);
          const snoozedReminder = {
            ...mockMedicationReminder,
            status: ReminderStatus.SNOOZED,
            scheduledAt: newTime,
          };

          vi.mocked($fetch).mockResolvedValueOnce(snoozedReminder);

          const result = await store.snoozeReminder('reminder-1', 30);

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-reminders/reminder-1',
            {
              method: 'PUT',
              body: {
                status: ReminderStatus.SNOOZED,
                scheduledAt: newTime,
              },
            },
          );
          expect(result.status).toBe(ReminderStatus.SNOOZED);
          expect(result.scheduledAt.getTime()).toBe(newTime.getTime());
        });

        it('should throw error when reminder not found', async () => {
          await expect(store.snoozeReminder('non-existent', 30)).rejects.toThrow(
            'Reminder not found',
          );
        });
      });

      describe('dismissReminder', () => {
        beforeEach(() => {
          store.reminders = [mockMedicationReminder];
        });

        it('should dismiss reminder successfully', async () => {
          const dismissedReminder = {
            ...mockMedicationReminder,
            status: ReminderStatus.DISMISSED,
          };

          vi.mocked($fetch).mockResolvedValueOnce(dismissedReminder);

          const result = await store.dismissReminder('reminder-1');

          expect($fetch).toHaveBeenCalledWith(
            '/api/medication-reminders/reminder-1',
            {
              method: 'PUT',
              body: { status: ReminderStatus.DISMISSED },
            },
          );
          expect(result.status).toBe(ReminderStatus.DISMISSED);
        });
      });

      describe('Medication Reminder Utility Actions', () => {
        it('should add medication reminder to state', () => {
          store.addMedicationReminderToState(mockMedicationReminder);
          expect(store.reminders).toHaveLength(1);
          expect(store.reminders[0].id).toBe(mockMedicationReminder.id);

          // Should update existing reminder
          const updatedReminder = {
            ...mockMedicationReminder,
            status: ReminderStatus.ACKNOWLEDGED,
          };
          store.addMedicationReminderToState(updatedReminder);
          expect(store.reminders).toHaveLength(1);
          expect(store.reminders[0].status).toBe(ReminderStatus.ACKNOWLEDGED);
        });

        it('should remove medication reminder from state', () => {
          store.reminders = [mockMedicationReminder];
          store.removeMedicationReminderFromState('reminder-1');
          expect(store.reminders).toHaveLength(0);
        });

        it('should invalidate reminders cache', () => {
          store.cache.remindersLastFetch = new Date();
          store.invalidateRemindersCache();
          expect(store.cache.remindersLastFetch).toBe(null);
        });
      });
    });
  });
});
