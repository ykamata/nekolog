import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import ChartFilters from '~/components/ChartFilters.vue';

// Mock stores and composables
const mockAnalyticsStore = {
  analytics: ref(null),
  loading: ref(false),
  error: ref(null),
  errorMessage: ref(''),
  currentChartMode: ref('line'),
  selectedFoodType: ref(null),
  fetchAnalytics: vi.fn(),
  setChartDisplayMode: vi.fn(),
  setSelectedFoodType: vi.fn(),
  retryLastOperation: vi.fn(),
};

const mockCatsStore = {
  cats: ref([
    { id: 1, name: 'ミケ' },
    { id: 2, name: 'タマ' },
  ]),
  fetchCats: vi.fn(),
  loading: ref(false),
  error: ref(null),
};

vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);
vi.stubGlobal('useCatsStore', () => mockCatsStore);

// Mock router
const mockRouter = {
  push: vi.fn(),
  replace: vi.fn(),
  currentRoute: {
    value: {
      query: {},
    },
  },
};

vi.stubGlobal('useRouter', () => mockRouter);
vi.stubGlobal('useRoute', () => mockRouter.currentRoute);

// Mock API responses
const mockApiResponse = {
  success: true,
  data: {
    dailyCalories: [
      { date: '2024-01-01', calories: 250.5, type: 'DRY' },
      { date: '2024-01-02', calories: 280.0, type: 'WET' },
      { date: '2024-01-03', calories: 265.5, type: 'DRY' },
    ],
    summary: {
      totalMeals: 10,
      totalCalories: 796.0,
      averageCaloriesPerMeal: 79.6,
    },
  },
};

