import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import MedicationList from '~/components/MedicationList.vue';
import type { Medication, MedicationType } from '~/types/medication';

// Mock the ConfirmationDialog component
vi.mock('~/components/ConfirmationDialog.vue', () => ({
  default: {
    name: 'ConfirmationDialog',
    template: '<div class="confirmation-dialog-mock" />',
    props: ['isOpen', 'title', 'message', 'confirmText', 'cancelText', 'type'],
    emits: ['confirm', 'cancel'],
  },
}));

describe('MedicationList', () => {
  const createTestMedication = (
    overrides?: Partial<Medication>,
  ): Medication => ({
    id: 'med-1',
    name: 'テスト薬',
    type: 'MEDICINE' as MedicationType,
    description: 'テスト用の薬です',
    dosage: '1日1回',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

  const createTestMedications = (): Medication[] => [
    createTestMedication({
      id: 'med-1',
      name: '血圧薬',
      type: 'MEDICINE',
      description: '高血圧治療薬',
      dosage: '朝1錠',
    }),
    createTestMedication({
      id: 'med-2',
      name: 'ビタミンC',
      type: 'VITAMIN',
      description: '免疫力向上のためのビタミン',
      dosage: '1日2錠',
    }),
    createTestMedication({
      id: 'med-3',
      name: 'オメガ3',
      type: 'SUPPLEMENT',
      description: '心臓の健康をサポート',
      dosage: '食後1錠',
    }),
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render medication list with header', () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      expect(wrapper.find('.medication-list__title').text()).toBe('薬の管理');
      expect(wrapper.find('.btn--primary').text()).toBe('+ 新しい薬を追加');
    });

    it('should show loading state when loading is true', () => {
      const wrapper = mount(MedicationList, {
        props: {
          medications: [],
          loading: true,
        },
      });

      expect(wrapper.find('.medication-list__loading').exists()).toBe(true);
      expect(wrapper.find('.loading-spinner').exists()).toBe(true);
      expect(wrapper.text()).toContain('薬の情報を読み込み中...');
    });

    it('should show empty state when no medications', () => {
      const wrapper = mount(MedicationList, {
        props: {
          medications: [],
        },
      });

      expect(wrapper.find('.medication-list__empty').exists()).toBe(true);
      expect(wrapper.text()).toContain('薬が登録されていません');
      expect(wrapper.text()).toContain(
        '最初の薬を追加して、薬の管理を始めましょう。',
      );
    });

    it('should render medication cards when medications are provided', () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      const cards = wrapper.findAll('.medication-card');
      expect(cards).toHaveLength(3);
      expect(wrapper.text()).toContain('血圧薬');
      expect(wrapper.text()).toContain('ビタミンC');
      expect(wrapper.text()).toContain('オメガ3');
    });

    it('should hide actions when showActions is false', () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
          showActions: false,
        },
      });

      expect(wrapper.find('.btn--primary').exists()).toBe(false);
      expect(wrapper.find('.medication-card__actions').exists()).toBe(false);
    });
  });

  describe('Filtering and Sorting', () => {
    it('should filter medications by search query', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      const searchInput = wrapper.find('#search-input');
      await searchInput.setValue('血圧');

      const cards = wrapper.findAll('.medication-card');
      expect(cards).toHaveLength(1);
      expect(wrapper.text()).toContain('血圧薬');
    });

    it('should filter medications by type', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      const typeFilter = wrapper.find('#type-filter');
      await typeFilter.setValue('VITAMIN');

      const cards = wrapper.findAll('.medication-card');
      expect(cards).toHaveLength(1);
      expect(wrapper.text()).toContain('ビタミンC');
    });

    it('should sort medications by name', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      const sortBy = wrapper.find('#sort-by');
      await sortBy.setValue('name');

      const cards = wrapper.findAll('.medication-card');
      const firstCardName = cards[0].find('.medication-card__name').text();
      expect(firstCardName).toBe('オメガ3'); // Alphabetically first
    });

    it('should clear filters when clear button is clicked', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      // Set some filters
      await wrapper.find('#search-input').setValue('血圧');
      await wrapper.find('#type-filter').setValue('MEDICINE');

      // Clear filters
      await wrapper.find('.btn--secondary.btn--small').trigger('click');

      const searchInput = wrapper.find('#search-input')
        .element as HTMLInputElement;
      const typeFilter = wrapper.find('#type-filter')
        .element as HTMLSelectElement;

      expect(searchInput.value).toBe('');
      expect(typeFilter.value).toBe('');

      // Should show all medications again
      const cards = wrapper.findAll('.medication-card');
      expect(cards).toHaveLength(3);
    });

    it('should show no results message when filters return empty', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      const searchInput = wrapper.find('#search-input');
      await searchInput.setValue('存在しない薬');

      expect(wrapper.text()).toContain('検索結果が見つかりません');
      expect(wrapper.text()).toContain(
        '検索条件を変更してもう一度お試しください。',
      );
    });
  });

  describe('Medication Card Display', () => {
    it('should display medication information correctly', () => {
      const medication = createTestMedication({
        name: '血圧薬',
        type: 'MEDICINE',
        description: '高血圧治療薬',
        dosage: '朝1錠',
      });

      const wrapper = mount(MedicationList, {
        props: {
          medications: [medication],
        },
      });

      expect(wrapper.text()).toContain('血圧薬');
      expect(wrapper.text()).toContain('薬');
      expect(wrapper.text()).toContain('高血圧治療薬');
      expect(wrapper.text()).toContain('投与量:朝1錠');
    });

    it('should format medication types correctly', () => {
      const medications = [
        createTestMedication({ type: 'MEDICINE' }),
        createTestMedication({ type: 'SUPPLEMENT', id: 'med-2' }),
        createTestMedication({ type: 'VITAMIN', id: 'med-3' }),
      ];

      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      expect(wrapper.text()).toContain('薬');
      expect(wrapper.text()).toContain('サプリメント');
      expect(wrapper.text()).toContain('ビタミン');
    });

    it('should handle optional fields gracefully', () => {
      const medication = createTestMedication({
        description: undefined,
        dosage: undefined,
      });

      const wrapper = mount(MedicationList, {
        props: {
          medications: [medication],
        },
      });

      // Should not show dosage section when not provided
      expect(wrapper.text()).not.toContain('投与量:');
      // Should still show the medication name
      expect(wrapper.text()).toContain('テスト薬');
    });
  });

  describe('User Interactions', () => {
    it('should emit add event when add button is clicked', async () => {
      const wrapper = mount(MedicationList, {
        props: {
          medications: [],
        },
      });

      await wrapper.find('.btn--primary').trigger('click');

      expect(wrapper.emitted('add')).toHaveLength(1);
    });

    it('should emit select event when medication card is clicked', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      await wrapper.find('.medication-card').trigger('click');

      const selectEvents = wrapper.emitted('select');
      expect(selectEvents).toHaveLength(1);
      expect(selectEvents![0][0]).toEqual(medications[0]);
    });

    it('should emit edit event when edit button is clicked', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      const editButtons = wrapper.findAll('.btn--secondary');
      const editButton = editButtons.find(btn => btn.text() === '編集');
      await editButton!.trigger('click');

      const editEvents = wrapper.emitted('edit');
      expect(editEvents).toHaveLength(1);
      expect(editEvents![0][0]).toEqual(medications[0]);
    });

    it('should show delete confirmation when delete button is clicked', async () => {
      const medications = createTestMedications();
      const wrapper = mount(MedicationList, {
        props: {
          medications,
        },
      });

      const deleteButtons = wrapper.findAll('.btn--danger');
      await deleteButtons[0].trigger('click');

      // Should show confirmation dialog (mocked)
      expect(wrapper.find('.confirmation-dialog-mock').exists()).toBe(true);
    });
  });

  describe('Filter Options', () => {
    it('should have correct medication type filter options', () => {
      const wrapper = mount(MedicationList, {
        props: {
          medications: [],
        },
      });

      const options = wrapper.findAll('#type-filter option');
      expect(options).toHaveLength(4);
      expect(options[0].text()).toBe('すべてのタイプ');
      expect(options[1].text()).toBe('薬');
      expect(options[2].text()).toBe('サプリメント');
      expect(options[3].text()).toBe('ビタミン');
    });

    it('should have correct sort options', () => {
      const wrapper = mount(MedicationList, {
        props: {
          medications: [],
        },
      });

      const sortOptions = wrapper.findAll('#sort-by option');
      expect(sortOptions).toHaveLength(3);
      expect(sortOptions[0].text()).toBe('名前');
      expect(sortOptions[1].text()).toBe('タイプ');
      expect(sortOptions[2].text()).toBe('作成日');

      const orderOptions = wrapper.findAll('#sort-order option');
      expect(orderOptions).toHaveLength(2);
      expect(orderOptions[0].text()).toBe('昇順');
      expect(orderOptions[1].text()).toBe('降順');
    });
  });

  describe('Responsive Design', () => {
    it('should render filter section', () => {
      const wrapper = mount(MedicationList, {
        props: {
          medications: [],
        },
      });

      expect(wrapper.find('.medication-list__filters').exists()).toBe(true);
      expect(wrapper.find('#search-input').exists()).toBe(true);
      expect(wrapper.find('#type-filter').exists()).toBe(true);
      expect(wrapper.find('#sort-by').exists()).toBe(true);
      expect(wrapper.find('#sort-order').exists()).toBe(true);
    });
  });
});
