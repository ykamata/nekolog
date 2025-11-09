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

// Mock $fetch
global.$fetch = vi.fn();

describe('Medications Store', () => {
  let store: ReturnType<typeof useMedicationsStore>;

  const mockMedication: Medication = {
    id: 1,
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
    id: 1,
    catId: 1,
    medicationId: 1,
    quantity: 2,
    administeredAt: new Date('2024-01-01T08:00:00Z'),
    status: MedicationStatus.ADMINISTERED,
    notes: 'テストメモ',
    createdAt: new Date('2024-01-01T08:00:00Z'),
    updatedAt: new Date('2024-01-01T08:00:00Z'),
  };

  const mockMedicationRecordInput: MedicationRecordInput = {
    catId: 1,
    medicationId: 1,
    quantity: 2,
    administeredAt: new Date('2024-01-01T08:00:00Z'),
    status: MedicationStatus.ADMINISTERED,
    notes: 'テストメモ',
  };

  const mockMedicationReminder: MedicationReminder = {
    id: 1,
    scheduleId: 1,
    catId: 1,
    medicationId: 1,
    scheduledAt: new Date('2024-01-01T08:00:00Z'),
    status: ReminderStatus.PENDING,
    createdAt: new Date('2024-01-01T08:00:00Z'),
    updatedAt: new Date('2024-01-01T08:00:00Z'),
  };

  const mockMedicationReminderInput: MedicationReminderInput = {
    scheduleId: 1,
    catId: 1,
    medicationId: 1,
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
      expect(store.medicationRecords).toEqual([]);
      expect(store.medicationReminders).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.cache.lastFetch).toBe(null);
      expect(store.cache.recordsLastFetch).toBe(null);
      expect(store.cache.remindersLastFetch).toBe(null);
    });
  });

  describe('Getters', () => {
    beforeEach(() => {
      store.medications = [
        mockMedication,
        {
          ...mockMedication,
          id: 2,
          name: 'テストサプリ',
          type: MedicationType.SUPPLEMENT,
        },
      ];
    });

    it('should get medication by id', () => {
      const medication = store.getMedicationById(1);
      expect(medication).toEqual(mockMedication);
    });

    it('should return undefined for non-existent medication', () => {
      const medication = store.getMedicationById('non-existent');
      expect(medication).toBeUndefined();
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
  });

  describe('Medication Record Getters', () => {
    beforeEach(() => {
      store.medicationRecords = [
        mockMedicationRecord,
        {
          ...mockMedicationRecord,
          id: 2,
          catId: 2,
          status: MedicationStatus.PENDING,
          administeredAt: new Date('2024-01-02T08:00:00Z'),
        },
      ];
    });

    it('should get medication record by id', () => {
      const record = store.getMedicationRecordById('record-1');
      expect(record).toEqual(mockMedicationRecord);
    });

    it('should get medication records by cat', () => {
      const records = store.getMedicationRecordsByCat('cat-1');
      expect(records).toHaveLength(1);
      expect(records[0].catId).toBe('cat-1');
    });

    it('should get medication records by medication', () => {
      const records = store.getMedicationRecordsByMedication(1);
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

    it('should return sorted medication records', () => {
      const sorted = store.sortedMedicationRecords;
      expect(sorted[0].id).toBe('record-2'); // More recent date
      expect(sorted[1].id).toBe('record-1');
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
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        await store.fetchMedications();

        expect($fetch).toHaveBeenCalledWith('/api/medications?');
        expect(store.medications).toHaveLength(1);
        expect(store.medications[0].name).toBe('テスト薬');
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should fetch medications with filter', async () => {
        const mockResponse = {
          medications: [mockMedication],
          total: 1,
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        await store.fetchMedications({
          type: MedicationType.MEDICINE,
        });

        expect($fetch).toHaveBeenCalledWith(
          '/api/medications?type=MEDICINE',
        );
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
      it('should create medication successfully', async () => {
        vi.mocked($fetch).mockResolvedValueOnce(mockMedication);

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

      it('should update medication successfully', async () => {
        const updateData: MedicationUpdate = {
          name: '更新された薬',
          dosage: '1日2回',
        };

        const updatedMedication = {
          ...mockMedication,
          ...updateData,
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        };

        vi.mocked($fetch).mockResolvedValueOnce(updatedMedication);

        const result = await store.updateMedication(1, updateData);

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
          store.updateMedication(1, { name: 'Updated' }),
        ).rejects.toThrow('Not found');
        expect(store.error).toBe('Not found');
        expect(store.loading).toBe(false);
      });
    });

    describe('deleteMedication', () => {
      beforeEach(() => {
        store.medications = [mockMedication];
      });

      it('should delete medication successfully', async () => {
        vi.mocked($fetch).mockResolvedValueOnce({
          message: '薬が正常に削除されました',
        });

        await store.deleteMedication(1);

        expect($fetch).toHaveBeenCalledWith('/api/medications/med-1', {
          method: 'DELETE',
        });
        expect(store.medications).toHaveLength(0);
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle delete error', async () => {
        const error = new Error('Cannot delete');
        vi.mocked($fetch).mockRejectedValueOnce(error);

        await expect(store.deleteMedication(1)).rejects.toThrow(
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
    });
  });

  describe('Medication Record Actions', () => {
    describe('fetchMedicationRecords', () => {
      it('should fetch medication records successfully', async () => {
        const mockResponse = {
          records: [mockMedicationRecord],
          total: 1,
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        await store.fetchMedicationRecords();

        expect($fetch).toHaveBeenCalledWith('/api/medication-records?');
        expect(store.medicationRecords).toHaveLength(1);
        expect(store.medicationRecords[0].id).toBe('record-1');
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should fetch medication records with filter', async () => {
        const mockResponse = {
          records: [mockMedicationRecord],
          total: 1,
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        await store.fetchMedicationRecords({
          catId: 1,
          medicationId: 1,
          status: MedicationStatus.ADMINISTERED,
        });

        expect($fetch).toHaveBeenCalledWith(
          '/api/medication-records?catId=cat-1&medicationId=med-1&status=ADMINISTERED',
        );
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
      it('should create medication record successfully', async () => {
        vi.mocked($fetch).mockResolvedValueOnce(mockMedicationRecord);

        const result = await store.createMedicationRecord(
          mockMedicationRecordInput,
        );

        expect($fetch).toHaveBeenCalledWith('/api/medication-records', {
          method: 'POST',
          body: mockMedicationRecordInput,
        });
        expect(store.medicationRecords).toHaveLength(1);
        expect(store.medicationRecords[0].id).toBe(result.id);
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
        store.medicationRecords = [mockMedicationRecord];
      });

      it('should update medication record successfully', async () => {
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

        vi.mocked($fetch).mockResolvedValueOnce(updatedRecord);

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
        expect(store.medicationRecords[0]).toEqual(result);
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
  });

  describe('Medication Reminder Actions', () => {
    describe('fetchMedicationReminders', () => {
      it('should fetch medication reminders successfully', async () => {
        const mockResponse = {
          reminders: [mockMedicationReminder],
          total: 1,
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        await store.fetchMedicationReminders();

        expect($fetch).toHaveBeenCalledWith('/api/medication-reminders?');
        expect(store.medicationReminders).toHaveLength(1);
        expect(store.medicationReminders[0].id).toBe(1);
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should fetch medication reminders with filter', async () => {
        const mockResponse = {
          reminders: [mockMedicationReminder],
          total: 1,
        };

        vi.mocked($fetch).mockResolvedValueOnce(mockResponse);

        await store.fetchMedicationReminders({
          catId: 1,
          status: ReminderStatus.PENDING,
        });

        expect($fetch).toHaveBeenCalledWith(
          '/api/medication-reminders?catId=cat-1&status=PENDING',
        );
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
      it('should create medication reminder successfully', async () => {
        vi.mocked($fetch).mockResolvedValueOnce(mockMedicationReminder);

        const result = await store.createMedicationReminder(
          mockMedicationReminderInput,
        );

        expect($fetch).toHaveBeenCalledWith('/api/medication-reminders', {
          method: 'POST',
          body: mockMedicationReminderInput,
        });
        expect(store.medicationReminders).toHaveLength(1);
        expect(store.medicationReminders[0].id).toBe(result.id);
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

    describe('updateReminderStatus', () => {
      beforeEach(() => {
        store.medicationReminders = [mockMedicationReminder];
      });

      it('should update reminder status successfully', async () => {
        const updatedReminder = {
          ...mockMedicationReminder,
          status: ReminderStatus.ACKNOWLEDGED,
        };

        vi.mocked($fetch).mockResolvedValueOnce(updatedReminder);

        const result = await store.updateReminderStatus(
          1,
          ReminderStatus.ACKNOWLEDGED,
        );

        expect($fetch).toHaveBeenCalledWith(
          '/api/medication-reminders/reminder-1',
          {
            method: 'PUT',
            body: { status: ReminderStatus.ACKNOWLEDGED },
          },
        );
        expect(result.status).toBe(ReminderStatus.ACKNOWLEDGED);
        expect(store.medicationReminders[0]).toEqual(result);
        expect(store.loading).toBe(false);
        expect(store.error).toBe(null);
      });

      it('should handle update error', async () => {
        const error = new Error('Not found');
        vi.mocked($fetch).mockRejectedValueOnce(error);

        await expect(
          store.updateReminderStatus(1, ReminderStatus.ACKNOWLEDGED),
        ).rejects.toThrow('Not found');
        expect(store.error).toBe('Not found');
        expect(store.loading).toBe(false);
      });
    });
  });

  describe('Reminder Getters', () => {
    beforeEach(() => {
      store.medicationReminders = [
        mockMedicationReminder,
        {
          ...mockMedicationReminder,
          id: 2,
          catId: 2,
          status: ReminderStatus.ACKNOWLEDGED,
          scheduledAt: new Date('2024-01-02T08:00:00Z'),
        },
        {
          ...mockMedicationReminder,
          id: 3,
          status: ReminderStatus.SNOOZED,
          scheduledAt: new Date('2024-01-01T09:00:00Z'),
        },
      ];
    });

    it('should get medication reminder by id', () => {
      const reminder = store.getMedicationReminderById(1);
      expect(reminder).toEqual(mockMedicationReminder);
    });

    it('should get medication reminders by cat', () => {
      const reminders = store.getMedicationRemindersByCat('cat-1');
      expect(reminders).toHaveLength(2);
      expect(reminders.every(r => r.catId === 'cat-1')).toBe(true);
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

    it('should return sorted medication reminders', () => {
      const sorted = store.sortedMedicationReminders;
      expect(sorted).toHaveLength(3);
      expect(sorted[0].scheduledAt.getTime()).toBeLessThanOrEqual(sorted[1].scheduledAt.getTime());
      expect(sorted[1].scheduledAt.getTime()).toBeLessThanOrEqual(sorted[2].scheduledAt.getTime());
    });
  });
});
