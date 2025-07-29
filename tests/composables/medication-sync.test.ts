import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OfflineStorage } from '~/utils/offline-storage';
import type {
  Medication,
  MedicationRecord,
  MedicationSchedule,
  MedicationReminder,
  MedicationType,
  MedicationStatus,
  ReminderStatus,
} from '~/types/medication';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Medication Data Synchronization', () => {
  let offlineStorage: OfflineStorage;

  const mockMedication: Medication = {
    id: 'med-1',
    name: 'テスト薬',
    type: 'MEDICINE' as MedicationType,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedicationRecord: MedicationRecord = {
    id: 'record-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    quantity: 1,
    administeredAt: new Date(),
    status: 'ADMINISTERED' as MedicationStatus,
    notes: 'テスト投与記録',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    offlineStorage = OfflineStorage.getInstance();
    offlineStorage.clear();
  });

  afterEach(() => {
    offlineStorage.clear();
  });

  describe('Offline Storage Operations', () => {
    it('should add medication offline', () => {
      const medicationInput = {
        name: mockMedication.name,
        type: mockMedication.type,
        description: mockMedication.description,
        dosage: mockMedication.dosage,
      };

      const localId = offlineStorage.addMedicationOffline(medicationInput);

      expect(localId).toMatch(/^local-medication-/);

      const medications = offlineStorage.getMedications();
      expect(medications).toHaveLength(1);
      expect(medications[0]).toMatchObject(medicationInput);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(1);
      expect(pendingData.medications[0].action).toBe('create');
    });

    it('should add medication record offline', () => {
      const recordInput = {
        catId: mockMedicationRecord.catId,
        medicationId: mockMedicationRecord.medicationId,
        quantity: mockMedicationRecord.quantity,
        administeredAt: mockMedicationRecord.administeredAt,
        status: mockMedicationRecord.status,
        notes: mockMedicationRecord.notes,
      };

      const localId = offlineStorage.addMedicationRecordOffline(recordInput);

      expect(localId).toMatch(/^local-medication-record-/);

      const records = offlineStorage.getMedicationRecords();
      expect(records).toHaveLength(1);
      expect(records[0]).toMatchObject(recordInput);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medicationRecords).toHaveLength(1);
      expect(pendingData.medicationRecords[0].action).toBe('create');
    });

    it('should update medication offline', () => {
      const localId = offlineStorage.addMedicationOffline({
        name: 'Original Name',
        type: 'MEDICINE' as MedicationType,
      });

      const updates = {
        name: 'Updated Name',
        description: 'Updated description',
      };

      offlineStorage.updateOffline('medication', localId, updates);

      const medications = offlineStorage.getMedications();
      expect(medications[0].name).toBe('Updated Name');
      expect(medications[0].description).toBe('Updated description');

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(2); // create + update
    });

    it('should delete medication offline', () => {
      const localId = offlineStorage.addMedicationOffline({
        name: 'Test Medication',
        type: 'MEDICINE' as MedicationType,
      });

      offlineStorage.deleteOffline('medication', localId);

      const medications = offlineStorage.getMedications();
      expect(medications).toHaveLength(0);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(2); // create + delete
    });
  });

  describe('Data Synchronization Logic', () => {
    it('should track pending sync operations', () => {
      // Add various medication entities offline
      offlineStorage.addMedicationOffline({
        name: 'Test Medication',
        type: 'MEDICINE' as MedicationType,
      });

      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date(),
        status: 'ADMINISTERED' as MedicationStatus,
      });

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(1);
      expect(pendingData.medicationRecords).toHaveLength(1);
    });

    it('should update local to server ID mapping', () => {
      const localId = offlineStorage.addMedicationOffline({
        name: 'Test Medication',
        type: 'MEDICINE' as MedicationType,
      });

      const serverId = 'server-med-123';
      offlineStorage.updateLocalToServerId('medication', localId, serverId);

      const medications = offlineStorage.getMedications();
      expect(medications[0].id).toBe(serverId);
    });

    it('should clear all pending sync data', () => {
      // Add multiple items
      offlineStorage.addMedicationOffline({
        name: 'Test Medication',
        type: 'MEDICINE' as MedicationType,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date(),
        status: 'ADMINISTERED' as MedicationStatus,
      });

      let pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications.length + pendingData.medicationRecords.length).toBeGreaterThan(0);

      offlineStorage.clearPendingSync();

      pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(0);
      expect(pendingData.medicationRecords).toHaveLength(0);
    });

    it('should update from server with medication data', () => {
      const medications = [mockMedication];
      const medicationRecords = [mockMedicationRecord];

      offlineStorage.updateFromServer(
        [], // cats
        [], // foods
        [], // meals
        medications,
        medicationRecords,
        [], // schedules
        [], // reminders
      );

      expect(offlineStorage.getMedications()).toEqual(medications);
      expect(offlineStorage.getMedicationRecords()).toEqual(medicationRecords);
    });
  });

  describe('Data Filtering and Querying', () => {
    it('should filter medication records by cat', () => {
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date(),
        status: 'ADMINISTERED' as MedicationStatus,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-2',
        medicationId: 'med-1',
        quantity: 2,
        administeredAt: new Date(),
        status: 'PENDING' as MedicationStatus,
      });

      const cat1Records = offlineStorage.getMedicationRecords('cat-1');
      const cat2Records = offlineStorage.getMedicationRecords('cat-2');

      expect(cat1Records).toHaveLength(1);
      expect(cat2Records).toHaveLength(1);
      expect(cat1Records[0].catId).toBe('cat-1');
      expect(cat2Records[0].catId).toBe('cat-2');
    });

    it('should sort medication records by administered date (newest first)', () => {
      const date1 = new Date('2024-01-01');
      const date2 = new Date('2024-01-02');
      const date3 = new Date('2024-01-03');

      // Add in random order
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: date2,
        status: 'ADMINISTERED' as MedicationStatus,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: date1,
        status: 'ADMINISTERED' as MedicationStatus,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: date3,
        status: 'ADMINISTERED' as MedicationStatus,
      });

      const records = offlineStorage.getMedicationRecords();

      expect(records).toHaveLength(3);
      expect(new Date(records[0].administeredAt)).toEqual(date3);
      expect(new Date(records[1].administeredAt)).toEqual(date2);
      expect(new Date(records[2].administeredAt)).toEqual(date1);
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      // Should not throw error
      expect(() => {
        offlineStorage.addMedicationOffline({
          name: 'Test Medication',
          type: 'MEDICINE' as MedicationType,
        });
      }).not.toThrow();
    });
  });
});
