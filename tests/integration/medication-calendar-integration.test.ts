import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MedicationCalendar from '~/components/MedicationCalendar.vue';
import { useMedicationsStore } from '~/stores/medications';
import { useCatsStore } from '~/stores/cats';
import type { MedicationRecord, MedicationReminder, Medication } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';
import { MedicationType, MedicationStatus, ReminderStatus } from '~/types/medication';

// Mock the composables
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

// Mock $fetch
global.$fetch = vi.fn();

describe('MedicationCalendar Integration', () => {
  let pinia: ReturnType<typeof createPinia>;
  let medicationsStore: ReturnType<typeof useMedicationsStore>;
  let catsStore: ReturnType<typeof useCatsStore>;

  // Test data
  const mockCats: Cat[] = [
    {
      id: 1,
      name: 'みけ',
      birthdate: new Date('2020-01-01'),
      weight: 4.5,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'しろ',
      birthdate: new Date('2019-06-15'),
      weight: 3.8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockMedications: Medication[] = [
    {
      id: 1,
      name: 'テスト薬A',
      type: MedicationType.MEDICINE,
      description: 'テスト用の薬です',
      dosage: '1日1回',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 2,
      name: 'サプリB',
      type: MedicationType.SUPPLEMENT,
      description: 'テスト用のサプリです',
      dosage: '1日2回',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  // Helper function to wait for component to be ready
  const waitForComponent = async (wrapper: any) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    await wrapper.vm.$nextTick();
  };

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    medicationsStore = useMedicationsStore();
    catsStore = useCatsStore();

    // Setup store state
    medicationsStore.medications = mockMedications;
    medicationsStore.records = [];
    medicationsStore.reminders = [];
    medicationsStore.loading = false;
    catsStore.cats = mockCats;

    // Mock store methods
    vi.spyOn(medicationsStore, 'fetchMedications').mockResolvedValue(mockMedications);
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockResolvedValue([]);
    vi.spyOn(medicationsStore, 'fetchMedicationReminders').mockResolvedValue([]);
    vi.spyOn(catsStore, 'fetchCats').mockResolvedValue(mockCats);
  });

  it('integrates calendar with medication records store', async () => {
    const testDate = new Date('2024-01-15T10:00:00');
    const testRecords: MedicationRecord[] = [
      {
        id: 1,
        catId: 1,
        medicationId: 1,
        quantity: 1,
        administeredAt: testDate,
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        catId: 2,
        medicationId: 2,
        quantity: 2,
        administeredAt: testDate,
        status: MedicationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    // Set up records in store
    medicationsStore.records = testRecords;
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockResolvedValue(testRecords);

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Verify that fetchMedicationRecords was called with date range
    expect(medicationsStore.fetchMedicationRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );

    // Find and click on the day with records
    const calendarDays = wrapper.findAll('.calendar-day.current-month');
    let targetDay = null;

    for (const day of calendarDays) {
      await day.trigger('click');
      await wrapper.vm.$nextTick();

      const recordsSection = wrapper.find('.records-section');
      if (recordsSection.exists()) {
        targetDay = day;
        break;
      }
    }

    expect(targetDay).not.toBeNull();

    // Verify records are displayed
    const recordItems = wrapper.findAll('.record-item');
    expect(recordItems.length).toBe(2);

    // Verify record details
    const firstRecord = recordItems[0];
    expect(firstRecord.find('.medication-name').text()).toBe('テスト薬A');
    expect(firstRecord.find('.cat-name').text()).toBe('みけ');
    expect(firstRecord.find('.quantity').text()).toBe('1個');

    const secondRecord = recordItems[1];
    expect(secondRecord.find('.medication-name').text()).toBe('サプリB');
    expect(secondRecord.find('.cat-name').text()).toBe('しろ');
    expect(secondRecord.find('.quantity').text()).toBe('2個');
  });

  it('implements date-based filtering correctly', async () => {
    const date1 = new Date('2024-01-15T10:00:00');
    const date2 = new Date('2024-01-16T10:00:00');

    const testRecords: MedicationRecord[] = [
      {
        id: 1,
        catId: 1,
        medicationId: 1,
        quantity: 1,
        administeredAt: date1,
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        catId: 1,
        medicationId: 2,
        quantity: 1,
        administeredAt: date2,
        status: MedicationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    medicationsStore.records = testRecords;
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockResolvedValue(testRecords);

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: date1,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Click on different days and verify correct records are shown
    const calendarDays = wrapper.findAll('.calendar-day.current-month');

    // Find day with first record
    let day1Found = false;
    let day2Found = false;

    for (const day of calendarDays) {
      await day.trigger('click');
      await wrapper.vm.$nextTick();

      const recordItems = wrapper.findAll('.record-item');

      if (recordItems.length === 1) {
        const medicationName = recordItems[0].find('.medication-name').text();
        if (medicationName === 'テスト薬A') {
          day1Found = true;
        }
        else if (medicationName === 'サプリB') {
          day2Found = true;
        }
      }
    }

    // We should find both days with their respective records
    expect(day1Found).toBe(true);
    expect(day2Found).toBe(true);
  });

  it('handles cat filtering integration', async () => {
    const testDate = new Date('2024-01-15T10:00:00');
    const testRecords: MedicationRecord[] = [
      {
        id: 1,
        catId: 1,
        medicationId: 1,
        quantity: 1,
        administeredAt: testDate,
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        catId: 2,
        medicationId: 2,
        quantity: 2,
        administeredAt: testDate,
        status: MedicationStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    medicationsStore.records = testRecords;
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockResolvedValue(testRecords);

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Select a specific cat
    const catSelect = wrapper.find('.cat-select');
    await catSelect.setValue('cat-1');

    // Verify that fetchMedicationRecords was called with catId filter
    expect(medicationsStore.fetchMedicationRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        catId: 1,
      }),
    );
  });

  it('emits recordCreate event with correct date', async () => {
    const testDate = new Date('2024-01-15T10:00:00');

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Click on a calendar day
    const firstDay = wrapper.find('.calendar-day.current-month');
    await firstDay.trigger('click');

    // Click create record button
    const createButton = wrapper.find('.action-button.primary');
    await createButton.trigger('click');

    // Verify recordCreate event was emitted with correct date
    expect(wrapper.emitted('recordCreate')).toBeTruthy();
    const emittedEvents = wrapper.emitted('recordCreate') as any[];
    expect(emittedEvents[0]).toBeDefined();
    expect(emittedEvents[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}$/); // ISO date format
  });

  it('displays visual indicators for medication status', async () => {
    const testDate = new Date('2024-01-15T10:00:00');
    const testRecords: MedicationRecord[] = [
      {
        id: 1,
        catId: 1,
        medicationId: 1,
        quantity: 1,
        administeredAt: testDate,
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const testReminders: MedicationReminder[] = [
      {
        id: 1,
        scheduleId: 1,
        catId: 1,
        medicationId: 1,
        scheduledAt: testDate,
        status: ReminderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    medicationsStore.records = testRecords;
    medicationsStore.reminders = testReminders;
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockResolvedValue(testRecords);
    vi.spyOn(medicationsStore, 'fetchMedicationReminders').mockResolvedValue(testReminders);

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Find day with administered medication
    const dayWithAdministered = wrapper.find('.calendar-day.has-administered');
    expect(dayWithAdministered.exists()).toBe(true);

    // Find day with pending reminder
    const dayWithPending = wrapper.find('.calendar-day.has-pending');
    expect(dayWithPending.exists()).toBe(true);

    // Check for visual indicators
    const administeredIndicator = dayWithAdministered.find('.indicator.administered');
    expect(administeredIndicator.exists()).toBe(true);

    const pendingIndicator = dayWithPending.find('.indicator.pending');
    expect(pendingIndicator.exists()).toBe(true);
  });

  it('handles month navigation with data refresh', async () => {
    const initialDate = new Date('2024-01-15');

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Clear previous calls
    vi.clearAllMocks();

    // Navigate to next month
    const nextButton = wrapper.findAll('.nav-button')[1];
    await nextButton.trigger('click');
    await waitForComponent(wrapper);

    // Verify that data was refetched for the new month
    expect(medicationsStore.fetchMedicationRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );

    expect(medicationsStore.fetchMedicationReminders).toHaveBeenCalledWith(
      expect.objectContaining({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      }),
    );

    // Verify month title changed
    const title = wrapper.find('.calendar-title');
    expect(title.text()).toContain('2024年2月');
  });

  it('integrates with reminders correctly', async () => {
    const testDate = new Date('2024-01-16T08:00:00');
    const testReminders: MedicationReminder[] = [
      {
        id: 1,
        scheduleId: 1,
        catId: 1,
        medicationId: 1,
        scheduledAt: testDate,
        status: ReminderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    medicationsStore.reminders = testReminders;
    vi.spyOn(medicationsStore, 'fetchMedicationReminders').mockResolvedValue(testReminders);

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Find and click on the day with reminders
    const calendarDays = wrapper.findAll('.calendar-day.current-month');
    let targetDay = null;

    for (const day of calendarDays) {
      await day.trigger('click');
      await wrapper.vm.$nextTick();

      const remindersSection = wrapper.find('.reminders-section');
      if (remindersSection.exists()) {
        targetDay = day;
        break;
      }
    }

    expect(targetDay).not.toBeNull();

    // Verify reminders are displayed
    const reminderItems = wrapper.findAll('.reminder-item');
    expect(reminderItems.length).toBe(1);

    // Verify reminder details
    const reminder = reminderItems[0];
    expect(reminder.find('.medication-name').text()).toBe('テスト薬A');
    expect(reminder.find('.cat-name').text()).toBe('みけ');
  });
});
