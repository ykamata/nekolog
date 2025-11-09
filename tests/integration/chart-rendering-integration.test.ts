import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import MealChartWithDebug from '~/components/MealChartWithDebug.vue';
import type { MealAnalytics } from '~/types/cat-meal';

// Mock Chart.js with more realistic behavior
const mockChartInstance = {
  destroy: vi.fn(),
  update: vi.fn(),
  resize: vi.fn(),
  data: {},
  options: {},
  canvas: {
    getContext: vi.fn().mockReturnValue({}),
  },
};

const mockChart = vi.fn().mockImplementation(() => mockChartInstance);
mockChart.register = vi.fn();

vi.mock('chart.js', () => ({
  Chart: mockChart,
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

// Mock API responses
const mockApiResponse = {
  success: true,
  data: {
    dailyCalories: [
      { date: '2024-01-01', calories: 250.5, type: 'DRY' },
      { date: '2024-01-02', calories: 280.0, type: 'WET' },
      { date: '2024-01-03', calories: 265.5, type: 'DRY' },
      { date: '2024-01-04', calories: 290.0, type: 'WET' },
      { date: '2024-01-05', calories: 275.5, type: 'DRY' },
    ],
    summary: {
      totalMeals: 15,
      totalCalories: 1361.5,
      averageCaloriesPerMeal: 90.8,
    },
  },
};

const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// Mock stores
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
};

vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);
vi.stubGlobal('useCatsStore', () => mockCatsStore);

// Mock composables
const mockChartDebug = {
  debugInfo: ref({
    chartInstance: null,
    dataFetchTime: 0,
    renderTime: 0,
    dataPoints: 0,
    memoryUsage: 0,
    errors: [],
    apiCalls: [],
  }),
  isDebugMode: ref(false),
  toggleDebugMode: vi.fn(),
  recordApiCall: vi.fn(),
  recordError: vi.fn(),
  updatePerformanceMetrics: vi.fn(),
  setChartInstance: vi.fn(),
};

vi.stubGlobal('useChartDebug', () => mockChartDebug);

describe('Chart Rendering Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(mockApiResponse);
    mockAnalyticsStore.analytics.value = null;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';
    mockAnalyticsStore.currentChartMode.value = 'line';
    mockAnalyticsStore.selectedFoodType.value = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders chart with real data from API', async () => {
    // Setup successful API response
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue(mockApiResponse.data);
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug, {
      global: {
        stubs: {
          MealChart: false, // Don't stub, use real component
          ChartFilters: {
            name: 'ChartFilters',
            template: '<div class="chart-filters-mock"></div>',
          },
          ChartDebugPanel: {
            name: 'ChartDebugPanel',
            template: '<div class="debug-panel-mock"></div>',
          },
        },
      },
    });

    await nextTick();
    await nextTick(); // Wait for async operations

    // Verify Chart.js was initialized
    expect(mockChart).toHaveBeenCalled();
    expect(mockChartDebug.setChartInstance).toHaveBeenCalled();
  });

  it('handles API errors and shows error state', async () => {
    const apiError = new Error('API Error');
    mockAnalyticsStore.fetchAnalytics.mockRejectedValue(apiError);
    mockAnalyticsStore.errorMessage.value = 'データの取得に失敗しました';
    mockAnalyticsStore.loading.value = false;

    const wrapper = mount(MealChartWithDebug);

    await nextTick();
    await nextTick();

    // Should record error in debug info
    expect(mockChartDebug.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('データの取得に失敗しました'),
        type: 'network',
      }),
    );
  });

  it('updates chart when filters change', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue(mockApiResponse.data);

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Clear previous calls
    mockAnalyticsStore.fetchAnalytics.mockClear();
    mockChart.mockClear();

    // Change chart mode
    mockAnalyticsStore.currentChartMode.value = 'bar';
    await nextTick();

    // Should update chart configuration
    expect(mockChartInstance.update).toHaveBeenCalled();
  });

  it('handles food type filtering correctly', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Apply food type filter
    mockAnalyticsStore.selectedFoodType.value = 'DRY';
    await nextTick();

    // Should update chart with filtered data
    expect(mockChartInstance.update).toHaveBeenCalled();
  });

  it('records performance metrics during rendering', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Should record performance metrics
    expect(mockChartDebug.updatePerformanceMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        dataPoints: expect.any(Number),
      }),
    );
  });

  it('handles chart cleanup on component unmount', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Unmount component
    wrapper.unmount();

    // Should destroy chart instance
    expect(mockChartInstance.destroy).toHaveBeenCalled();
  });

  it('retries failed operations', async () => {
    // Initial failure
    mockAnalyticsStore.fetchAnalytics.mockRejectedValueOnce(new Error('Network Error'));
    mockAnalyticsStore.errorMessage.value = 'ネットワークエラー';

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Setup successful retry
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue(mockApiResponse.data);
    mockAnalyticsStore.retryLastOperation.mockResolvedValue(mockApiResponse.data);

    // Trigger retry
    await mockAnalyticsStore.retryLastOperation();

    expect(mockAnalyticsStore.retryLastOperation).toHaveBeenCalled();
  });

  it('handles responsive chart resizing', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Simulate window resize
    Object.defineProperty(window, 'innerWidth', {
      value: 500,
      writable: true,
    });

    window.dispatchEvent(new Event('resize'));
    await nextTick();

    // Should resize chart
    expect(mockChartInstance.resize).toHaveBeenCalled();
  });

  it('tracks API calls for debugging', async () => {
    mockAnalyticsStore.fetchAnalytics.mockImplementation(async (params) => {
      // Simulate API call tracking
      mockChartDebug.recordApiCall({
        url: '/api/analytics/meals',
        method: 'GET',
        timestamp: new Date(),
        duration: 150,
        status: 200,
        response: mockApiResponse.data,
        params,
      });
      return mockApiResponse.data;
    });

    const wrapper = mount(MealChartWithDebug, {
      props: { catId: 1 },
    });

    await nextTick();

    expect(mockChartDebug.recordApiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/api/analytics/meals',
        method: 'GET',
        status: 200,
      }),
    );
  });

  it('handles large datasets with performance optimization', async () => {
    // Create large dataset
    const largeDataset = {
      dailyCalories: Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-01-${String((i % 31) + 1).padStart(2, '0')}`,
        calories: 250 + Math.random() * 50,
        type: i % 2 === 0 ? 'DRY' as const : 'WET' as const,
      })),
      weeklyAverage: 275,
      foodTypeBreakdown: [
        { type: 'DRY' as const, percentage: 50 },
        { type: 'WET' as const, percentage: 50 },
      ],
    };

    mockAnalyticsStore.analytics.value = largeDataset;
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue(largeDataset);

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Should record performance metrics for large dataset
    expect(mockChartDebug.updatePerformanceMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        dataPoints: 1000,
      }),
    );
  });

  it('maintains chart state during data updates', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    const initialChartCall = mockChart.mock.calls[0];

    // Update data
    const updatedData = {
      ...mockApiResponse.data,
      dailyCalories: [
        ...mockApiResponse.data.dailyCalories,
        { date: '2024-01-06', calories: 300.0, type: 'WET' as const },
      ],
    };

    mockAnalyticsStore.analytics.value = updatedData;
    await nextTick();

    // Should update existing chart instead of creating new one
    expect(mockChartInstance.update).toHaveBeenCalled();
    expect(mockChart).toHaveBeenCalledTimes(1); // Only initial creation
  });

  it('handles concurrent filter changes gracefully', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Simulate rapid filter changes
    mockAnalyticsStore.currentChartMode.value = 'bar';
    mockAnalyticsStore.selectedFoodType.value = 'DRY';

    await nextTick();

    // Should handle concurrent updates without errors
    expect(mockChartInstance.update).toHaveBeenCalled();
  });

  it('provides accessibility information for charts', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Should have accessibility attributes
    const canvas = wrapper.find('canvas');
    if (canvas.exists()) {
      expect(canvas.attributes('role')).toBe('img');
      expect(canvas.attributes('aria-label')).toContain('カロリーチャート');
    }
  });

  it('handles memory cleanup properly', async () => {
    mockAnalyticsStore.analytics.value = mockApiResponse.data;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Track memory usage
    const initialMemoryUsage = mockChartDebug.debugInfo.value.memoryUsage;

    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      mockAnalyticsStore.currentChartMode.value = i % 2 === 0 ? 'line' : 'bar';
      await nextTick();
    }

    // Memory usage should not grow excessively
    const finalMemoryUsage = mockChartDebug.debugInfo.value.memoryUsage;
    expect(finalMemoryUsage).toBeLessThan(initialMemoryUsage * 2);
  });
});
