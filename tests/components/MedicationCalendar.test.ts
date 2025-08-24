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

const mockMedicationRecords: MedicationRecord[] = [
  {
    id: 'record-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    quantity: 1,
    administeredAt: new Date('2024-01-15T08:00:00'),
    status: MedicationStatus.ADMINISTERED,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'record-2',
    catId: 'cat-2',
    medicationId: 'med-2',
    quantity: 2,
    administeredAt: new Date('2024-01-15T20:00:00'),
    status: MedicationStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockMedicationReminders: MedicationReminder[] = [
  {
    id: 'reminder-1',
    scheduleId: 'schedule-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    scheduledAt: new Date('2024-01-16T08:00:00'),
    status: ReminderStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('MedicationCalendar', () => {
  let pinia: ReturnType<typeof createPinia>;
  let medicationsStore: ReturnType<typeof useMedicationsStore>;
  let catsStore: ReturnType<typeof useCatsStore>;

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
    medicationsStore.records = mockMedicationRecords;
    medicationsStore.reminders = mockMedicationReminders;
    medicationsStore.loading = false;
    catsStore.cats = mockCats;

    // Mock store methods
    vi.spyOn(medicationsStore, 'fetchMedications').mockResolvedValue(undefined);
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockResolvedValue(undefined);
    vi.spyOn(medicationsStore, 'fetchMedicationReminders').mockResolvedValue(undefined);
    vi.spyOn(catsStore, 'fetchCats').mockResolvedValue(undefined);
  });

  it('renders calendar component correctly', () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    expect(wrapper.find('.medication-calendar').exists()).toBe(true);
    expect(wrapper.find('.calendar-header').exists()).toBe(true);
    expect(wrapper.find('.calendar-grid').exists()).toBe(true);
  });

  it('displays current month and year in header', async () => {
    const initialDate = new Date('2024-01-15');
    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await wrapper.vm.$nextTick();

    const title = wrapper.find('.calendar-title');
    expect(title.text()).toContain('2024年1月');
  });

  it('displays day headers correctly', () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    const dayHeaders = wrapper.findAll('.day-header');
    expect(dayHeaders).toHaveLength(7);
    expect(dayHeaders[0].text()).toBe('日');
    expect(dayHeaders[1].text()).toBe('月');
    expect(dayHeaders[6].text()).toBe('土');
  });

  it('displays cat filter when cats are available', async () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    await wrapper.vm.$nextTick();

    const catFilter = wrapper.find('.cat-filter');
    expect(catFilter.exists()).toBe(true);

    const catSelect = wrapper.find('.cat-select');
    expect(catSelect.exists()).toBe(true);

    const options = catSelect.findAll('option');
    expect(options).toHaveLength(3); // "全ての猫" + 2 cats
    expect(options[0].text()).toBe('全ての猫');
    // Note: cats are sorted alphabetically, so しろ comes before みけ
    expect(options[1].text()).toBe('しろ');
    expect(options[2].text()).toBe('みけ');
  });

  it('navigates to previous month when previous button is clicked', async () => {
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

    const prevButton = wrapper.findAll('.nav-button')[0];
    await prevButton.trigger('click');
    await waitForComponent(wrapper);

    const title = wrapper.find('.calendar-title');
    expect(title.text()).toContain('2023年12月');
  });

  it('navigates to next month when next button is clicked', async () => {
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

    const nextButton = wrapper.findAll('.nav-button')[1];
    await nextButton.trigger('click');
    await waitForComponent(wrapper);

    const title = wrapper.find('.calendar-title');
    expect(title.text()).toContain('2024年2月');
  });

  it('displays calendar days with correct structure', async () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    const calendarDays = wrapper.findAll('.calendar-day');
    expect(calendarDays.length).toBeGreaterThan(28); // At least 28 days in a month
    expect(calendarDays.length).toBeLessThanOrEqual(42); // At most 6 weeks * 7 days

    // Check that each day has a day number
    calendarDays.forEach((day) => {
      expect(day.find('.day-number').exists()).toBe(true);
    });
  });

  it('highlights today correctly', async () => {
    const today = new Date();
    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: today,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    const todayElement = wrapper.find('.calendar-day.today');
    expect(todayElement.exists()).toBe(true);
  });

  it('displays medication indicators for days with records', async () => {
    // Set up records for a specific date
    const testDate = new Date('2024-01-15');
    medicationsStore.records = [
      {
        ...mockMedicationRecords[0],
        administeredAt: testDate,
        status: MedicationStatus.ADMINISTERED,
      },
    ];

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Find the day with administered medication
    const dayWithRecord = wrapper.find('.calendar-day.has-administered');
    expect(dayWithRecord.exists()).toBe(true);

    const indicator = dayWithRecord.find('.indicator.administered');
    expect(indicator.exists()).toBe(true);
  });

  it('selects date when calendar day is clicked', async () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    const firstDay = wrapper.find('.calendar-day.current-month');
    await firstDay.trigger('click');

    expect(firstDay.classes()).toContain('selected');
  });

  it('emits dateSelected event when date is clicked', async () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    const firstDay = wrapper.find('.calendar-day.current-month');
    await firstDay.trigger('click');

    expect(wrapper.emitted('dateSelected')).toBeTruthy();
    expect(wrapper.emitted('dateSelected')?.[0]).toBeDefined();
  });

  it('displays selected date details when date is selected', async () => {
    const testDate = new Date('2024-01-15');
    medicationsStore.records = [
      {
        ...mockMedicationRecords[0],
        administeredAt: testDate,
      },
    ];

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Click on the day with records
    const dayWithRecord = wrapper.find('.calendar-day.current-month');
    await dayWithRecord.trigger('click');

    const details = wrapper.find('.selected-date-details');
    expect(details.exists()).toBe(true);

    const detailsTitle = wrapper.find('.details-title');
    expect(detailsTitle.exists()).toBe(true);
  });

  it('displays medication records in selected date details', async () => {
    const testDate = new Date('2024-01-15T10:00:00');
    const testDateString = testDate.toISOString().split('T')[0]; // '2024-01-15'

    medicationsStore.records = [
      {
        ...mockMedicationRecords[0],
        administeredAt: testDate,
      },
    ];

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Find the specific day that matches our test date
    const calendarDays = wrapper.findAll('.calendar-day.current-month');
    let targetDay = null;

    for (const day of calendarDays) {
      // Click on the day to see if it's the right one
      await day.trigger('click');
      await wrapper.vm.$nextTick();

      // Check if this day shows our record
      const recordsSection = wrapper.find('.records-section');
      if (recordsSection.exists()) {
        targetDay = day;
        break;
      }
    }

    expect(targetDay).not.toBeNull();

    const recordsSection = wrapper.find('.records-section');
    expect(recordsSection.exists()).toBe(true);

    const recordItems = wrapper.findAll('.record-item');
    expect(recordItems.length).toBeGreaterThan(0);

    const medicationName = recordItems[0].find('.medication-name');
    expect(medicationName.text()).toBe('テスト薬A');
  });

  it('displays reminders in selected date details', async () => {
    const testDate = new Date('2024-01-16T08:00:00');
    medicationsStore.reminders = [
      {
        ...mockMedicationReminders[0],
        scheduledAt: testDate,
      },
    ];

    const wrapper = mount(MedicationCalendar, {
      props: {
        initialDate: testDate,
      },
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Find the specific day that matches our test date
    const calendarDays = wrapper.findAll('.calendar-day.current-month');
    let targetDay = null;

    for (const day of calendarDays) {
      // Click on the day to see if it's the right one
      await day.trigger('click');
      await wrapper.vm.$nextTick();

      // Check if this day shows our reminder
      const remindersSection = wrapper.find('.reminders-section');
      if (remindersSection.exists()) {
        targetDay = day;
        break;
      }
    }

    expect(targetDay).not.toBeNull();

    const remindersSection = wrapper.find('.reminders-section');
    expect(remindersSection.exists()).toBe(true);

    const reminderItems = wrapper.findAll('.reminder-item');
    expect(reminderItems.length).toBeGreaterThan(0);
  });

  it('shows create record button in date actions', async () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Select a date
    const firstDay = wrapper.find('.calendar-day.current-month');
    await firstDay.trigger('click');

    const createButton = wrapper.find('.action-button.primary');
    expect(createButton.exists()).toBe(true);
    expect(createButton.text()).toBe('投与記録を追加');
  });

  it('emits recordCreate event when create record button is clicked', async () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    await waitForComponent(wrapper);

    // Select a date
    const firstDay = wrapper.find('.calendar-day.current-month');
    await firstDay.trigger('click');

    // Click create record button
    const createButton = wrapper.find('.action-button.primary');
    await createButton.trigger('click');

    expect(wrapper.emitted('recordCreate')).toBeTruthy();
    expect(wrapper.emitted('recordCreate')?.[0]).toBeDefined();
  });

  it('filters records by selected cat', async () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    await wrapper.vm.$nextTick();

    // Select a specific cat
    const catSelect = wrapper.find('.cat-select');
    await catSelect.setValue('cat-1');

    // Verify that fetchMedicationRecords was called with catId filter
    expect(medicationsStore.fetchMedicationRecords).toHaveBeenCalledWith(
      expect.objectContaining({
        catId: 'cat-1',
      }),
    );
  });

  it('displays loading state while loading data', async () => {
    // Mock the fetch methods to return pending promises to simulate loading
    const pendingPromise = new Promise(() => {}); // Never resolves
    vi.spyOn(medicationsStore, 'fetchMedications').mockReturnValue(pendingPromise);
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockReturnValue(pendingPromise);
    vi.spyOn(medicationsStore, 'fetchMedicationReminders').mockReturnValue(pendingPromise);
    vi.spyOn(catsStore, 'fetchCats').mockReturnValue(pendingPromise);

    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    // Wait a bit for the component to start loading
    await new Promise(resolve => setTimeout(resolve, 10));

    const loadingState = wrapper.find('.loading-state');
    expect(loadingState.exists()).toBe(true);
    expect(loadingState.text()).toContain('カレンダーを読み込み中');
  });

  it('displays error state when there is an error', async () => {
    // Mock the fetch methods to throw errors
    const errorMessage = 'テストエラー';
    vi.spyOn(medicationsStore, 'fetchMedications').mockRejectedValue(new Error(errorMessage));
    vi.spyOn(medicationsStore, 'fetchMedicationRecords').mockRejectedValue(new Error(errorMessage));
    vi.spyOn(medicationsStore, 'fetchMedicationReminders').mockRejectedValue(new Error(errorMessage));
    vi.spyOn(catsStore, 'fetchCats').mockRejectedValue(new Error(errorMessage));

    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    // Wait for the component to finish loading and show error
    await new Promise(resolve => setTimeout(resolve, 100));
    await wrapper.vm.$nextTick();

    const errorState = wrapper.find('.error-state');
    expect(errorState.exists()).toBe(true);
    expect(errorState.text()).toContain(errorMessage);

    const retryButton = wrapper.find('.retry-button');
    expect(retryButton.exists()).toBe(true);
  });

  it('handles cat prop correctly', async () => {
    const wrapper = mount(MedicationCalendar, {
      props: {
        catId: 'cat-1',
      },
      global: {
        plugins: [pinia],
      },
    });

    await wrapper.vm.$nextTick();

    const catSelect = wrapper.find('.cat-select');
    expect((catSelect.element as HTMLSelectElement).value).toBe('cat-1');
  });

  it('formats status labels correctly', () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    const vm = wrapper.vm as any;

    expect(vm.getStatusLabel(MedicationStatus.PENDING)).toBe('予定');
    expect(vm.getStatusLabel(MedicationStatus.ADMINISTERED)).toBe('投与済み');
    expect(vm.getStatusLabel(MedicationStatus.SKIPPED)).toBe('スキップ');
    expect(vm.getStatusLabel(MedicationStatus.MISSED)).toBe('未投与');
  });

  it('formats reminder status labels correctly', () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    const vm = wrapper.vm as any;

    expect(vm.getReminderStatusLabel(ReminderStatus.PENDING)).toBe('待機中');
    expect(vm.getReminderStatusLabel(ReminderStatus.ACKNOWLEDGED)).toBe('確認済み');
    expect(vm.getReminderStatusLabel(ReminderStatus.SNOOZED)).toBe('スヌーズ');
    expect(vm.getReminderStatusLabel(ReminderStatus.DISMISSED)).toBe('無視');
  });

  it('formats time correctly', () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    const vm = wrapper.vm as any;
    const testDate = new Date('2024-01-15T08:30:00');

    expect(vm.formatTime(testDate)).toBe('08:30');
  });

  it('gets medication name correctly', () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    const vm = wrapper.vm as any;

    expect(vm.getMedicationName('med-1')).toBe('テスト薬A');
    expect(vm.getMedicationName('unknown')).toBe('不明な薬');
  });

  it('gets cat name correctly', () => {
    const wrapper = mount(MedicationCalendar, {
      global: {
        plugins: [pinia],
      },
    });

    const vm = wrapper.vm as any;

    expect(vm.getCatName('cat-1')).toBe('みけ');
    expect(vm.getCatName('unknown')).toBe('不明な猫');
  });
});
