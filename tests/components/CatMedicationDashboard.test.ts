import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import CatMedicationDashboard from '~/components/CatMedicationDashboard.vue';
import { useMedicationsStore } from '~/stores/medications';
import type {
  Medication,
  MedicationRecord,
  MedicationReminder,
  MedicationType,
  MedicationStatus,
  ReminderStatus,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Mock child components
vi.mock('~/components/CatMedicationHistory.vue', () => ({
  default: {
    name: 'CatMedicationHistory',
    template: '<div class="cat-medication-history-mock" />',
    props: ['cat', 'medications', 'loading'],
    emits: ['record-created', 'record-updated', 'record-deleted'],
  },
}));

describe('CatMedicationDashboard', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const createTestCat = (overrides?: Partial<Cat>): Cat => ({
    id: 1,
    name: 'みけ',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    photoUrl: 'https://example.com/cat.jpg',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
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

  const defaultProps = {
    cats: [
      createTestCat({ id: 1, name: 'みけ' }),
      createTestCat({ id: 2, name: 'しろ' }),
    ],
    medications: [
      createTestMedication({ id: 1, name: '血圧薬' }),
      createTestMedication({ id: 2, name: 'ビタミンC' }),
    ],
  };

  describe('Component Rendering', () => {
    it('should render dashboard header with title and cat selector', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      expect(wrapper.find('.dashboard-title').text()).toBe('薬管理ダッシュボード');
      expect(wrapper.find('.selector-label').text()).toBe('表示する猫:');
      expect(wrapper.find('.cat-select').exists()).toBe(true);
    });

    it('should have correct cat selector options', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const options = wrapper.findAll('.cat-select option');
      expect(options).toHaveLength(3); // "すべての猫" + 2 cats
      expect(options[0].text()).toBe('すべての猫');
      expect(options[1].text()).toBe('みけ');
      expect(options[2].text()).toBe('しろ');
    });

    it('should show combined view by default', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      expect(wrapper.find('.combined-view').exists()).toBe(true);
      expect(wrapper.find('.individual-view').exists()).toBe(false);
    });

    it('should show individual view when cat is selected', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      await wrapper.find('.cat-select').setValue('cat-1');

      expect(wrapper.find('.combined-view').exists()).toBe(false);
      expect(wrapper.find('.individual-view').exists()).toBe(true);
    });

    it('should show empty state when no cats are provided', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: {
          ...defaultProps,
          cats: [],
        },
      });

      // Select a non-existent cat to trigger empty state
      wrapper.vm.selectedCatId = 'non-existent';
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('猫が登録されていません');
    });
  });

  describe('Combined View', () => {
    it('should render cats overview section', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      expect(wrapper.find('.cats-overview').exists()).toBe(true);
      expect(wrapper.text()).toContain('猫別薬管理状況');
    });

    it('should render cat summary cards', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const cards = wrapper.findAll('.cat-summary-card');
      expect(cards).toHaveLength(2);
    });

    it('should render overall statistics section', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      expect(wrapper.find('.overall-stats').exists()).toBe(true);
      expect(wrapper.text()).toContain('全体統計');
    });

    it('should render statistics cards', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const statCards = wrapper.findAll('.stat-card');
      expect(statCards).toHaveLength(4);
      expect(wrapper.text()).toContain('総投与記録数');
      expect(wrapper.text()).toContain('未投与記録数');
      expect(wrapper.text()).toContain('今日のリマインダー');
      expect(wrapper.text()).toContain('登録薬数');
    });
  });

  describe('Cat Summary Cards', () => {
    beforeEach(() => {
      // Mock store data
      const store = useMedicationsStore();
      store.records = [
        createTestMedicationRecord({ catId: 1, status: 'ADMINISTERED' }),
        createTestMedicationRecord({ catId: 1, status: 'PENDING' }),
        createTestMedicationRecord({ catId: 2, status: 'ADMINISTERED' }),
      ];
      store.reminders = [
        createTestMedicationReminder({ catId: 1, status: 'PENDING' }),
        createTestMedicationReminder({ catId: 2, status: 'PENDING' }),
      ];
    });

    it('should display cat information correctly', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const cards = wrapper.findAll('.cat-summary-card');
      expect(cards[0].find('.cat-name').text()).toBe('みけ');
      expect(cards[1].find('.cat-name').text()).toBe('しろ');
    });

    it('should display cat photos when available', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const photos = wrapper.findAll('.cat-photo');
      expect(photos).toHaveLength(2);
      expect(photos[0].attributes('src')).toBe('https://example.com/cat.jpg');
      expect(photos[0].attributes('alt')).toBe('みけ');
    });

    it('should display placeholder when cat has no photo', () => {
      const catsWithoutPhotos = [
        createTestCat({ id: 1, name: 'みけ', photoUrl: undefined }),
      ];

      const wrapper = mount(CatMedicationDashboard, {
        props: {
          ...defaultProps,
          cats: catsWithoutPhotos,
        },
      });

      expect(wrapper.find('.cat-photo-placeholder').exists()).toBe(true);
      expect(wrapper.find('.cat-photo-placeholder').text()).toBe('🐱');
    });

    it('should switch to individual view when card is clicked', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const firstCard = wrapper.find('.cat-summary-card');
      await firstCard.trigger('click');

      expect(wrapper.find('.individual-view').exists()).toBe(true);
      expect(wrapper.find('.combined-view').exists()).toBe(false);
    });

    it('should switch to individual view when quick action button is clicked', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const quickActionBtn = wrapper.find('.quick-action-btn');
      await quickActionBtn.trigger('click');

      expect(wrapper.find('.individual-view').exists()).toBe(true);
    });
  });

  describe('Cat Selector', () => {
    it('should change view when cat is selected', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      // Initially showing combined view
      expect(wrapper.find('.combined-view').exists()).toBe(true);

      // Select a specific cat
      await wrapper.find('.cat-select').setValue('cat-1');

      expect(wrapper.find('.individual-view').exists()).toBe(true);
      expect(wrapper.find('.combined-view').exists()).toBe(false);
    });

    it('should show combined view when "all" is selected', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      // Select a specific cat first
      await wrapper.find('.cat-select').setValue('cat-1');
      expect(wrapper.find('.individual-view').exists()).toBe(true);

      // Switch back to all cats
      await wrapper.find('.cat-select').setValue('all');
      expect(wrapper.find('.combined-view').exists()).toBe(true);
    });
  });

  describe('Individual View', () => {
    it('should render CatMedicationHistory component with correct props', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      await wrapper.find('.cat-select').setValue('cat-1');

      const historyComponent = wrapper.findComponent({ name: 'CatMedicationHistory' });
      expect(historyComponent.exists()).toBe(true);
      expect(historyComponent.props('cat')).toEqual(defaultProps.cats[0]);
      expect(historyComponent.props('medications')).toEqual(defaultProps.medications);
      expect(historyComponent.props('loading')).toBe(false);
    });

    it('should emit record-created when child component emits it', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      await wrapper.find('.cat-select').setValue('cat-1');

      const historyComponent = wrapper.findComponent({ name: 'CatMedicationHistory' });
      const testRecord = createTestMedicationRecord();

      await historyComponent.vm.$emit('record-created', testRecord);

      expect(wrapper.emitted('record-created')).toHaveLength(1);
      expect(wrapper.emitted('record-created')![0]).toEqual([testRecord]);
    });

    it('should emit record-updated when child component emits it', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      await wrapper.find('.cat-select').setValue('cat-1');

      const historyComponent = wrapper.findComponent({ name: 'CatMedicationHistory' });
      const testRecord = createTestMedicationRecord();

      await historyComponent.vm.$emit('record-updated', testRecord);

      expect(wrapper.emitted('record-updated')).toHaveLength(1);
      expect(wrapper.emitted('record-updated')![0]).toEqual([testRecord]);
    });

    it('should emit record-deleted when child component emits it', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      await wrapper.find('.cat-select').setValue('cat-1');

      const historyComponent = wrapper.findComponent({ name: 'CatMedicationHistory' });
      const recordId = 'record-1';

      await historyComponent.vm.$emit('record-deleted', recordId);

      expect(wrapper.emitted('record-deleted')).toHaveLength(1);
      expect(wrapper.emitted('record-deleted')![0]).toEqual([recordId]);
    });
  });

  describe('Loading State', () => {
    it('should pass loading state to child components', async () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: {
          ...defaultProps,
          loading: true,
        },
      });

      await wrapper.find('.cat-select').setValue('cat-1');

      const historyComponent = wrapper.findComponent({ name: 'CatMedicationHistory' });
      expect(historyComponent.props('loading')).toBe(true);
    });
  });

  describe('Date Formatting', () => {
    it('should format last administered date correctly', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      const component = wrapper.vm as unknown;

      // Test different time periods
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      expect(component.formatLastAdministered(oneHourAgo)).toBe('1時間前');
      expect(component.formatLastAdministered(oneDayAgo)).toBe('昨日');
      expect(component.formatLastAdministered(undefined)).toBe('記録なし');
    });
  });

  describe('Responsive Design', () => {
    it('should render responsive layout classes', () => {
      const wrapper = mount(CatMedicationDashboard, {
        props: defaultProps,
      });

      expect(wrapper.find('.cat-medication-dashboard').exists()).toBe(true);
      expect(wrapper.find('.dashboard-header').exists()).toBe(true);
      expect(wrapper.find('.cats-grid').exists()).toBe(true);
      expect(wrapper.find('.stats-grid').exists()).toBe(true);
    });
  });
});
