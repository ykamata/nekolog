import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MedicationRecordList from '~/components/MedicationRecordList.vue';
import type {
  MedicationRecord,
  MedicationStatus,
  Medication,
  MedicationType,
} from '~/types/medication';
import type { Cat } from '~/types/cat-meal';

// Mock the ConfirmationDialog component
vi.mock('~/components/ConfirmationDialog.vue', () => ({
  default: {
    name: 'ConfirmationDialog',
    template: '<div class="confirmation-dialog-mock" />',
    props: ['isOpen', 'title', 'message', 'confirmText', 'cancelText', 'type'],
    emits: ['confirm', 'cancel'],
  },
}));

// Mock the $fetch function
global.$fetch = vi.fn();

describe('MedicationRecordList', () => {
  const createTestCat = (overrides?: Partial<Cat>): Cat => ({
    id: 'cat-1',
    name: 'テスト猫',
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
    id: 'med-1',
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
    id: 'record-1',
    catId: 'cat-1',
    medicationId: 'med-1',
    quantity: 1,
    administeredAt: new Date('2024-01-01T10:00:00'),
    status: 'ADMINISTERED' as MedicationStatus,
    notes: 'テストメモ',
    createdAt: new Date(),
    updatedAt: new Date(),
    cat: createTestCat(),
    medication: createTestMedication(),
    ...overrides,
  });

  const defaultProps = {
    cats: [
      createTestCat({ id: 'cat-1', name: 'みけ' }),
      createTestCat({ id: 'cat-2', name: 'しろ' }),
    ],
    medications: [
      createTestMedication({ id: 'med-1', name: '血圧薬', type: 'MEDICINE' }),
      createTestMedication({ id: 'med-2', name: 'ビタミンC', type: 'VITAMIN' }),
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock successful API response
    (global.$fetch as unknown as jest.Mock).mockResolvedValue({
      medicationRecords: [],
      pagination: {
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      },
    });
  });

  describe('Component Rendering', () => {
    it('should render list header with title and add button', () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      expect(wrapper.find('.list-title').text()).toBe('投与記録');
      expect(wrapper.find('.add-button').text()).toBe('+ 新しい記録を追加');
    });

    it('should render cat-specific title when selectedCatId is provided', () => {
      const wrapper = mount(MedicationRecordList, {
        props: {
          ...defaultProps,
          selectedCatId: 'cat-1',
        },
      });

      expect(wrapper.find('.list-title').text()).toBe('みけの投与記録');
    });

    it('should render filter section', () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      expect(wrapper.find('.filters-section').exists()).toBe(true);
      expect(wrapper.find('#cat-filter').exists()).toBe(true);
      expect(wrapper.find('#medication-filter').exists()).toBe(true);
      expect(wrapper.find('#status-filter').exists()).toBe(true);
    });

    it('should show loading state initially', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Wait for component to mount and start loading
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.loading-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('データを読み込み中...');
    });
  });

  describe('Filter Options', () => {
    it('should have correct cat filter options', () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      const options = wrapper.findAll('#cat-filter option');
      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe('すべての猫');
      expect(options[1].text()).toBe('みけ');
      expect(options[2].text()).toBe('しろ');
    });

    it('should have correct medication filter options', () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      const options = wrapper.findAll('#medication-filter option');
      expect(options).toHaveLength(3);
      expect(options[0].text()).toBe('すべての薬');
      expect(options[1].text()).toBe('血圧薬 (薬)');
      expect(options[2].text()).toBe('ビタミンC (ビタミン)');
    });

    it('should have correct status filter options', () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      const options = wrapper.findAll('#status-filter option');
      expect(options).toHaveLength(5);
      expect(options[0].text()).toBe('すべて');
      expect(options[1].text()).toBe('投与済み');
      expect(options[2].text()).toBe('投与予定');
      expect(options[3].text()).toBe('スキップ');
      expect(options[4].text()).toBe('投与忘れ');
    });

    it('should have date range shortcut buttons', () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      const shortcuts = wrapper.findAll('.date-shortcuts .filter-button');
      expect(shortcuts).toHaveLength(5);
      expect(shortcuts[0].text()).toBe('今日');
      expect(shortcuts[1].text()).toBe('昨日');
      expect(shortcuts[2].text()).toBe('過去3日');
      expect(shortcuts[3].text()).toBe('過去1週間');
      expect(shortcuts[4].text()).toBe('過去1ヶ月');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no records', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('投与記録がありません');
      expect(wrapper.text()).toContain('まだ投与記録が登録されていません。');
    });

    it('should show filtered empty state when filters are applied', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Apply a filter
      await wrapper.find('#cat-filter').setValue('cat-1');
      await wrapper.vm.$nextTick();

      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain(
        '指定した条件に一致する投与記録が見つかりませんでした。',
      );
    });
  });

  describe('Record Display', () => {
    beforeEach(() => {
      const mockRecords = [
        createTestMedicationRecord({
          id: 'record-1',
          cat: createTestCat({ name: 'みけ' }),
          medication: createTestMedication({
            name: '血圧薬',
            type: 'MEDICINE',
          }),
          quantity: 2,
          status: 'ADMINISTERED',
          notes: 'テストメモ',
        }),
      ];

      (global.$fetch as any).mockResolvedValue({
        medicationRecords: mockRecords,
        pagination: {
          total: 1,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      });
    });

    it('should display medication records correctly', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.medication-record-card').exists()).toBe(true);
      expect(wrapper.text()).toContain('みけ');
      expect(wrapper.text()).toContain('血圧薬');
      expect(wrapper.text()).toContain('2個');
      expect(wrapper.text()).toContain('投与済み');
      expect(wrapper.text()).toContain('テストメモ');
    });

    it('should show record count', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Wait for loading to complete
      await new Promise(resolve => setTimeout(resolve, 0));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.record-count').text()).toBe('1件の記録');
    });
  });

  describe('Cat Filtering', () => {
    it('should pre-select cat filter when selectedCatId is provided', () => {
      const wrapper = mount(MedicationRecordList, {
        props: {
          ...defaultProps,
          selectedCatId: 'cat-1',
        },
      });

      const catFilter = wrapper.find('#cat-filter').element as HTMLSelectElement;
      expect(catFilter.value).toBe('cat-1');
    });

    it('should update filter when selectedCatId prop changes', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Initially no cat selected
      let catFilter = wrapper.find('#cat-filter').element as HTMLSelectElement;
      expect(catFilter.value).toBe('');

      // Change selectedCatId prop
      await wrapper.setProps({ selectedCatId: 'cat-2' });

      catFilter = wrapper.find('#cat-filter').element as HTMLSelectElement;
      expect(catFilter.value).toBe('cat-2');
    });

    it('should call API with cat filter when selectedCatId is set', async () => {
      mount(MedicationRecordList, {
        props: {
          ...defaultProps,
          selectedCatId: 'cat-1',
        },
      });

      // Wait for component to mount and make API call
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(global.$fetch).toHaveBeenCalledWith(
        expect.stringContaining('catId=cat-1'),
      );
    });
  });

  describe('User Interactions', () => {
    it('should emit add event when add button is clicked', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      await wrapper.find('.add-button').trigger('click');

      expect(wrapper.emitted('add')).toHaveLength(1);
    });

    it('should apply filter when cat filter changes', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      await wrapper.find('#cat-filter').setValue('cat-1');
      await wrapper.find('#cat-filter').trigger('change');

      expect(global.$fetch).toHaveBeenCalledWith(
        expect.stringContaining('catId=cat-1'),
      );
    });

    it('should apply filter when medication filter changes', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      await wrapper.find('#medication-filter').setValue('med-1');
      await wrapper.find('#medication-filter').trigger('change');

      expect(global.$fetch).toHaveBeenCalledWith(
        expect.stringContaining('medicationId=med-1'),
      );
    });

    it('should apply filter when status filter changes', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      await wrapper.find('#status-filter').setValue('ADMINISTERED');
      await wrapper.find('#status-filter').trigger('change');

      expect(global.$fetch).toHaveBeenCalledWith(
        expect.stringContaining('status=ADMINISTERED'),
      );
    });

    it('should clear filters when clear button is clicked', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Apply some filters first
      await wrapper.find('#cat-filter').setValue('cat-1');
      await wrapper.vm.$nextTick();

      // Clear filters
      await wrapper.find('.clear-filters-button').trigger('click');

      const catFilter = wrapper.find('#cat-filter')
        .element as HTMLSelectElement;
      expect(catFilter.value).toBe('');
    });
  });

  describe('Date Range Shortcuts', () => {
    it('should apply date filter when shortcut is clicked', async () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      const todayButton = wrapper.findAll('.date-shortcuts .filter-button')[0];
      await todayButton.trigger('click');

      expect(global.$fetch).toHaveBeenCalledWith(
        expect.stringContaining('startDate='),
      );
    });
  });

  describe('Error Handling', () => {
    it('should show error state when API fails', async () => {
      (global.$fetch as any).mockRejectedValue(new Error('API Error'));

      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Wait for error to occur
      await new Promise(resolve => setTimeout(resolve, 0));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.error-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('データの取得に失敗しました');
    });

    it('should retry when retry button is clicked', async () => {
      (global.$fetch as any).mockRejectedValue(new Error('API Error'));

      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      // Wait for error to occur
      await new Promise(resolve => setTimeout(resolve, 0));
      await wrapper.vm.$nextTick();

      // Reset mock to success
      (global.$fetch as any).mockResolvedValue({
        medicationRecords: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
      });

      await wrapper.find('.retry-button').trigger('click');

      expect(global.$fetch).toHaveBeenCalledTimes(2); // Initial call + retry
    });
  });

  describe('Formatting Functions', () => {
    it('should format medication types correctly', () => {
      const wrapper = mount(MedicationRecordList, {
        props: defaultProps,
      });

      const component = wrapper.vm as any;

      expect(component.formatMedicationType('MEDICINE')).toBe('薬');
      expect(component.formatMedicationType('SUPPLEMENT')).toBe('サプリメント');
      expect(component.formatMedicationType('VITAMIN')).toBe('ビタミン');
    });
  });
});
