import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import ExcretionRecordList from '~/components/ExcretionRecordList.vue';
import ExcretionRecordCard from '~/components/ExcretionRecordCard.vue';
import type { Cat } from '~/types/cat-meal';
import type { ExcretionRecord, ExcretionRecordFilter } from '~/types/excretion';
import { ExcretionType } from '~/types/excretion';

// Mock ExcretionRecordCard component
vi.mock('~/components/ExcretionRecordCard.vue', () => ({
  default: {
    name: 'ExcretionRecordCard',
    props: ['record', 'loading'],
    emits: ['edit', 'delete'],
    template: `
      <div data-testid="excretion-record-card" :data-record-id="record.id">
        <div class="card-cat-name">{{ record.cat?.name }}</div>
        <div class="card-type">{{ record.type }}</div>
        <button @click="$emit('edit', record)" data-testid="card-edit-button">編集</button>
        <button @click="$emit('delete', record)" data-testid="card-delete-button">削除</button>
      </div>
    `,
  },
}));

describe('ExcretionRecordList', () => {
  const mockCats: Cat[] = [
    {
      id: 'cat1',
      name: 'ミケ',
      weight: 4.5,
      birthdate: new Date('2020-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'cat2',
      name: 'タマ',
      weight: 3.2,
      birthdate: new Date('2021-06-15'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockRecords: ExcretionRecord[] = [
    {
      id: 'record1',
      catId: 'cat1',
      type: ExcretionType.URINE,
      recordedAt: new Date('2024-01-15T10:30:00'),
      notes: 'テストメモ1',
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[0],
    },
    {
      id: 'record2',
      catId: 'cat2',
      type: ExcretionType.FECES,
      recordedAt: new Date('2024-01-15T14:00:00'),
      notes: 'テストメモ2',
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[1],
    },
    {
      id: 'record3',
      catId: 'cat1',
      type: ExcretionType.URINE,
      recordedAt: new Date('2024-01-16T09:00:00'),
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: mockCats[0],
    },
  ];

  const defaultProps = {
    records: mockRecords,
    cats: mockCats,
    total: mockRecords.length,
  };

  let wrapper: any;

  beforeEach(() => {
    wrapper = mount(ExcretionRecordList, {
      props: defaultProps,
      global: {
        components: {
          ExcretionRecordCard,
        },
      },
    });
  });

  describe('Component Rendering', () => {
    it('renders the list with all required elements', () => {
      expect(wrapper.find('.excretion-record-list').exists()).toBe(true);
      expect(wrapper.find('.list-header').exists()).toBe(true);
      expect(wrapper.find('.list-title').text()).toBe('排泄記録一覧');
    });

    it('displays record count correctly', () => {
      const recordCount = wrapper.find('.record-count');
      expect(recordCount.text()).toBe('3 / 3 件');
    });

    it('displays "記録なし" when total is 0', async () => {
      await wrapper.setProps({ total: 0, records: [] });

      const recordCount = wrapper.find('.record-count');
      expect(recordCount.text()).toBe('記録なし');
    });

    it('renders filter toggle button', () => {
      const filterButton = wrapper.find('.filter-toggle-button');
      expect(filterButton.exists()).toBe(true);
      expect(filterButton.text()).toContain('フィルター');
    });

    it('renders add button', () => {
      const addButton = wrapper.find('.add-button');
      expect(addButton.exists()).toBe(true);
      expect(addButton.text()).toContain('新規記録');
    });

    it('renders record cards', () => {
      const recordCards = wrapper.findAllComponents(ExcretionRecordCard);
      expect(recordCards).toHaveLength(3);
    });

    it('hides filters when showFilters is false', async () => {
      await wrapper.setProps({ showFilters: false });

      const filterButton = wrapper.find('.filter-toggle-button');
      expect(filterButton.exists()).toBe(false);
    });
  });

  describe('Empty State', () => {
    beforeEach(async () => {
      await wrapper.setProps({ records: [], total: 0 });
    });

    it('shows empty state when no records', () => {
      const emptyState = wrapper.find('.empty-state');
      expect(emptyState.exists()).toBe(true);
      expect(emptyState.find('.empty-title').text()).toBe('排泄記録がありません');
    });

    it('shows add button in empty state', () => {
      const emptyActionButton = wrapper.find('.empty-action-button');
      expect(emptyActionButton.exists()).toBe(true);
      expect(emptyActionButton.text()).toBe('記録を追加する');
    });

    it('emits add event when empty state button is clicked', async () => {
      const emptyActionButton = wrapper.find('.empty-action-button');
      await emptyActionButton.trigger('click');

      expect(wrapper.emitted('add')).toHaveLength(1);
    });
  });

  describe('Loading State', () => {
    it('shows loading state when loading and no records', async () => {
      await wrapper.setProps({ loading: true, records: [] });

      const loadingState = wrapper.find('.loading-state');
      expect(loadingState.exists()).toBe(true);
      expect(loadingState.text()).toContain('排泄記録を読み込み中...');
    });

    it('shows loading spinner', async () => {
      await wrapper.setProps({ loading: true, records: [] });

      const loadingSpinner = wrapper.find('.loading-spinner');
      expect(loadingSpinner.exists()).toBe(true);
    });

    it('shows loading more indicator when loading with existing records', async () => {
      await wrapper.setProps({ loading: true });

      const loadingMore = wrapper.find('.loading-more');
      expect(loadingMore.exists()).toBe(true);
      expect(loadingMore.text()).toContain('追加データを読み込み中...');
    });
  });

  describe('Filter Panel', () => {
    beforeEach(async () => {
      const filterButton = wrapper.find('.filter-toggle-button');
      await filterButton.trigger('click');
    });

    it('shows filters panel when toggle button is clicked', () => {
      const filtersPanel = wrapper.find('.filters-panel');
      expect(filtersPanel.exists()).toBe(true);
    });

    it('renders cat filter options', () => {
      const catSelect = wrapper.find('.filter-select');
      const options = catSelect.findAll('option');

      expect(options).toHaveLength(3); // "すべての猫" + 2 cats
      expect(options[0].text()).toBe('すべての猫');
      expect(options[1].text()).toBe('ミケ');
      expect(options[2].text()).toBe('タマ');
    });

    it('renders type filter options', () => {
      const typeSelects = wrapper.findAll('.filter-select');
      const typeSelect = typeSelects[1]; // Second select is for type
      const options = typeSelect.findAll('option');

      expect(options).toHaveLength(3); // "すべてのタイプ" + 2 types
      expect(options[0].text()).toBe('すべてのタイプ');
      expect(options[1].text()).toBe('おしっこ');
      expect(options[2].text()).toBe('うんち');
    });

    it('renders date range inputs', () => {
      const dateInputs = wrapper.findAll('.date-input');
      expect(dateInputs).toHaveLength(2);
    });

    it('renders quick filter buttons', () => {
      const quickFilterButtons = wrapper.findAll('.quick-filter-button');
      expect(quickFilterButtons.length).toBeGreaterThan(0);

      const buttonTexts = quickFilterButtons.map(btn => btn.text());
      expect(buttonTexts).toContain('今日');
      expect(buttonTexts).toContain('昨日');
      expect(buttonTexts).toContain('過去7日');
      expect(buttonTexts).toContain('過去30日');
    });

    it('has clear and apply buttons', () => {
      const clearButton = wrapper.find('.clear-button');
      const applyButton = wrapper.find('.apply-button');

      expect(clearButton.exists()).toBe(true);
      expect(applyButton.exists()).toBe(true);
      expect(clearButton.text()).toBe('クリア');
      expect(applyButton.text()).toBe('適用');
    });
  });

  describe('Filter Functionality', () => {
    beforeEach(async () => {
      const filterButton = wrapper.find('.filter-toggle-button');
      await filterButton.trigger('click');
    });

    it('emits filter event when cat filter is applied', async () => {
      const catSelect = wrapper.find('.filter-select');
      await catSelect.setValue('cat1');

      const applyButton = wrapper.find('.apply-button');
      await applyButton.trigger('click');

      const filterEvents = wrapper.emitted('filter');
      expect(filterEvents).toBeTruthy();
      expect(filterEvents![filterEvents!.length - 1][0]).toEqual({
        catId: 'cat1',
        type: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('emits filter event when type filter is applied', async () => {
      const typeSelects = wrapper.findAll('.filter-select');
      const typeSelect = typeSelects[1];
      await typeSelect.setValue('URINE');

      const applyButton = wrapper.find('.apply-button');
      await applyButton.trigger('click');

      const filterEvents = wrapper.emitted('filter');
      expect(filterEvents).toBeTruthy();
      expect(filterEvents![filterEvents!.length - 1][0]).toEqual({
        catId: '',
        type: 'URINE',
        startDate: undefined,
        endDate: undefined,
      });
    });

    it('emits empty filter when clear button is clicked', async () => {
      // First set some filters
      const catSelect = wrapper.find('.filter-select');
      await catSelect.setValue('cat1');

      // Then clear them
      const clearButton = wrapper.find('.clear-button');
      await clearButton.trigger('click');

      const filterEvents = wrapper.emitted('filter');
      expect(filterEvents).toBeTruthy();
      expect(filterEvents![filterEvents!.length - 1][0]).toEqual({});
    });

    it('applies quick filter correctly', async () => {
      const quickFilterButtons = wrapper.findAll('.quick-filter-button');
      const todayButton = quickFilterButtons.find(btn => btn.text() === '今日');

      if (todayButton) {
        await todayButton.trigger('click');

        const filterEvents = wrapper.emitted('filter');
        expect(filterEvents).toBeTruthy();

        const lastFilter = filterEvents![filterEvents!.length - 1][0] as ExcretionRecordFilter;
        expect(lastFilter.startDate).toBeInstanceOf(Date);
        expect(lastFilter.endDate).toBeInstanceOf(Date);
      }
    });
  });

  describe('Active Filters Display', () => {
    it('shows active filters when filters are applied', async () => {
      // Set some filters
      wrapper.vm.filters.catId = 'cat1';
      wrapper.vm.filters.type = ExcretionType.URINE;
      await wrapper.vm.$nextTick();

      const activeFilters = wrapper.find('.active-filters');
      expect(activeFilters.exists()).toBe(true);
    });

    it('displays cat filter tag', async () => {
      wrapper.vm.filters.catId = 'cat1';
      await wrapper.vm.$nextTick();

      const filterTags = wrapper.findAll('.filter-tag');
      const catTag = filterTags.find(tag => tag.text().includes('猫: ミケ'));
      expect(catTag).toBeTruthy();
    });

    it('displays type filter tag', async () => {
      wrapper.vm.filters.type = ExcretionType.URINE;
      await wrapper.vm.$nextTick();

      const filterTags = wrapper.findAll('.filter-tag');
      const typeTag = filterTags.find(tag => tag.text().includes('タイプ: おしっこ'));
      expect(typeTag).toBeTruthy();
    });

    it('removes filter when tag remove button is clicked', async () => {
      wrapper.vm.filters.catId = 'cat1';
      await wrapper.vm.$nextTick();

      const removeButton = wrapper.find('.filter-tag-remove');
      await removeButton.trigger('click');

      const filterEvents = wrapper.emitted('filter');
      expect(filterEvents).toBeTruthy();
    });
  });

  describe('Record Card Events', () => {
    it('emits edit event when record card edit is clicked', async () => {
      const recordCard = wrapper.findComponent(ExcretionRecordCard);
      await recordCard.vm.$emit('edit', mockRecords[0]);

      const editEvents = wrapper.emitted('edit');
      expect(editEvents).toHaveLength(1);
      expect(editEvents![0][0]).toEqual(mockRecords[0]);
    });

    it('emits delete event when record card delete is clicked', async () => {
      const recordCard = wrapper.findComponent(ExcretionRecordCard);
      await recordCard.vm.$emit('delete', mockRecords[0]);

      const deleteEvents = wrapper.emitted('delete');
      expect(deleteEvents).toHaveLength(1);
      expect(deleteEvents![0][0]).toEqual(mockRecords[0]);
    });
  });

  describe('Add Button', () => {
    it('emits add event when add button is clicked', async () => {
      const addButton = wrapper.find('.add-button');
      await addButton.trigger('click');

      expect(wrapper.emitted('add')).toHaveLength(1);
    });
  });

  describe('Pagination', () => {
    it('shows load more button when hasMore is true', async () => {
      await wrapper.setProps({ hasMore: true });

      const loadMoreButton = wrapper.find('.load-more-button');
      expect(loadMoreButton.exists()).toBe(true);
      expect(loadMoreButton.text()).toBe('さらに読み込む');
    });

    it('hides load more button when hasMore is false', async () => {
      await wrapper.setProps({ hasMore: false });

      const loadMoreButton = wrapper.find('.load-more-button');
      expect(loadMoreButton.exists()).toBe(false);
    });

    it('emits load-more event when load more button is clicked', async () => {
      await wrapper.setProps({ hasMore: true });

      const loadMoreButton = wrapper.find('.load-more-button');
      await loadMoreButton.trigger('click');

      expect(wrapper.emitted('load-more')).toHaveLength(1);
    });

    it('disables load more button when loading', async () => {
      await wrapper.setProps({ hasMore: true });
      wrapper.vm.isLoadingMore = true;
      await wrapper.vm.$nextTick();

      const loadMoreButton = wrapper.find('.load-more-button');
      expect(loadMoreButton.attributes('disabled')).toBeDefined();
      expect(loadMoreButton.text()).toBe('読み込み中...');
    });

    it('hides pagination when showPagination is false', async () => {
      await wrapper.setProps({ showPagination: false, hasMore: true });

      const loadMoreContainer = wrapper.find('.load-more-container');
      expect(loadMoreContainer.exists()).toBe(false);
    });
  });

  describe('Filter Toggle Button State', () => {
    it('shows active state when filters are applied', async () => {
      wrapper.vm.filters.catId = 'cat1';
      await wrapper.vm.$nextTick();

      const filterButton = wrapper.find('.filter-toggle-button');
      expect(filterButton.classes()).toContain('filter-toggle-button--active');
    });

    it('shows active indicator when filters are applied', async () => {
      wrapper.vm.filters.catId = 'cat1';
      await wrapper.vm.$nextTick();

      const activeIndicator = wrapper.find('.active-filter-indicator');
      expect(activeIndicator.exists()).toBe(true);
    });

    it('shows active state when filters panel is open', async () => {
      const filterButton = wrapper.find('.filter-toggle-button');
      await filterButton.trigger('click');

      expect(filterButton.classes()).toContain('filter-toggle-button--active');
    });
  });

  describe('Date Formatting', () => {
    it('formats date for input correctly', () => {
      const testDate = new Date('2024-01-15');
      const formatted = wrapper.vm.formatDateForInput(testDate);
      expect(formatted).toBe('2024-01-15');
    });

    it('returns empty string for undefined date', () => {
      const formatted = wrapper.vm.formatDateForInput(undefined);
      expect(formatted).toBe('');
    });

    it('parses date from input correctly', () => {
      const parsed = wrapper.vm.parseDateFromInput('2024-01-15');
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getFullYear()).toBe(2024);
      expect(parsed?.getMonth()).toBe(0); // January is 0
      expect(parsed?.getDate()).toBe(15);
    });

    it('returns undefined for empty date string', () => {
      const parsed = wrapper.vm.parseDateFromInput('');
      expect(parsed).toBeUndefined();
    });
  });

  describe('Responsive Design', () => {
    it('has responsive CSS classes', () => {
      expect(wrapper.find('.excretion-record-list').exists()).toBe(true);
      expect(wrapper.find('.list-header').exists()).toBe(true);
      expect(wrapper.find('.records-grid').exists()).toBe(true);
    });
  });

  describe('Accessibility', () => {
    it('has proper button labels', () => {
      const filterButton = wrapper.find('.filter-toggle-button');
      const addButton = wrapper.find('.add-button');

      expect(filterButton.text()).toContain('フィルター');
      expect(addButton.text()).toContain('新規記録');
    });

    it('has semantic HTML structure', () => {
      expect(wrapper.find('.list-header').exists()).toBe(true);
      expect(wrapper.find('.list-title').exists()).toBe(true);
      expect(wrapper.find('.header-actions').exists()).toBe(true);
    });

    it('has proper form labels in filters', async () => {
      const filterButton = wrapper.find('.filter-toggle-button');
      await filterButton.trigger('click');

      const filterLabels = wrapper.findAll('.filter-label');
      expect(filterLabels.length).toBeGreaterThan(0);

      const labelTexts = filterLabels.map(label => label.text());
      expect(labelTexts).toContain('猫');
      expect(labelTexts).toContain('排泄タイプ');
      expect(labelTexts).toContain('期間');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty cats array', async () => {
      await wrapper.setProps({ cats: [] });

      const filterButton = wrapper.find('.filter-toggle-button');
      await filterButton.trigger('click');

      const catSelect = wrapper.find('.filter-select');
      const options = catSelect.findAll('option');
      expect(options).toHaveLength(1); // Only "すべての猫"
    });

    it('handles records without cat information', async () => {
      const recordsWithoutCat = [
        {
          ...mockRecords[0],
          cat: undefined,
        },
      ];

      await wrapper.setProps({ records: recordsWithoutCat });

      const recordCards = wrapper.findAllComponents(ExcretionRecordCard);
      expect(recordCards).toHaveLength(1);
    });

    it('handles very large record count', async () => {
      await wrapper.setProps({ total: 999999 });

      const recordCount = wrapper.find('.record-count');
      expect(recordCount.text()).toBe('3 / 999999 件');
    });
  });
});
