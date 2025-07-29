import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';

// Import components
import MedicationForm from '~/components/MedicationForm.vue';
import MedicationList from '~/components/MedicationList.vue';
import MedicationRecordForm from '~/components/MedicationRecordForm.vue';
import MedicationCalendar from '~/components/MedicationCalendar.vue';
import MedicationReminder from '~/components/MedicationReminder.vue';

// Import stores
import { useMedicationsStore } from '~/stores/medications';
import { useCatsStore } from '~/stores/cats';

// Import types
import { MedicationType, MedicationStatus, ReminderStatus } from '~/types/medication';
import type { Medication, MedicationRecord, MedicationReminder as MedicationReminderType } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Mock composables
vi.mock('~/composables/useSync', () => ({
  useSync: () => ({
    syncStatus: { value: { isOnline: true } },
    offlineOperations: {
      addMedication: vi.fn(),
      updateMedication: vi.fn(),
      deleteMedication: vi.fn(),
      addMedicationRecord: vi.fn(),
      updateMedicationRecord: vi.fn(),
      deleteMedicationRecord: vi.fn(),
    },
  }),
}));

vi.mock('~/composables/useToast', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}));

// Mock $fetch
global.$fetch = vi.fn();

describe('Medication Component Integration', () => {
  let pinia: ReturnType<typeof createPinia>;
  let medicationsStore: ReturnType<typeof useMedicationsStore>;
  let catsStore: ReturnType<typeof useCatsStore>;

  // Test data
  const mockCats: Cat[] = [
    {
      id: 'cat-1',
      name: 'みけ',
      birthdate: new Date('2020-01-01'),
      weight: 4.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat-2',
      name: 'しろ',
      birthdate: new Date('2019-06-15'),
      weight: 3.8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockMedications: Medication[] = [
    {
      id: 'med-1',
      name: 'テスト薬A',
      type: MedicationType.MEDICINE,
      description: 'テスト用の薬です',
      dosage: '1日1回',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'med-2',
      name: 'サプリB',
      type: MedicationType.SUPPLEMENT,
      description: 'テスト用のサプリです',
      dosage: '1日2回',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockRecords: MedicationRecord[] = [
    {
      id: 'record-1',
      catId: 'cat-1',
      medicationId: 'med-1',
      quantity: 1,
      administeredAt: new Date('2024-01-15T08:00:00Z'),
      status: MedicationStatus.ADMINISTERED,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'record-2',
      catId: 'cat-2',
      medicationId: 'med-2',
      quantity: 2,
      administeredAt: new Date('2024-01-15T20:00:00Z'),
      status: MedicationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    medicationsStore = useMedicationsStore();
    catsStore = useCatsStore();

    // Setup store state
    medicationsStore.medications = mockMedications;
    medicationsStore.records = mockRecords;
    medicationsStore.reminders = [];
    medicationsStore.loading = false;
    medicationsStore.error = null;

    catsStore.cats = mockCats;

    // Mock store methods
    vi.spyOn(medicationsStore, 'fetchMedications').mockResolvedValue(mockMedications);
    vi.spyOn(medicationsStore, 'createMedication').mockImplementation(async (input) => {
      const newMedication: Medication = {
        id: `med-${Date.now()}`,
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      medicationsStore.medications.push(newMedication);
      return newMedication;
    });
    vi.spyOn(medicationsStore, 'updateMedication').mockImplementation(async (id, input) => {
      const index = medicationsStore.medications.findIndex(m => m.id === id);
      if (index !== -1) {
        medicationsStore.medications[index] = {
          ...medicationsStore.medications[index],
          ...input,
          updatedAt: new Date(),
        };
        return medicationsStore.medications[index];
      }
      throw new Error('Medication not found');
    });
    vi.spyOn(medicationsStore, 'deleteMedication').mockImplementation(async (id) => {
      const index = medicationsStore.medications.findIndex(m => m.id === id);
      if (index !== -1) {
        medicationsStore.medications.splice(index, 1);
      }
    });

    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockResolvedValue(mockRecords);
    vi.spyOn(medicationsStore, 'createMedicationRecord').mockImplementation(async (input) => {
      const newRecord: MedicationRecord = {
        id: `record-${Date.now()}`,
        ...input,
        status: input.status || MedicationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      medicationsStore.records.push(newRecord);
      return newRecord;
    });

    vi.spyOn(catsStore, 'fetchCats').mockResolvedValue(mockCats);
  });

  describe('MedicationForm and MedicationList Integration', () => {
    it('should create medication through form and update list', async () => {
      // Mount MedicationList component
      const listWrapper = mount(MedicationList, {
        global: {
          plugins: [pinia],
        },
      });

      // Mount MedicationForm component
      const formWrapper = mount(MedicationForm, {
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Verify initial medications are displayed in list
      expect(listWrapper.findAll('.medication-item')).toHaveLength(2);
      expect(listWrapper.text()).toContain('テスト薬A');
      expect(listWrapper.text()).toContain('サプリB');

      // Fill out form
      await formWrapper.find('input[name="name"]').setValue('新しい薬');
      await formWrapper.find('select[name="type"]').setValue(MedicationType.VITAMIN);
      await formWrapper.find('textarea[name="description"]').setValue('新しい薬の説明');
      await formWrapper.find('input[name="dosage"]').setValue('1日3回');

      // Submit form
      await formWrapper.find('form').trigger('submit');
      await nextTick();

      // Verify medication was created
      expect(medicationsStore.createMedication).toHaveBeenCalledWith({
        name: '新しい薬',
        type: MedicationType.VITAMIN,
        description: '新しい薬の説明',
        dosage: '1日3回',
      });

      // Verify list is updated
      expect(listWrapper.findAll('.medication-item')).toHaveLength(3);
      expect(listWrapper.text()).toContain('新しい薬');
    });

    it('should edit medication through list and update form', async () => {
      // Mount components
      const listWrapper = mount(MedicationList, {
        global: {
          plugins: [pinia],
        },
      });

      const formWrapper = mount(MedicationForm, {
        props: {
          medicationId: 'med-1',
        },
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Verify form is populated with existing medication data
      expect(formWrapper.find('input[name="name"]').element.value).toBe('テスト薬A');
      expect(formWrapper.find('select[name="type"]').element.value).toBe(MedicationType.MEDICINE);
      expect(formWrapper.find('textarea[name="description"]').element.value).toBe('テスト用の薬です');
      expect(formWrapper.find('input[name="dosage"]').element.value).toBe('1日1回');

      // Update form
      await formWrapper.find('input[name="name"]').setValue('更新されたテスト薬A');
      await formWrapper.find('input[name="dosage"]').setValue('1日2回');

      // Submit form
      await formWrapper.find('form').trigger('submit');
      await nextTick();

      // Verify medication was updated
      expect(medicationsStore.updateMedication).toHaveBeenCalledWith('med-1', {
        name: '更新されたテスト薬A',
        type: MedicationType.MEDICINE,
        description: 'テスト用の薬です',
        dosage: '1日2回',
      });

      // Verify list shows updated medication
      expect(listWrapper.text()).toContain('更新されたテスト薬A');
    });

    it('should delete medication from list', async () => {
      // Mount MedicationList component
      const listWrapper = mount(MedicationList, {
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Verify initial state
      expect(listWrapper.findAll('.medication-item')).toHaveLength(2);

      // Find and click delete button for first medication
      const deleteButton = listWrapper.find('.medication-item .delete-button');
      await deleteButton.trigger('click');
      await nextTick();

      // Verify delete confirmation dialog appears
      const confirmDialog = listWrapper.find('.confirm-dialog');
      expect(confirmDialog.exists()).toBe(true);

      // Confirm deletion
      await confirmDialog.find('.confirm-button').trigger('click');
      await nextTick();

      // Verify medication was deleted
      expect(medicationsStore.deleteMedication).toHaveBeenCalledWith('med-1');

      // Verify list is updated
      expect(listWrapper.findAll('.medication-item')).toHaveLength(1);
      expect(listWrapper.text()).not.toContain('テスト薬A');
    });
  });

  describe('MedicationRecordForm and Calendar Integration', () => {
    it('should create medication record through form and update calendar', async () => {
      // Mount MedicationCalendar component
      const calendarWrapper = mount(MedicationCalendar, {
        props: {
          initialDate: new Date('2024-01-15'),
        },
        global: {
          plugins: [pinia],
        },
      });

      // Mount MedicationRecordForm component
      const formWrapper = mount(MedicationRecordForm, {
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Fill out record form
      await formWrapper.find('select[name="catId"]').setValue('cat-1');
      await formWrapper.find('select[name="medicationId"]').setValue('med-1');
      await formWrapper.find('input[name="quantity"]').setValue('2');
      await formWrapper.find('input[name="administeredAt"]').setValue('2024-01-16T10:00');
      await formWrapper.find('select[name="status"]').setValue(MedicationStatus.ADMINISTERED);
      await formWrapper.find('textarea[name="notes"]').setValue('新しい投与記録');

      // Submit form
      await formWrapper.find('form').trigger('submit');
      await nextTick();

      // Verify record was created
      expect(medicationsStore.createMedicationRecord).toHaveBeenCalledWith({
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 2,
        administeredAt: new Date('2024-01-16T10:00'),
        status: MedicationStatus.ADMINISTERED,
        notes: '新しい投与記録',
      });

      // Verify calendar shows new record
      expect(medicationsStore.records).toHaveLength(3);
    });

    it('should handle calendar date selection and form integration', async () => {
      // Mount components
      const calendarWrapper = mount(MedicationCalendar, {
        props: {
          initialDate: new Date('2024-01-15'),
        },
        global: {
          plugins: [pinia],
        },
      });

      const formWrapper = mount(MedicationRecordForm, {
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Click on a calendar date
      const calendarDay = calendarWrapper.find('.calendar-day[data-date="2024-01-16"]');
      await calendarDay.trigger('click');
      await nextTick();

      // Verify calendar emits date selection event
      expect(calendarWrapper.emitted('dateSelected')).toBeTruthy();
      const emittedEvents = calendarWrapper.emitted('dateSelected') as any[];
      expect(emittedEvents[0][0]).toBe('2024-01-16');

      // Simulate form receiving the selected date
      await formWrapper.setProps({ selectedDate: '2024-01-16' });
      await nextTick();

      // Verify form date input is updated
      const dateInput = formWrapper.find('input[name="administeredAt"]');
      expect(dateInput.element.value).toContain('2024-01-16');
    });
  });

  describe('MedicationReminder Integration', () => {
    it('should handle reminder acknowledgment and record creation', async () => {
      // Create mock reminder
      const mockReminder: MedicationReminderType = {
        id: 'reminder-1',
        scheduleId: 'schedule-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        scheduledAt: new Date('2024-01-15T08:00:00Z'),
        status: ReminderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      medicationsStore.reminders = [mockReminder];

      // Mock reminder actions
      vi.spyOn(medicationsStore, 'acknowledgeReminder').mockImplementation(async (id) => {
        const reminder = medicationsStore.reminders.find(r => r.id === id);
        if (reminder) {
          reminder.status = ReminderStatus.ACKNOWLEDGED;
        }
      });

      // Mount MedicationReminder component
      const reminderWrapper = mount(MedicationReminder, {
        props: {
          reminder: mockReminder,
        },
        global: {
          plugins: [pinia],
        },
      });

      // Mount MedicationRecordForm component
      const formWrapper = mount(MedicationRecordForm, {
        props: {
          reminderId: 'reminder-1',
        },
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Verify reminder is displayed
      expect(reminderWrapper.text()).toContain('テスト薬A');
      expect(reminderWrapper.text()).toContain('みけ');

      // Click acknowledge button on reminder
      const acknowledgeButton = reminderWrapper.find('.acknowledge-button');
      await acknowledgeButton.trigger('click');
      await nextTick();

      // Verify reminder was acknowledged
      expect(medicationsStore.acknowledgeReminder).toHaveBeenCalledWith('reminder-1');

      // Verify form is pre-populated with reminder data
      expect(formWrapper.find('select[name="catId"]').element.value).toBe('cat-1');
      expect(formWrapper.find('select[name="medicationId"]').element.value).toBe('med-1');

      // Fill remaining form fields and submit
      await formWrapper.find('input[name="quantity"]').setValue('1');
      await formWrapper.find('select[name="status"]').setValue(MedicationStatus.ADMINISTERED);
      await formWrapper.find('form').trigger('submit');
      await nextTick();

      // Verify record was created
      expect(medicationsStore.createMedicationRecord).toHaveBeenCalledWith(
        expect.objectContaining({
          catId: 'cat-1',
          medicationId: 'med-1',
          quantity: 1,
          status: MedicationStatus.ADMINISTERED,
        }),
      );
    });

    it('should handle reminder snoozing', async () => {
      const mockReminder: MedicationReminderType = {
        id: 'reminder-2',
        scheduleId: 'schedule-1',
        catId: 'cat-2',
        medicationId: 'med-2',
        scheduledAt: new Date('2024-01-15T20:00:00Z'),
        status: ReminderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      medicationsStore.reminders = [mockReminder];

      // Mock snooze action
      vi.spyOn(medicationsStore, 'snoozeReminder').mockImplementation(async (id, minutes) => {
        const reminder = medicationsStore.reminders.find(r => r.id === id);
        if (reminder) {
          reminder.status = ReminderStatus.SNOOZED;
          reminder.scheduledAt = new Date(reminder.scheduledAt.getTime() + minutes * 60000);
        }
      });

      // Mount MedicationReminder component
      const reminderWrapper = mount(MedicationReminder, {
        props: {
          reminder: mockReminder,
        },
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Click snooze button
      const snoozeButton = reminderWrapper.find('.snooze-button');
      await snoozeButton.trigger('click');
      await nextTick();

      // Select snooze duration (15 minutes)
      const snoozeSelect = reminderWrapper.find('.snooze-select');
      await snoozeSelect.setValue('15');
      await nextTick();

      // Confirm snooze
      const confirmSnoozeButton = reminderWrapper.find('.confirm-snooze-button');
      await confirmSnoozeButton.trigger('click');
      await nextTick();

      // Verify reminder was snoozed
      expect(medicationsStore.snoozeReminder).toHaveBeenCalledWith('reminder-2', 15);
    });
  });

  describe('Multi-Component Workflow Integration', () => {
    it('should handle complete medication administration workflow', async () => {
      // Mount all components
      const listWrapper = mount(MedicationList, {
        global: {
          plugins: [pinia],
        },
      });

      const calendarWrapper = mount(MedicationCalendar, {
        props: {
          initialDate: new Date('2024-01-15'),
        },
        global: {
          plugins: [pinia],
        },
      });

      const recordFormWrapper = mount(MedicationRecordForm, {
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Step 1: Verify medications are loaded in list
      expect(listWrapper.findAll('.medication-item')).toHaveLength(2);

      // Step 2: Select date on calendar
      const calendarDay = calendarWrapper.find('.calendar-day[data-date="2024-01-16"]');
      await calendarDay.trigger('click');
      await nextTick();

      // Step 3: Create medication record
      await recordFormWrapper.find('select[name="catId"]').setValue('cat-1');
      await recordFormWrapper.find('select[name="medicationId"]').setValue('med-1');
      await recordFormWrapper.find('input[name="quantity"]').setValue('1');
      await recordFormWrapper.find('input[name="administeredAt"]').setValue('2024-01-16T08:00');
      await recordFormWrapper.find('select[name="status"]').setValue(MedicationStatus.ADMINISTERED);

      await recordFormWrapper.find('form').trigger('submit');
      await nextTick();

      // Step 4: Verify record was created and calendar is updated
      expect(medicationsStore.createMedicationRecord).toHaveBeenCalled();
      expect(medicationsStore.records).toHaveLength(3);

      // Step 5: Verify calendar shows the new record
      const updatedCalendarDay = calendarWrapper.find('.calendar-day[data-date="2024-01-16"]');
      expect(updatedCalendarDay.classes()).toContain('has-records');
    });

    it('should handle error states across components', async () => {
      // Simulate error state
      medicationsStore.error = 'テストエラー';
      medicationsStore.loading = false;

      // Mount components
      const listWrapper = mount(MedicationList, {
        global: {
          plugins: [pinia],
        },
      });

      const formWrapper = mount(MedicationForm, {
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Verify error is displayed in list
      expect(listWrapper.find('.error-message').text()).toContain('テストエラー');

      // Verify form is disabled during error state
      expect(formWrapper.find('form').classes()).toContain('disabled');
      expect(formWrapper.find('button[type="submit"]').attributes('disabled')).toBeDefined();
    });

    it('should handle loading states across components', async () => {
      // Simulate loading state
      medicationsStore.loading = true;
      medicationsStore.error = null;

      // Mount components
      const listWrapper = mount(MedicationList, {
        global: {
          plugins: [pinia],
        },
      });

      const calendarWrapper = mount(MedicationCalendar, {
        props: {
          initialDate: new Date('2024-01-15'),
        },
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Verify loading indicators are shown
      expect(listWrapper.find('.loading-spinner').exists()).toBe(true);
      expect(calendarWrapper.find('.loading-overlay').exists()).toBe(true);

      // Verify interactive elements are disabled
      expect(listWrapper.find('.add-medication-button').attributes('disabled')).toBeDefined();
    });
  });

  describe('Data Consistency Integration', () => {
    it('should maintain data consistency across components', async () => {
      // Mount multiple components that share data
      const listWrapper = mount(MedicationList, {
        global: {
          plugins: [pinia],
        },
      });

      const calendarWrapper = mount(MedicationCalendar, {
        props: {
          initialDate: new Date('2024-01-15'),
        },
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Verify both components show same medication data
      expect(listWrapper.findAll('.medication-item')).toHaveLength(2);

      // Update medication through store
      await medicationsStore.updateMedication('med-1', {
        name: '一貫性テスト薬',
        dosage: '1日4回',
      });

      await nextTick();

      // Verify both components reflect the update
      expect(listWrapper.text()).toContain('一貫性テスト薬');

      // Calendar should also reflect updated medication name in records
      const calendarRecords = calendarWrapper.findAll('.record-item');
      const updatedRecord = calendarRecords.find(record =>
        record.text().includes('一貫性テスト薬'),
      );
      expect(updatedRecord).toBeDefined();
    });

    it('should handle concurrent updates properly', async () => {
      // Mount components
      const formWrapper1 = mount(MedicationForm, {
        props: {
          medicationId: 'med-1',
        },
        global: {
          plugins: [pinia],
        },
      });

      const formWrapper2 = mount(MedicationForm, {
        props: {
          medicationId: 'med-1',
        },
        global: {
          plugins: [pinia],
        },
      });

      await nextTick();

      // Both forms should show same initial data
      expect(formWrapper1.find('input[name="name"]').element.value).toBe('テスト薬A');
      expect(formWrapper2.find('input[name="name"]').element.value).toBe('テスト薬A');

      // Update through first form
      await formWrapper1.find('input[name="name"]').setValue('フォーム1更新');
      await formWrapper1.find('form').trigger('submit');
      await nextTick();

      // Second form should reflect the update
      expect(formWrapper2.find('input[name="name"]').element.value).toBe('フォーム1更新');
    });
  });
});
