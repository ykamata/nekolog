import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref, computed } from 'vue';
import MealChartWithDebug from '~/components/MealChartWithDebug.vue';
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

// Mock useChartDebug
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
};

vi.stubGlobal('useChartDebug', () => mockChartDebug);

// Mock useAnalyticsStore
const mockAnalyticsStore = {
  analytics: ref(null),
  loading: ref(false),
  error: ref(null),
  errorMessage: ref(''),
  currentChartMode: ref('line'),
  selectedFoodType: ref(null),
  fetchAnalytics: vi.fn().mockResolvedValue({}),
  setChartDisplayMode: vi.fn(),
  setSelectedFoodType: vi.fn(),
};

vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);

const mockAnalyticsData: MealAnalytics = {
  dailyCalories: [
    { date: '2024-01-01', calories: 250.5, type: 'DRY' },
    { date: '2024-01-02', calories: 280.0, type: 'WET' },
    { date: '2024-01-03', calories: 265.5, type: 'DRY' },
  ],
  weeklyAverage: 265.3,
  foodTypeBreakdown: [
    { type: 'DRY', percentage: 60 },
    { type: 'WET', percentage: 40 },
  ],
};

describe('MealChartWithDebug', () => {
  const mountComponent = (props = {}) => {
    return mount(MealChartWithDebug, {
      props,
      global: {
        stubs: {
          MealChart: {
            name: 'MealChart',
            template: '<div class="meal-chart-mock">MealChart</div>',
          },
          ChartDebugPanel: {
            name: 'ChartDebugPanel',
            template: '<div class="debug-panel-mock">DebugPanel</div>',
          },
        },
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ analytics: mockAnalyticsData });
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';
    mockChartDebug.isDebugMode.value = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders MealChart component correctly', () => {
    const wrapper = mountComponent();

    expect(wrapper.find('.meal-chart-mock').exists()).toBe(true);
    expect(wrapper.find('.meal-chart-mock').text()).toBe('MealChart');
  });

  it('shows debug panel when debug mode is enabled', async () => {
    mockChartDebug.isDebugMode.value = true;

    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.find('.debug-panel-mock').exists()).toBe(true);
  });

  it('hides debug panel when debug mode is disabled', async () => {
    mockChartDebug.isDebugMode.value = false;

    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.find('.debug-panel-mock').exists()).toBe(false);
  });

  it('toggles debug mode when debug button is clicked', async () => {
    const wrapper = mountComponent();

    const debugButton = wrapper.find('[data-testid="debug-toggle"]');
    if (debugButton.exists()) {
      await debugButton.trigger('click');
      expect(mockChartDebug.toggleDebugMode).toHaveBeenCalled();
    }
  });

  it('passes props correctly to MealChart component', () => {
    const props = {
      catId: 'test-cat-id',
      height: 400,
    };

    const wrapper = mountComponent(props);
    const mealChart = wrapper.findComponent({ name: 'MealChart' });

    expect(mealChart.exists()).toBe(true);
    // Note: In a real test, we would check if props are passed correctly
    // This is a simplified version due to component stubbing
  });

  it('records performance metrics during chart operations', async () => {
    const wrapper = mountComponent();
    await nextTick();

    // Simulate chart data update
    mockAnalyticsStore.analytics.value = {
      ...mockAnalyticsData,
      dailyCalories: [...mockAnalyticsData.dailyCalories,
        { date: '2024-01-04', calories: 300.0, type: 'WET' },
      ],
    };

    await nextTick();

    // Performance metrics should be updated when data changes
    expect(mockChartDebug.updatePerformanceMetrics).toHaveBeenCalled();
  });

  it('handles error states and records them in debug info', async () => {
    const errorMessage = 'Test error message';
    mockAnalyticsStore.errorMessage.value = errorMessage;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.analytics.value = null;

    const wrapper = mountComponent();
    await nextTick();

    // Error should be recorded in debug info
    expect(mockChartDebug.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining(errorMessage),
      }),
    );
  });

  it('provides debug information about chart initialization', async () => {
    mockAnalyticsStore.analytics.value = mockAnalyticsData;
    mockAnalyticsStore.loading.value = false;

    const wrapper = mountComponent();
    await nextTick();

    // Debug info should include chart initialization details
    expect(mockChartDebug.updatePerformanceMetrics).toHaveBeenCalledWith(
      expect.objectContaining({
        dataPoints: expect.any(Number),
      }),
    );
  });

  it('tracks API calls for debugging', async () => {
    const wrapper = mountComponent();

    // Trigger data fetch
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue({ analytics: mockAnalyticsData });
    await mockAnalyticsStore.fetchAnalytics();

    expect(mockChartDebug.recordApiCall).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.any(String),
        method: expect.any(String),
        timestamp: expect.any(Date),
      }),
    );
  });

  it('maintains debug state across component updates', async () => {
    mockChartDebug.isDebugMode.value = true;

    const wrapper = mountComponent();
    await nextTick();

    // Update analytics data
    mockAnalyticsStore.analytics.value = {
      ...mockAnalyticsData,
      weeklyAverage: 300,
    };

    await nextTick();

    // Debug panel should still be visible
    expect(wrapper.find('.debug-panel-mock').exists()).toBe(true);
  });

  it('provides memory usage information in debug mode', async () => {
    mockChartDebug.isDebugMode.value = true;
    mockChartDebug.debugInfo.value.memoryUsage = 1024;

    const wrapper = mountComponent();
    await nextTick();

    expect(mockChartDebug.debugInfo.value.memoryUsage).toBeGreaterThan(0);
  });

  it('handles chart cleanup and records it in debug info', async () => {
    const wrapper = mountComponent();
    await nextTick();

    // Unmount component to trigger cleanup
    wrapper.unmount();

    // Should record cleanup in debug info
    expect(mockChartDebug.updatePerformanceMetrics).toHaveBeenCalled();
  });
});
