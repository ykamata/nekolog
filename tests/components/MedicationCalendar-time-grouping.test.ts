import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MedicationCalendar from '~/components/MedicationCalendar.vue';
import { useMedicationsStore } from '~/stores/medications';
import { useCatsStore } from '~/stores/cats';
import type { MedicationRecord, Medication } from '~/types/medication';
import type { Cat } from '~/types/cat-meal';
import { MedicationType, MedicationStatus } from '~/types/medication';

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

describe('MedicationCalendar - Time Grouping', () => {
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
  ];

  // Helper function to wait for component to be ready
  const waitForComponent = async (wrapper: unknown) => {
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

  it('groups medication records by time periods', async () => {
    const testDate = new Date('2024-01-15');
    const testRecords: MedicationRecord[] = [
      {
        id: 'record-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T08:00:00'), // Morning
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-2',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T14:00:00'), // Afternoon
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-3',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T20:00:00'), // Evening
        status: MedicationStatus.ADMINISTERED,
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

    // Check that time period groups are displayed
    const timePeriodGroups = wrapper.findAll('.time-period-group');
    expect(timePeriodGroups.length).toBeGreaterThan(0);

    // Check that time period titles are displayed (only for periods with records)
    const timePeriodTitles = wrapper.findAll('.time-period-title');
    expect(timePeriodTitles.length).toBeGreaterThan(0);

    const titleTexts = timePeriodTitles.map(title => title.text());
    // Should contain all three periods since we have records for all
    expect(titleTexts).toContain('朝');
    expect(titleTexts).toContain('昼');
    expect(titleTexts).toContain('夜');
  });

  it('correctly categorizes records by time of day', async () => {
    const testDate = new Date('2024-01-15');
    const testRecords: MedicationRecord[] = [
      {
        id: 'record-morning',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T07:00:00'), // 7 AM - Morning
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-afternoon',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T15:00:00'), // 3 PM - Afternoon
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-evening',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T22:00:00'), // 10 PM - Evening
        status: MedicationStatus.ADMINISTERED,
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

    // Check that each time period has exactly one record
    const timePeriods = wrapper.findAll('.time-period');
    expect(timePeriods).toHaveLength(3);

    // Check morning period
    const morningPeriod = timePeriods.find(period =>
      period.find('.time-period-title').text() === '朝',
    );
    expect(morningPeriod).toBeTruthy();
    const morningRecords = morningPeriod!.findAll('.record-item');
    expect(morningRecords).toHaveLength(1);

    // Check afternoon period
    const afternoonPeriod = timePeriods.find(period =>
      period.find('.time-period-title').text() === '昼',
    );
    expect(afternoonPeriod).toBeTruthy();
    const afternoonRecords = afternoonPeriod!.findAll('.record-item');
    expect(afternoonRecords).toHaveLength(1);

    // Check evening period
    const eveningPeriod = timePeriods.find(period =>
      period.find('.time-period-title').text() === '夜',
    );
    expect(eveningPeriod).toBeTruthy();
    const eveningRecords = eveningPeriod!.findAll('.record-item');
    expect(eveningRecords).toHaveLength(1);
  });

  it('handles edge cases for time period boundaries', async () => {
    const testDate = new Date('2024-01-15');
    const testRecords: MedicationRecord[] = [
      {
        id: 'record-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T05:00:00'), // 5 AM - Morning boundary
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-2',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T12:00:00'), // 12 PM - Afternoon boundary
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-3',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T18:00:00'), // 6 PM - Evening boundary
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-4',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T04:59:59'), // Just before morning
        status: MedicationStatus.ADMINISTERED,
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

    // Check time period categorization
    const timePeriods = wrapper.findAll('.time-period');

    // Morning should have 1 record (5:00 AM)
    const morningPeriod = timePeriods.find(period =>
      period.find('.time-period-title').text() === '朝',
    );
    expect(morningPeriod).toBeTruthy();
    const morningRecords = morningPeriod!.findAll('.record-item');
    expect(morningRecords).toHaveLength(1);

    // Afternoon should have 1 record (12:00 PM)
    const afternoonPeriod = timePeriods.find(period =>
      period.find('.time-period-title').text() === '昼',
    );
    expect(afternoonPeriod).toBeTruthy();
    const afternoonRecords = afternoonPeriod!.findAll('.record-item');
    expect(afternoonRecords).toHaveLength(1);

    // Evening should have 2 records (6:00 PM and 4:59 AM - before morning boundary)
    const eveningPeriod = timePeriods.find(period =>
      period.find('.time-period-title').text() === '夜',
    );
    expect(eveningPeriod).toBeTruthy();
    const eveningRecords = eveningPeriod!.findAll('.record-item');
    expect(eveningRecords).toHaveLength(2);
  });

  it('displays multiple records within the same time period', async () => {
    const testDate = new Date('2024-01-15');
    const testRecords: MedicationRecord[] = [
      {
        id: 'record-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T08:00:00'), // Morning
        status: MedicationStatus.ADMINISTERED,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'record-2',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 2,
        administeredAt: new Date('2024-01-15T09:30:00'), // Also morning
        status: MedicationStatus.ADMINISTERED,
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

    // Check that morning period has 2 records
    const morningPeriod = wrapper.find('.time-period');
    expect(morningPeriod.find('.time-period-title').text()).toBe('朝');

    const morningRecords = morningPeriod.findAll('.record-item');
    expect(morningRecords).toHaveLength(2);

    // Check record details
    const firstRecord = morningRecords[0];
    expect(firstRecord.find('.quantity').text()).toBe('1個');
    expect(firstRecord.find('.time').text()).toBe('08:00');

    const secondRecord = morningRecords[1];
    expect(secondRecord.find('.quantity').text()).toBe('2個');
    expect(secondRecord.find('.time').text()).toBe('09:30');
  });

  it('only shows time periods that have records', async () => {
    const testDate = new Date('2024-01-15');
    const testRecords: MedicationRecord[] = [
      {
        id: 'record-1',
        catId: 'cat-1',
        medicationId: 'med-1',
        quantity: 1,
        administeredAt: new Date('2024-01-15T08:00:00'), // Only morning
        status: MedicationStatus.ADMINISTERED,
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

    // Only morning period should be displayed
    const timePeriods = wrapper.findAll('.time-period');
    expect(timePeriods).toHaveLength(1);

    const timePeriodTitle = timePeriods[0].find('.time-period-title');
    expect(timePeriodTitle.text()).toBe('朝');
  });
});
