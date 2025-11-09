import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref, computed } from 'vue';
import MealChart from '~/components/MealChart.vue';
import type { MealAnalytics } from '~/types/cat-meal';

// Mock Chart.js
vi.mock('chart.js', () => {
  const mockChartInstance = {
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    data: {},
    options: {},
  };

  const mockChart = vi.fn().mockImplementation(() => mockChartInstance);
  mockChart.register = vi.fn();

  return {
    Chart: mockChart,
    CategoryScale: vi.fn(),
    LinearScale: vi.fn(),
    PointElement: vi.fn(),
    LineElement: vi.fn(),
    BarElement: vi.fn(),
    Title: vi.fn(),
    Tooltip: vi.fn(),
    Legend: vi.fn(),
  };
});

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Mock useAnalyticsStore
const mockAnalyticsStore = {
  analytics: ref(null),
  loading: ref(false),
  error: ref(null),
  errorInfo: ref(null),
  errorMessage: ref(''),
  retryCount: ref(0),
  canRetry: ref(true),
  hasData: ref(false),
  hasDataQualityIssues: ref(false),
  dataQualityScore: ref(100),
  dataQualityLevel: ref('good'),
  anomaliesInfo: ref({ anomalies: [] }),
  qualityRecommendations: ref([]),
  currentChartMode: ref('line'),
  isLineChartMode: computed(() => mockAnalyticsStore.currentChartMode.value === 'line'),
  isBarChartMode: computed(() => mockAnalyticsStore.currentChartMode.value === 'bar'),
  selectedFoodType: ref(null),
  fetchAnalytics: vi.fn().mockResolvedValue({}),
  retryLastOperation: vi.fn().mockResolvedValue({}),
  setChartDisplayMode: vi.fn((mode) => {
    mockAnalyticsStore.currentChartMode.value = mode;
  }),
  toggleChartDisplayMode: vi.fn(),
  setSelectedFoodType: vi.fn(),
  restoreDisplaySettings: vi.fn(),
};

// Mock useAnalyticsStore globally
vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);

// Mock NuxtLink
const NuxtLink = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

// Mock window for responsive behavior
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

const mockAnalyticsData: MealAnalytics = {
  dailyCalories: [
    { date: '2024-01-01', calories: 250.5, type: 'DRY' },
    { date: '2024-01-02', calories: 280.0, type: 'WET' },
    { date: '2024-01-03', calories: 265.5, type: 'DRY' },
    { date: '2024-01-04', calories: 290.0, type: 'WET' },
    { date: '2024-01-05', calories: 275.5, type: 'DRY' },
  ],
  weeklyAverage: 272.3,
  foodTypeBreakdown: [
    { type: 'DRY', percentage: 60 },
    { type: 'WET', percentage: 40 },
  ],
};

const mockApiResponse = {
  analytics: mockAnalyticsData,
  summary: {
    totalMeals: 15,
    totalCalories: 1361.5,
    averageCaloriesPerMeal: 90.8,
  },
};

