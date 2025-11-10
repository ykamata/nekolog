import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useMedicationsStore } from '~/stores/medications';
import type {
  Medication,
  MedicationRecord,
  MedicationReminder,
  MedicationType,
  MedicationStatus,
  ReminderStatus,
} from '~/types/medication';

describe('Medications Store - Cat Filtering', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  const createTestMedication = (
    overrides?: Partial<Medication>,
  ): Medication => ({
    id: 1,
    name: 'テスト薬',
    type: 'MEDICINE' as MedicationType,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createTestMedicationRecord = (
    overrides?: Partial<MedicationRecord>,
  ): MedicationRecord => ({
    id: 1,
    catId: 1,
    medicationId: 1,
    quantity: 1,
    administeredAt: new Date(),
    status: 'ADMINISTERED' as MedicationStatus,
    notes: 'テストメモ',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  const createTestMedicationReminder = (
    overrides?: Partial<MedicationReminder>,
  ): MedicationReminder => ({
    id: 1,
    scheduleId: 1,
    catId: 1,
    medicationId: 1,
    scheduledAt: new Date(),
    status: 'PENDING' as ReminderStatus,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  describe('Cat-specific Record Getters', () => {
    it('should get medication records by cat and medication', () => {
      const store = useMedicationsStore();

      const records = [
        createTestMedicationRecord({ id: 1, catId: 1, medicationId: 1 }),
        createTestMedicationRecord({ id: 2, catId: 1, medicationId: 2 }),
        createTestMedicationRecord({ id: 3, catId: 2, medicationId: 1 }),
      ];

      store.medicationRecords = records;

      const result = store.getMedicationRecordsByCatAndMedication('cat-1', 1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('record-1');
    });

    it('should get medication records by cat and status', () => {
      const store = useMedicationsStore();

      const records = [
        createTestMedicationRecord({ id: 1, catId: 1, status: 'ADMINISTERED' }),
        createTestMedicationRecord({ id: 2, catId: 1, status: 'PENDING' }),
        createTestMedicationRecord({ id: 3, catId: 2, status: 'ADMINISTERED' }),
      ];

      store.medicationRecords = records;

      const result = store.getMedicationRecordsByCatAndStatus('cat-1', 'ADMINISTERED');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('record-1');
    });

    it('should get medication records by cat and date range', () => {
      const store = useMedicationsStore();

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const records = [
        createTestMedicationRecord({
          id: 1,
          catId: 1,
          administeredAt: today,
        }),
        createTestMedicationRecord({
          id: 2,
          catId: 1,
          administeredAt: tomorrow,
        }),
        createTestMedicationRecord({
          id: 3,
          catId: 2,
          administeredAt: today,
        }),
      ];

      store.medicationRecords = records;

      const startDate = yesterday;
      const endDate = today;
      const result = store.getMedicationRecordsByCatAndDateRange('cat-1', startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('record-1');
    });

    it('should get cat medication summary', () => {
      const store = useMedicationsStore();

      const now = new Date();
      const earlier = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago

      const records = [
        createTestMedicationRecord({
          id: 1,
          catId: 1,
          medicationId: 1,
          status: 'ADMINISTERED',
          administeredAt: now,
        }),
        createTestMedicationRecord({
          id: 2,
          catId: 1,
          medicationId: 2,
          status: 'PENDING',
          administeredAt: earlier,
        }),
        createTestMedicationRecord({
          id: 3,
          catId: 1,
          medicationId: 1,
          status: 'ADMINISTERED',
          administeredAt: earlier,
        }),
        createTestMedicationRecord({
          id: 4,
          catId: 2,
          medicationId: 1,
          status: 'ADMINISTERED',
          administeredAt: now,
        }),
      ];

      const reminders = [
        createTestMedicationReminder({
          id: 1,
          catId: 1,
          status: 'PENDING',
        }),
        createTestMedicationReminder({
          id: 2,
          catId: 1,
          status: 'ACKNOWLEDGED',
        }),
      ];

      store.medicationRecords = records;
      store.medicationReminders = reminders;

      const summary = store.getCatMedicationSummary('cat-1');

      expect(summary.totalRecords).toBe(3);
      expect(summary.pendingRecords).toBe(1);
      expect(summary.pendingReminders).toBe(1);
      expect(summary.lastAdministered).toEqual(now);
    });

    it('should handle empty records for cat medication summary', () => {
      const store = useMedicationsStore();
      store.medicationRecords = [];
      store.medicationReminders = [];

      const summary = store.getCatMedicationSummary('cat-1');

      expect(summary.totalRecords).toBe(0);
      expect(summary.pendingRecords).toBe(0);
      expect(summary.pendingReminders).toBe(0);
      expect(summary.lastAdministered).toBe(null);
    });
  });

  describe('Cat-specific Reminder Getters', () => {
    it('should get pending reminders by cat', () => {
      const store = useMedicationsStore();

      const reminders = [
        createTestMedicationReminder({ id: 1, catId: 1, status: 'PENDING' }),
        createTestMedicationReminder({ id: 2, catId: 1, status: 'ACKNOWLEDGED' }),
        createTestMedicationReminder({ id: 3, catId: 2, status: 'PENDING' }),
      ];

      store.medicationReminders = reminders;

      const result = store.getPendingRemindersByCat('cat-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should get today\'s reminders by cat', () => {
      const store = useMedicationsStore();

      const today = new Date();
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const reminders = [
        createTestMedicationReminder({
          id: 1,
          catId: 1,
          scheduledAt: today,
        }),
        createTestMedicationReminder({
          id: 2,
          catId: 1,
          scheduledAt: yesterday,
        }),
        createTestMedicationReminder({
          id: 3,
          catId: 1,
          scheduledAt: tomorrow,
        }),
        createTestMedicationReminder({
          id: 4,
          catId: 2,
          scheduledAt: today,
        }),
      ];

      store.medicationReminders = reminders;

      const result = store.getTodaysRemindersByCat('cat-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
    });

    it('should get upcoming reminders by cat', () => {
      const store = useMedicationsStore();

      const now = new Date();
      const inThirtyMinutes = new Date(now.getTime() + 30 * 60 * 1000);
      const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const past = new Date(now.getTime() - 30 * 60 * 1000);

      const reminders = [
        createTestMedicationReminder({
          id: 1,
          catId: 1,
          scheduledAt: inThirtyMinutes,
          status: 'PENDING',
        }),
        createTestMedicationReminder({
          id: 2,
          catId: 1,
          scheduledAt: inTwoHours,
          status: 'PENDING',
        }),
        createTestMedicationReminder({
          id: 3,
          catId: 1,
          scheduledAt: past,
          status: 'PENDING',
        }),
        createTestMedicationReminder({
          id: 4,
          catId: 1,
          scheduledAt: inThirtyMinutes,
          status: 'ACKNOWLEDGED',
        }),
        createTestMedicationReminder({
          id: 5,
          catId: 2,
          scheduledAt: inThirtyMinutes,
          status: 'PENDING',
        }),
      ];

      store.medicationReminders = reminders;

      // Test with default 24 hours - should include both upcoming reminders
      const result = store.getUpcomingRemindersByCat('cat-1');
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual([1, 'reminder-2']);

      // Test with 1 hour - should only include the first reminder
      const resultOneHour = store.getUpcomingRemindersByCat('cat-1', 1);
      expect(resultOneHour).toHaveLength(1);
      expect(resultOneHour[0].id).toBe(1);
    });
  });

  describe('Existing Cat Filtering Getters', () => {
    it('should get medication records by cat', () => {
      const store = useMedicationsStore();

      const records = [
        createTestMedicationRecord({ id: 1, catId: 1 }),
        createTestMedicationRecord({ id: 2, catId: 2 }),
        createTestMedicationRecord({ id: 3, catId: 1 }),
      ];

      store.medicationRecords = records;

      const result = store.getMedicationRecordsByCat('cat-1');
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual(['record-1', 'record-3']);
    });

    it('should get medication reminders by cat', () => {
      const store = useMedicationsStore();

      const reminders = [
        createTestMedicationReminder({ id: 1, catId: 1 }),
        createTestMedicationReminder({ id: 2, catId: 2 }),
        createTestMedicationReminder({ id: 3, catId: 1 }),
      ];

      store.medicationReminders = reminders;

      const result = store.getMedicationRemindersByCat('cat-1');
      expect(result).toHaveLength(2);
      expect(result.map(r => r.id)).toEqual([1, 'reminder-3']);
    });
  });
});
