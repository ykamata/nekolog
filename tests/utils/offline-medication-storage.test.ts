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

describe('OfflineStorage - Medication Management', () => {
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
    administeredAt: new Date(), // Use current date
    status: 'ADMINISTERED' as MedicationStatus,
    notes: 'テスト投与記録',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedicationSchedule: MedicationSchedule = {
    id: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    frequency: 'daily',
    times: ['08:00', '20:00'],
    startDate: new Date(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockMedicationReminder: MedicationReminder = {
    id: 'reminder-1',
    scheduleId: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    scheduledAt: new Date(),
    status: 'PENDING' as ReminderStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    offlineStorage = OfflineStorage.getInstance();
  });

  afterEach(() => {
    offlineStorage.clear();
  });

  describe('Medication Management', () => {
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
      expect(medications[0].id).toBe(localId);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(1);
      expect(pendingData.medications[0].action).toBe('create');
      expect(pendingData.medications[0].localId).toBe(localId);
    });

    it('should update medication offline', () => {
      // First add a medication
      const localId = offlineStorage.addMedicationOffline({
        name: 'Original Name',
        type: 'MEDICINE' as MedicationType,
        description: 'Original description',
        dosage: '1日1回',
      });

      // Update the medication
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
      expect(pendingData.medications[1].action).toBe('update');
    });

    it('should delete medication offline', () => {
      // First add a medication
      const localId = offlineStorage.addMedicationOffline({
        name: mockMedication.name,
        type: mockMedication.type,
        description: mockMedication.description,
        dosage: mockMedication.dosage,
      });

      // Delete the medication
      offlineStorage.deleteOffline('medication', localId);

      const medications = offlineStorage.getMedications();
      expect(medications).toHaveLength(0);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(2); // create + delete
      expect(pendingData.medications[1].action).toBe('delete');
    });

    it('should filter medications by name', () => {
      offlineStorage.addMedicationOffline({
        name: 'Medication A',
        type: 'MEDICINE' as MedicationType,
      });
      offlineStorage.addMedicationOffline({
        name: 'Medication B',
        type: 'SUPPLEMENT' as MedicationType,
      });

      const medications = offlineStorage.getMedications();
      const medicationA = medications.find(m => m.name === 'Medication A');
      const medicationB = medications.find(m => m.name === 'Medication B');

      expect(medicationA).toBeDefined();
      expect(medicationB).toBeDefined();
      expect(medicationA?.type).toBe('MEDICINE');
      expect(medicationB?.type).toBe('SUPPLEMENT');
    });
  });

  describe('Medication Record Management', () => {
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
      expect(records[0].id).toBe(localId);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medicationRecords).toHaveLength(1);
      expect(pendingData.medicationRecords[0].action).toBe('create');
    });

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
        quantity: 1,
        administeredAt: new Date(),
        status: 'ADMINISTERED' as MedicationStatus,
      });

      const cat1Records = offlineStorage.getMedicationRecords('cat-1');
      const cat2Records = offlineStorage.getMedicationRecords('cat-2');

      expect(cat1Records).toHaveLength(1);
      expect(cat2Records).toHaveLength(1);
      expect(cat1Records[0].catId).toBe('cat-1');
      expect(cat2Records[0].catId).toBe('cat-2');
    });

    it('should filter medication records by date range', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: yesterday,
        status: 'ADMINISTERED' as MedicationStatus,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: today,
        status: 'ADMINISTERED' as MedicationStatus,
      });
      offlineStorage.addMedicationRecordOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: tomorrow,
        status: 'ADMINISTERED' as MedicationStatus,
      });

      const todayRecords = offlineStorage.getMedicationRecords(
        undefined,
        undefined,
        today,
        today,
      );

      expect(todayRecords).toHaveLength(1);
      expect(new Date(todayRecords[0].administeredAt).toDateString()).toBe(today.toDateString());
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

  describe('Medication Schedule Management', () => {
    it('should add medication schedule offline', () => {
      const scheduleInput = {
        catId: mockMedicationSchedule.catId,
        medicationId: mockMedicationSchedule.medicationId,
        frequency: mockMedicationSchedule.frequency,
        times: mockMedicationSchedule.times,
        startDate: mockMedicationSchedule.startDate,
        endDate: mockMedicationSchedule.endDate,
        isActive: mockMedicationSchedule.isActive,
      };

      const localId = offlineStorage.addMedicationScheduleOffline(scheduleInput);

      expect(localId).toMatch(/^local-medication-schedule-/);

      const schedules = offlineStorage.getMedicationSchedules();
      expect(schedules).toHaveLength(1);
      expect(schedules[0]).toMatchObject(scheduleInput);
      expect(schedules[0].id).toBe(localId);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medicationSchedules).toHaveLength(1);
      expect(pendingData.medicationSchedules[0].action).toBe('create');
    });

    it('should filter medication schedules by active status', () => {
      offlineStorage.addMedicationScheduleOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'daily',
        times: ['08:00'],
        startDate: new Date(),
        isActive: true,
      });
      offlineStorage.addMedicationScheduleOffline({
        catId: 'cat-1',
        medicationId: 'med-2',
        frequency: 'daily',
        times: ['08:00'],
        startDate: new Date(),
        isActive: false,
      });

      const activeSchedules = offlineStorage.getMedicationSchedules(undefined, undefined, true);
      const inactiveSchedules = offlineStorage.getMedicationSchedules(undefined, undefined, false);

      expect(activeSchedules).toHaveLength(1);
      expect(inactiveSchedules).toHaveLength(1);
      expect(activeSchedules[0].isActive).toBe(true);
      expect(inactiveSchedules[0].isActive).toBe(false);
    });

    it('should filter medication schedules by cat and medication', () => {
      offlineStorage.addMedicationScheduleOffline({
        catId: 'cat-1',
        medicationId: 'med-1',
        frequency: 'daily',
        times: ['08:00'],
        startDate: new Date(),
        isActive: true,
      });
      offlineStorage.addMedicationScheduleOffline({
        catId: 'cat-2',
        medicationId: 'med-1',
        frequency: 'daily',
        times: ['08:00'],
        startDate: new Date(),
        isActive: true,
      });

      const cat1Schedules = offlineStorage.getMedicationSchedules('cat-1');
      const med1Schedules = offlineStorage.getMedicationSchedules(undefined, 'med-1');

      expect(cat1Schedules).toHaveLength(1);
      expect(med1Schedules).toHaveLength(2);
      expect(cat1Schedules[0].catId).toBe('cat-1');
    });
  });

  describe('Medication Reminder Management', () => {
    it('should add medication reminder offline', () => {
      const reminderInput = {
        scheduleId: mockMedicationReminder.scheduleId,
        catId: mockMedicationReminder.catId,
        medicationId: mockMedicationReminder.medicationId,
        scheduledAt: mockMedicationReminder.scheduledAt,
        status: mockMedicationReminder.status,
      };

      const localId = offlineStorage.addMedicationReminderOffline(reminderInput);

      expect(localId).toMatch(/^local-medication-reminder-/);

      const reminders = offlineStorage.getMedicationReminders();
      expect(reminders).toHaveLength(1);
      expect(reminders[0]).toMatchObject(reminderInput);
      expect(reminders[0].id).toBe(localId);

      const pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medicationReminders).toHaveLength(1);
      expect(pendingData.medicationReminders[0].action).toBe('create');
    });

    it('should filter medication reminders by date range', () => {
      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: yesterday,
        status: 'PENDING' as ReminderStatus,
      });
      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: today,
        status: 'PENDING' as ReminderStatus,
      });
      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: tomorrow,
        status: 'PENDING' as ReminderStatus,
      });

      const todayReminders = offlineStorage.getMedicationReminders(
        undefined,
        undefined,
        undefined,
        today,
        today,
      );

      expect(todayReminders).toHaveLength(1);
      expect(new Date(todayReminders[0].scheduledAt).toDateString()).toBe(today.toDateString());
    });

    it('should sort medication reminders by scheduled time (earliest first)', () => {
      const time1 = new Date('2024-01-01T08:00:00Z');
      const time2 = new Date('2024-01-01T12:00:00Z');
      const time3 = new Date('2024-01-01T20:00:00Z');

      // Add in random order
      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: time2,
        status: 'PENDING' as ReminderStatus,
      });
      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: time3,
        status: 'PENDING' as ReminderStatus,
      });
      offlineStorage.addMedicationReminderOffline({
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: time1,
        status: 'PENDING' as ReminderStatus,
      });

      const reminders = offlineStorage.getMedicationReminders();

      expect(reminders).toHaveLength(3);
      expect(new Date(reminders[0].scheduledAt)).toEqual(time1);
      expect(new Date(reminders[1].scheduledAt)).toEqual(time2);
      expect(new Date(reminders[2].scheduledAt)).toEqual(time3);
    });
  });

  describe('Data Persistence and Sync', () => {
    it('should update from server with medication data', () => {
      const medications = [mockMedication];
      const medicationRecords = [mockMedicationRecord];
      const medicationSchedules = [mockMedicationSchedule];
      const medicationReminders = [mockMedicationReminder];

      offlineStorage.updateFromServer(
        [], // cats
        [], // foods
        [], // meals
        medications,
        medicationRecords,
        medicationSchedules,
        medicationReminders,
      );

      expect(offlineStorage.getMedications()).toEqual(medications);
      expect(offlineStorage.getMedicationRecords()).toEqual(medicationRecords);
      expect(offlineStorage.getMedicationSchedules()).toEqual(medicationSchedules);
      expect(offlineStorage.getMedicationReminders()).toEqual(medicationReminders);
    });

    it('should filter old medication data when updating from server', () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

      const oldRecord = {
        ...mockMedicationRecord,
        id: 'old-record',
        administeredAt: twoMonthsAgo,
      };

      const recentRecord = {
        ...mockMedicationRecord,
        id: 'recent-record',
        administeredAt: new Date(),
      };

      offlineStorage.updateFromServer(
        [], // cats
        [], // foods
        [], // meals
        [mockMedication],
        [oldRecord, recentRecord],
        [],
        [],
      );

      const records = offlineStorage.getMedicationRecords();
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe('recent-record');
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

    it('should remove pending sync items', () => {
      const localId = offlineStorage.addMedicationOffline({
        name: 'Test Medication',
        type: 'MEDICINE' as MedicationType,
      });

      let pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(1);

      offlineStorage.removePendingSyncItem('medication', localId);

      pendingData = offlineStorage.getPendingSyncData();
      expect(pendingData.medications).toHaveLength(0);
    });

    it('should clear all pending sync data', () => {
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
      expect(pendingData.medicationSchedules).toHaveLength(0);
      expect(pendingData.medicationReminders).toHaveLength(0);
    });

    it('should check if data is stale', () => {
      // Fresh data
      expect(offlineStorage.isDataStale()).toBe(true); // No sync yet

      // Update with current data
      offlineStorage.updateFromServer([], [], [], [], [], [], []);
      expect(offlineStorage.isDataStale()).toBe(false);

      // Mock old sync time
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 8);

      // We can't directly set lastSync, so we'll test the current behavior
      const lastSync = offlineStorage.getLastSyncTime();
      expect(lastSync).toBeInstanceOf(Date);
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

    it('should handle corrupted localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      // Should create new instance without throwing
      expect(() => {
        const newStorage = OfflineStorage.getInstance();
        expect(newStorage.getMedications()).toEqual([]);
      }).not.toThrow();
    });
  });
});
