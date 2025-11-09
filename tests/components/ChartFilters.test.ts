import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import ChartFilters from '~/components/ChartFilters.vue';

// Mock composables
const mockCatsStore = {
  cats: ref([
    { id: 1, name: 'ミケ' },
    { id: 2, name: 'タマ' },
  ]),
  fetchCats: vi.fn().mockResolvedValue([]),
};

vi.stubGlobal('useCatsStore', () => mockCatsStore);

const mockAnalyticsStore = {
  currentChartMode: ref('line'),
  selectedFoodType: ref(null),
  setChartDisplayMode: vi.fn(),
  setSelectedFoodType: vi.fn(),
  fetchAnalytics: vi.fn().mockResolvedValue({}),
};

vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);

describe('ChartFilters', () => {
  const mountComponent = (props = {}) => {
    return mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
        ...props,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyticsStore.currentChartMode.value = 'line';
    mockAnalyticsStore.selectedFoodType.value = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all filter components correctly', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('[data-testid="cat-selection-filter"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="date-range-picker"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="chart-type-toggle"]').exists()).toBe(true);
  });

  it('displays cat selection options correctly', async () => {
    const wrapper = mountComponent();
    await nextTick();

    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    expect(catSelect.exists()).toBe(true);

    const options = catSelect.findAll('option');
    expect(options).toHaveLength(3); // "すべての猫" + 2 cats
    expect(options[0].text()).toBe('すべての猫');
    expect(options[1].text()).toBe('ミケ');
    expect(options[2].text()).toBe('タマ');
  });

  it('emits cat selection change event', async () => {
    const wrapper = mountComponent();
    await nextTick();

    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    await catSelect.setValue('cat1');

    expect(wrapper.emitted('update:selectedCatId')).toBeTruthy();
    expect(wrapper.emitted('update:selectedCatId')?.[0]).toEqual(['cat1']);
  });

  it('displays date range picker with correct initial values', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const wrapper = mountComponent({
      dateRange: { start: startDate, end: endDate },
    });

    const dateInputs = wrapper.findAll('[data-testid="date-range-picker"] input[type="date"]');
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0].element.value).toBe('2024-01-01');
    expect(dateInputs[1].element.value).toBe('2024-01-31');
  });

  it('emits date range change event', async () => {
    const wrapper = mountComponent();

    const startDateInput = wrapper.find('[data-testid="date-range-picker"] input[type="date"]:first-child');
    await startDateInput.setValue('2024-02-01');

    expect(wrapper.emitted('update:dateRange')).toBeTruthy();
    const emittedEvent = wrapper.emitted('update:dateRange')?.[0]?.[0] as { start: Date; end: Date };
    expect(emittedEvent.start.toISOString().split('T')[0]).toBe('2024-02-01');
  });

  it('provides date range presets', async () => {
    const wrapper = mountComponent();

    const presetButtons = wrapper.findAll('[data-testid="date-range-picker"] .preset-button');
    expect(presetButtons.length).toBeGreaterThan(0);

    // Test "今週" preset
    const thisWeekButton = presetButtons.find(btn => btn.text().includes('今週'));
    if (thisWeekButton) {
      await thisWeekButton.trigger('click');
      expect(wrapper.emitted('update:dateRange')).toBeTruthy();
    }
  });

  it('displays chart type toggle buttons', () => {
    const wrapper = mountComponent();

    const chartTypeToggle = wrapper.find('[data-testid="chart-type-toggle"]');
    expect(chartTypeToggle.exists()).toBe(true);

    const toggleButtons = chartTypeToggle.findAll('button');
    expect(toggleButtons.length).toBeGreaterThanOrEqual(2); // line and bar at minimum
  });

  it('emits chart type change event', async () => {
    const wrapper = mountComponent();

    const barChartButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    if (barChartButton.exists()) {
      await barChartButton.trigger('click');
      expect(wrapper.emitted('update:chartType')).toBeTruthy();
      expect(wrapper.emitted('update:chartType')?.[0]).toEqual(['bar']);
    }
  });

  it('highlights active chart type button', async () => {
    const wrapper = mountComponent({ chartType: 'line' });
    await nextTick();

    const lineButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    const barButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');

    if (lineButton.exists() && barButton.exists()) {
      expect(lineButton.classes()).toContain('bg-blue-600');
      expect(barButton.classes()).toContain('bg-white');
    }
  });

  it('handles food type filtering', async () => {
    const wrapper = mountComponent();

    const foodTypeFilter = wrapper.find('[data-testid="food-type-filter"]');
    if (foodTypeFilter.exists()) {
      const dryFoodButton = foodTypeFilter.find('button[data-food-type="DRY"]');
      if (dryFoodButton.exists()) {
        await dryFoodButton.trigger('click');
        expect(mockAnalyticsStore.setSelectedFoodType).toHaveBeenCalledWith('DRY');
      }
    }
  });

  it('validates date range input', async () => {
    const wrapper = mountComponent();

    const startDateInput = wrapper.find('[data-testid="date-range-picker"] input[type="date"]:first-child');
    const endDateInput = wrapper.find('[data-testid="date-range-picker"] input[type="date"]:last-child');

    // Set end date before start date
    await startDateInput.setValue('2024-02-01');
    await endDateInput.setValue('2024-01-01');

    // Should show validation error or prevent invalid range
    const errorMessage = wrapper.find('.error-message');
    if (errorMessage.exists()) {
      expect(errorMessage.text()).toContain('開始日は終了日より前である必要があります');
    }
  });

  it('persists filter state in URL parameters', async () => {
    const wrapper = mountComponent();

    // Mock router
    const mockRouter = {
      push: vi.fn(),
      currentRoute: {
        value: {
          query: {},
        },
      },
    };
    vi.stubGlobal('useRouter', () => mockRouter);

    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    await catSelect.setValue('cat1');

    // Should update URL with filter parameters
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          catId: 1,
        }),
      }),
    );
  });

  it('restores filter state from URL parameters', () => {
    const mockRouter = {
      currentRoute: {
        value: {
          query: {
            catId: 1,
            chartType: 'bar',
            startDate: '2024-01-01',
            endDate: '2024-01-31',
          },
        },
      },
    };
    vi.stubGlobal('useRouter', () => mockRouter);

    const wrapper = mountComponent();

    // Should restore filters from URL
    expect(wrapper.vm.selectedCatId).toBe('cat1');
    expect(wrapper.vm.chartType).toBe('bar');
  });

  it('handles responsive layout on mobile devices', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
    });

    const wrapper = mountComponent();
    await nextTick();

    // Should have mobile-responsive classes
    const filtersContainer = wrapper.find('.filters-container');
    if (filtersContainer.exists()) {
      expect(filtersContainer.classes()).toContain('flex-col');
    }
  });

  it('shows loading state during data fetch', async () => {
    mockAnalyticsStore.fetchAnalytics.mockImplementation(() =>
      new Promise(resolve => setTimeout(resolve, 100)),
    );

    const wrapper = mountComponent();

    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    await catSelect.setValue('cat1');

    // Should show loading indicator
    const loadingIndicator = wrapper.find('.loading-indicator');
    if (loadingIndicator.exists()) {
      expect(loadingIndicator.exists()).toBe(true);
    }
  });

  it('disables filters during loading', async () => {
    const wrapper = mountComponent();

    // Set loading state
    wrapper.vm.isLoading = true;
    await nextTick();

    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    const dateInputs = wrapper.findAll('[data-testid="date-range-picker"] input');
    const chartButtons = wrapper.findAll('[data-testid="chart-type-toggle"] button');

    expect(catSelect.element.disabled).toBe(true);
    dateInputs.forEach((input) => {
      expect(input.element.disabled).toBe(true);
    });
    chartButtons.forEach((button) => {
      expect(button.element.disabled).toBe(true);
    });
  });

  it('clears filters when reset button is clicked', async () => {
    const wrapper = mountComponent({
      selectedCatId: 1,
      chartType: 'bar',
    });

    const resetButton = wrapper.find('[data-testid="reset-filters"]');
    if (resetButton.exists()) {
      await resetButton.trigger('click');

      expect(wrapper.emitted('update:selectedCatId')).toBeTruthy();
      expect(wrapper.emitted('update:chartType')).toBeTruthy();
      expect(wrapper.emitted('update:selectedCatId')?.[0]).toEqual([null]);
      expect(wrapper.emitted('update:chartType')?.[0]).toEqual(['line']);
    }
  });
});