describe('MealChart', () => {
  const mountComponent = (props = {}) => {
    return mount(MealChart, {
      props,
      global: {
        components: {
          NuxtLink,
        },
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockApiResponse);
    // Reset analytics store state
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';
    mockAnalyticsStore.currentChartMode.value = 'line';
    mockAnalyticsStore.selectedFoodType.value = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders correctly with default props', async () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.meal-chart-container').exists()).toBe(true);
    expect(wrapper.find('.chart-controls').exists()).toBe(true);
    expect(wrapper.find('.chart-type-toggle').exists()).toBe(true);
    expect(wrapper.find('.food-type-filter').exists()).toBe(true);
    expect(wrapper.find('.date-range-filter').exists()).toBe(true);
  });

  it('shows loading state initially', async () => {
    // Set loading state in analytics store
    mockAnalyticsStore.loading.value = true;
    mockAnalyticsStore.errorMessage.value = '';
    mockAnalyticsStore.analytics.value = null;

    const wrapper = mountComponent();

    // Debug: Check actual rendered HTML
    console.log('HTML:', wrapper.html());
    console.log('Loading state:', mockAnalyticsStore.loading.value);
    console.log('Error state:', mockAnalyticsStore.errorMessage.value);

    // Should show loading spinner initially
    expect(wrapper.find('.animate-spin').exists()).toBe(true);
    expect(wrapper.find('.chart-wrapper').exists()).toBe(false);
  });

  it('fetches analytics data on mount', async () => {
    mount(MealChart);

    await nextTick();

    expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalled();
  });

  it('fetches analytics data with catId when provided', async () => {
    const catId = 1;
    mount(MealChart, {
      props: { catId },
    });

    await nextTick();

    expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalledWith(
      expect.objectContaining({
        catId,
      }),
    );
  });

  it('displays chart after data is loaded', async () => {
    // Ensure analytics data is available
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    expect(wrapper.find('.chart-wrapper').exists()).toBe(true);
    expect(wrapper.find('.chart-canvas-container').exists()).toBe(true);
    expect(wrapper.find('canvas').exists()).toBe(true);
  });

  it('displays chart summary with correct calculations', async () => {
    // Ensure analytics data is available
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    const summaryCards = wrapper.findAll('.summary-card');
    expect(summaryCards).toHaveLength(3);

    // Check total calories (sum of all daily calories: 250.5 + 280.0 + 265.5 + 290.0 + 275.5 = 1361.5)
    expect(summaryCards[0].text()).toContain('総カロリー');
    expect(summaryCards[0].text()).toContain('1361.5 kcal');

    // Check average per day (1361.5 / 5 = 272.3)
    expect(summaryCards[1].text()).toContain('1日平均');
    expect(summaryCards[1].text()).toContain('272.3 kcal');

    // Check weekly average
    expect(summaryCards[2].text()).toContain('週平均');
    expect(summaryCards[2].text()).toContain('272.3 kcal');
  });

  it('toggles between line and bar chart types', async () => {
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Find chart type toggle buttons more specifically
    const lineButton = wrapper.find('.chart-type-toggle button:first-child');
    const barButton = wrapper.find('.chart-type-toggle button:last-child');

    expect(lineButton.classes()).toContain('bg-blue-600');
    expect(barButton.classes()).toContain('bg-white');

    // Click bar chart button
    await barButton.trigger('click');

    expect(mockAnalyticsStore.setChartDisplayMode).toHaveBeenCalledWith('bar');
  });

  it('shows food type breakdown in bar chart mode', async () => {
    // Set bar chart mode and analytics data
    mockAnalyticsStore.currentChartMode.value = 'bar';
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    expect(wrapper.find('.food-breakdown').exists()).toBe(true);

    const breakdownItems = wrapper.findAll('.breakdown-item');
    expect(breakdownItems).toHaveLength(2);

    expect(breakdownItems[0].text()).toContain('ドライフード');
    expect(breakdownItems[0].text()).toContain('60%');

    expect(breakdownItems[1].text()).toContain('ウェットフード');
    expect(breakdownItems[1].text()).toContain('40%');
  });

  it('filters data by food type', async () => {
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Click dry food filter button
    const dryButton = wrapper.find('.food-type-filter button:nth-child(2)');
    await dryButton.trigger('click');

    expect(mockAnalyticsStore.setSelectedFoodType).toHaveBeenCalledWith('DRY');
  });

  it('changes date range and refetches data', async () => {
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;

    const wrapper = mount(MealChart);

    // Wait for initial data load
    await nextTick();
    await nextTick();

    // Clear previous calls
    mockAnalyticsStore.fetchAnalytics.mockClear();

    // Change date range
    const dateRangeSelect = wrapper.find('.date-range-filter select');
    await dateRangeSelect.setValue('7');

    expect(mockAnalyticsStore.fetchAnalytics).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    // Set error state in analytics store
    mockAnalyticsStore.errorMessage.value = 'API Error';
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.analytics.value = null;

    const wrapper = mount(MealChart);

    // Wait for error to be handled
    await nextTick();
    await nextTick();

    expect(wrapper.find('.error-container').exists()).toBe(true);
    expect(wrapper.text()).toContain('データの読み込みに失敗しました');

    // Should have retry button
    const retryButton = wrapper.find('.retry-button');
    expect(retryButton.exists()).toBe(true);
  });

  it('retries data fetch when retry button is clicked', async () => {
    // Set error state in analytics store
    mockAnalyticsStore.error.value = 'API Error';
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.analytics.value = null;

    const wrapper = mount(MealChart);

    // Wait for error
    await nextTick();
    await nextTick();

    // Click retry button
    const retryButton = wrapper.find('.retry-button');
    await retryButton.trigger('click');

    expect(mockAnalyticsStore.retryLastOperation).toHaveBeenCalled();
  });

  it('adapts height for mobile devices', async () => {
    // Mock mobile width
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
    });

    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;

    const wrapper = mount(MealChart, {
      props: { height: 400 },
    });

    // Wait for component to mount and data to load
    await nextTick();
    await nextTick();

    // Should use mobile height (300px) instead of prop height (400px)
    const canvas = wrapper.find('canvas');
    expect(canvas.attributes('style')).toContain('height: 300px');
  });

  it('uses custom height prop for desktop', () => {
    // Mock desktop width
    Object.defineProperty(window, 'innerWidth', {
      value: 1200,
      writable: true,
    });

    const customHeight = 500;
    const wrapper = mount(MealChart, {
      props: { height: customHeight },
    });

    const canvas = wrapper.find('canvas');
    expect(canvas.attributes('style')).toContain(`height: ${customHeight}px`);
  });

  it('handles empty analytics data', async () => {
    const emptyAnalytics = {
      dailyCalories: [],
      weeklyAverage: 0,
      foodTypeBreakdown: [
        { type: 'DRY' as const, percentage: 0 },
        { type: 'WET' as const, percentage: 0 },
      ],
    };

    // Set empty analytics data
    mockAnalyticsStore.analytics.value = emptyAnalytics;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Should still render without errors
    expect(wrapper.find('.chart-wrapper').exists()).toBe(true);

    // Summary should show zeros
    const summaryCards = wrapper.findAll('.summary-card');
    expect(summaryCards[0].text()).toContain('0.0 kcal');
    expect(summaryCards[1].text()).toContain('0.0 kcal');
    expect(summaryCards[2].text()).toContain('0.0 kcal');
  });

  it('calculates filtered totals correctly', async () => {
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.selectedFoodType.value = 'DRY';

    const wrapper = mount(MealChart);

    // Wait for data to load
    await nextTick();
    await nextTick();

    // Should recalculate totals for DRY food only
    // DRY foods: 250.5 + 265.5 + 275.5 = 791.5
    const summaryCards = wrapper.findAll('.summary-card');
    expect(summaryCards[0].text()).toContain('791.5 kcal');
    expect(summaryCards[1].text()).toContain('263.8 kcal'); // 791.5 / 3 days
  });

  it('handles responsive layout changes', async () => {
    const wrapper = mount(MealChart);

    // Wait for data to load so chart-summary is rendered
    await nextTick();
    await nextTick();

    // Should have responsive classes
    expect(wrapper.find('.chart-controls').classes()).toContain('flex-wrap');

    const chartSummary = wrapper.find('.chart-summary');
    if (chartSummary.exists()) {
      expect(chartSummary.classes()).toContain('grid');
      expect(chartSummary.classes()).toContain('md:grid-cols-3');
    }
  });
});