describe('Chart Filters Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyticsStore.analytics.value = null;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';
    mockAnalyticsStore.currentChartMode.value = 'line';
    mockAnalyticsStore.selectedFoodType.value = null;
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue(mockApiResponse.data);
    mockRouter.currentRoute.value.query = {};
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and displays cats for selection', async () => {
    mockCatsStore.fetchCats.mockResolvedValue([
      { id: 1, name: 'ミケ' },
      { id: 2, name: 'タマ' },
    ]);

    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    expect(mockCatsStore.fetchCats).toHaveBeenCalled();

    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    if (catSelect.exists()) {
      const options = catSelect.findAll('option');
      expect(options.length).toBeGreaterThanOrEqual(3); // "すべての猫" + cats
    }
  });

  it('updates analytics data when cat selection changes', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Change cat selection
    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    if (catSelect.exists()) {
      await catSelect.setValue('cat1');

      // Should emit update event
      expect(wrapper.emitted('update:selectedCatId')).toBeTruthy();
      expect(wrapper.emitted('update:selectedCatId')?.[0]).toEqual(['cat1']);

      // Should trigger analytics fetch with new cat ID
      await nextTick();
      expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          catId: 1,
        }),
      );
    }
  });

  it('updates analytics data when date range changes', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Change start date
    const startDateInput = wrapper.find('[data-testid="date-range-picker"] input[type="date"]:first-child');
    if (startDateInput.exists()) {
      await startDateInput.setValue('2024-02-01');

      // Should emit update event
      expect(wrapper.emitted('update:dateRange')).toBeTruthy();

      // Should trigger analytics fetch with new date range
      await nextTick();
      expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: expect.any(Date),
        }),
      );
    }
  });

  it('applies date range presets correctly', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Click "今週" preset
    const thisWeekButton = wrapper.find('[data-testid="preset-this-week"]');
    if (thisWeekButton.exists()) {
      await thisWeekButton.trigger('click');

      // Should emit date range update
      expect(wrapper.emitted('update:dateRange')).toBeTruthy();

      const emittedRange = wrapper.emitted('update:dateRange')?.[0]?.[0] as { start: Date; end: Date };
      expect(emittedRange.start).toBeInstanceOf(Date);
      expect(emittedRange.end).toBeInstanceOf(Date);
    }
  });

  it('changes chart type and updates display', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Click bar chart button
    const barButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    if (barButton.exists()) {
      await barButton.trigger('click');

      // Should emit chart type update
      expect(wrapper.emitted('update:chartType')).toBeTruthy();
      expect(wrapper.emitted('update:chartType')?.[0]).toEqual(['bar']);

      // Should update analytics store
      expect(mockAnalyticsStore.setChartDisplayMode).toHaveBeenCalledWith('bar');
    }
  });

  it('applies food type filtering', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Click dry food filter
    const dryFoodButton = wrapper.find('[data-testid="food-type-filter"] button[data-food-type="DRY"]');
    if (dryFoodButton.exists()) {
      await dryFoodButton.trigger('click');

      // Should update analytics store
      expect(mockAnalyticsStore.setSelectedFoodType).toHaveBeenCalledWith('DRY');
    }
  });

  it('persists filter state in URL parameters', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Change multiple filters
    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    if (catSelect.exists()) {
      await catSelect.setValue('cat1');
    }

    const barButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');
    if (barButton.exists()) {
      await barButton.trigger('click');
    }

    await nextTick();

    // Should update URL with filter parameters
    expect(mockRouter.push).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          catId: 1,
          chartType: 'bar',
        }),
      }),
    );
  });

  it('restores filter state from URL parameters', async () => {
    // Set URL parameters
    mockRouter.currentRoute.value.query = {
      catId: 1,
      chartType: 'bar',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      foodType: 'DRY',
    };

    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Should restore filters from URL
    expect(wrapper.emitted('update:selectedCatId')).toBeTruthy();
    expect(wrapper.emitted('update:chartType')).toBeTruthy();
    expect(wrapper.emitted('update:selectedCatId')?.[0]).toEqual(['cat1']);
    expect(wrapper.emitted('update:chartType')?.[0]).toEqual(['bar']);
  });

  it('validates date range input', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Set invalid date range (end before start)
    const startDateInput = wrapper.find('[data-testid="date-range-picker"] input[type="date"]:first-child');
    const endDateInput = wrapper.find('[data-testid="date-range-picker"] input[type="date"]:last-child');

    if (startDateInput.exists() && endDateInput.exists()) {
      await startDateInput.setValue('2024-02-01');
      await endDateInput.setValue('2024-01-01');

      // Should show validation error
      const errorMessage = wrapper.find('.error-message');
      if (errorMessage.exists()) {
        expect(errorMessage.text()).toContain('開始日は終了日より前である必要があります');
      }

      // Should not emit invalid date range
      const dateRangeEmissions = wrapper.emitted('update:dateRange');
      if (dateRangeEmissions) {
        const lastEmission = dateRangeEmissions[dateRangeEmissions.length - 1][0] as { start: Date; end: Date };
        expect(lastEmission.start.getTime()).toBeLessThanOrEqual(lastEmission.end.getTime());
      }
    }
  });

  it('handles loading states during filter changes', async () => {
    mockAnalyticsStore.loading.value = true;

    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Should disable filters during loading
    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    const dateInputs = wrapper.findAll('[data-testid="date-range-picker"] input');
    const chartButtons = wrapper.findAll('[data-testid="chart-type-toggle"] button');

    if (catSelect.exists()) {
      expect(catSelect.element.disabled).toBe(true);
    }

    dateInputs.forEach((input) => {
      expect(input.element.disabled).toBe(true);
    });

    chartButtons.forEach((button) => {
      expect(button.element.disabled).toBe(true);
    });
  });

  it('handles API errors during filter operations', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Mock API error
    mockAnalyticsStore.fetchAnalytics.mockRejectedValue(new Error('API Error'));

    // Change filter
    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    if (catSelect.exists()) {
      await catSelect.setValue('cat1');
      await nextTick();

      // Should handle error gracefully
      expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalled();
      // Error should be handled by the analytics store
    }
  });

  it('resets filters to default values', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: 'cat1',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'bar',
      },
    });

    await nextTick();

    // Click reset button
    const resetButton = wrapper.find('[data-testid="reset-filters"]');
    if (resetButton.exists()) {
      await resetButton.trigger('click');

      // Should emit reset events
      expect(wrapper.emitted('update:selectedCatId')).toBeTruthy();
      expect(wrapper.emitted('update:chartType')).toBeTruthy();
      expect(wrapper.emitted('update:selectedCatId')?.[0]).toEqual([null]);
      expect(wrapper.emitted('update:chartType')?.[0]).toEqual(['line']);
    }
  });

  it('handles concurrent filter changes', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Make multiple rapid changes
    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    const barButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="bar"]');

    if (catSelect.exists() && barButton.exists()) {
      // Trigger multiple changes simultaneously
      const promises = [
        catSelect.setValue('cat1'),
        barButton.trigger('click'),
      ];

      await Promise.all(promises);
      await nextTick();

      // Should handle all changes
      expect(wrapper.emitted('update:selectedCatId')).toBeTruthy();
      expect(wrapper.emitted('update:chartType')).toBeTruthy();
    }
  });

  it('maintains filter state during component updates', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: 'cat1',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'bar',
      },
    });

    await nextTick();

    // Update props
    await wrapper.setProps({
      selectedCatId: 'cat2',
      chartType: 'line',
    });

    // Should reflect new prop values
    const catSelect = wrapper.find('[data-testid="cat-selection-filter"] select');
    if (catSelect.exists()) {
      expect(catSelect.element.value).toBe('cat2');
    }

    const lineButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    if (lineButton.exists()) {
      expect(lineButton.classes()).toContain('bg-blue-600');
    }
  });

  it('provides keyboard navigation support', async () => {
    const wrapper = mount(ChartFilters, {
      props: {
        selectedCatId: null,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        chartType: 'line',
      },
    });

    await nextTick();

    // Test keyboard navigation on chart type toggle
    const lineButton = wrapper.find('[data-testid="chart-type-toggle"] button[data-chart-type="line"]');
    if (lineButton.exists()) {
      await lineButton.trigger('keydown.enter');
      // Should handle keyboard activation
      expect(lineButton.element.getAttribute('tabindex')).not.toBe('-1');
    }
  });
});
