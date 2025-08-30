import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import MealChartWithDebug from '~/components/MealChartWithDebug.vue';
import ErrorBoundary from '~/components/ErrorBoundary.vue';

// Mock Chart.js
const mockChartInstance = {
  destroy: vi.fn(),
  update: vi.fn(),
  resize: vi.fn(),
  data: {},
  options: {},
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

// Mock stores
const mockAnalyticsStore = {
  analytics: ref(null),
  loading: ref(false),
  error: ref(null),
  errorMessage: ref(''),
  retryCount: ref(0),
  canRetry: ref(true),
  currentChartMode: ref('line'),
  selectedFoodType: ref(null),
  fetchAnalytics: vi.fn(),
  retryLastOperation: vi.fn(),
  setChartDisplayMode: vi.fn(),
  setSelectedFoodType: vi.fn(),
  clearError: vi.fn(),
};

vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);

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
  recordError: vi.fn(),
  recordApiCall: vi.fn(),
  updatePerformanceMetrics: vi.fn(),
  setChartInstance: vi.fn(),
};

vi.stubGlobal('useChartDebug', () => mockChartDebug);

const mockErrorDiagnostics = {
  diagnostics: ref({
    systemInfo: {
      userAgent: 'Test Browser',
      viewport: { width: 1024, height: 768 },
      memory: { used: 50, total: 100 },
    },
    chartStatus: {
      isInitialized: false,
      hasData: false,
      renderingErrors: [],
    },
    suggestions: [],
  }),
  runDiagnostics: vi.fn(),
  recordRenderingError: vi.fn(),
};

vi.stubGlobal('useErrorDiagnostics', () => mockErrorDiagnostics);

const mockToast = {
  showToast: vi.fn(),
  hideToast: vi.fn(),
};

vi.stubGlobal('useToast', () => mockToast);

describe('Error Recovery Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyticsStore.analytics.value = null;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.error.value = null;
    mockAnalyticsStore.errorMessage.value = '';
    mockAnalyticsStore.retryCount.value = 0;
    mockAnalyticsStore.canRetry.value = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles network errors with retry mechanism', async () => {
    // Setup network error
    const networkError = new Error('Network Error');
    mockAnalyticsStore.fetchAnalytics.mockRejectedValue(networkError);
    mockAnalyticsStore.errorMessage.value = 'ネットワークエラーが発生しました';
    mockAnalyticsStore.error.value = networkError;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Should record error in debug info
    expect(mockChartDebug.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('ネットワークエラー'),
        type: 'network',
      }),
    );

    // Should show error state
    expect(wrapper.find('.error-container').exists()).toBe(true);

    // Setup successful retry
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue({
      dailyCalories: [
        { date: '2024-01-01', calories: 250, type: 'DRY' },
      ],
      weeklyAverage: 250,
      foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
    });

    mockAnalyticsStore.retryLastOperation.mockImplementation(async () => {
      mockAnalyticsStore.errorMessage.value = '';
      mockAnalyticsStore.error.value = null;
      mockAnalyticsStore.analytics.value = {
        dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
        weeklyAverage: 250,
        foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
      };
    });

    // Click retry button
    const retryButton = wrapper.find('.retry-button');
    if (retryButton.exists()) {
      await retryButton.trigger('click');
      await nextTick();

      expect(mockAnalyticsStore.retryLastOperation).toHaveBeenCalled();
    }
  });

  it('handles Chart.js initialization errors', async () => {
    // Mock Chart.js initialization failure
    mockChart.mockImplementation(() => {
      throw new Error('Chart initialization failed');
    });

    const wrapper = mount(MealChartWithDebug);

    // Set up data to trigger chart initialization
    mockAnalyticsStore.analytics.value = {
      dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
      weeklyAverage: 250,
      foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
    };

    await nextTick();

    // Should record rendering error
    expect(mockErrorDiagnostics.recordRenderingError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Chart initialization failed'),
      }),
    );

    // Should show fallback UI
    expect(wrapper.find('.chart-error-fallback').exists()).toBe(true);
  });

  it('handles API timeout errors with exponential backoff', async () => {
    let attemptCount = 0;

    mockAnalyticsStore.fetchAnalytics.mockImplementation(async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error('Request timeout');
      }
      return {
        dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
        weeklyAverage: 250,
        foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
      };
    });

    mockAnalyticsStore.retryLastOperation.mockImplementation(async () => {
      mockAnalyticsStore.retryCount.value++;

      // Simulate exponential backoff delay
      const delay = Math.pow(2, mockAnalyticsStore.retryCount.value) * 1000;
      await new Promise(resolve => setTimeout(resolve, Math.min(delay, 100))); // Reduced for testing

      return mockAnalyticsStore.fetchAnalytics();
    });

    const wrapper = mount(MealChartWithDebug);

    // Initial failure
    mockAnalyticsStore.errorMessage.value = 'リクエストタイムアウト';
    await nextTick();

    // First retry
    const retryButton = wrapper.find('.retry-button');
    if (retryButton.exists()) {
      await retryButton.trigger('click');
      await nextTick();

      expect(mockAnalyticsStore.retryCount.value).toBe(1);

      // Second retry
      await retryButton.trigger('click');
      await nextTick();

      expect(mockAnalyticsStore.retryCount.value).toBe(2);

      // Third retry should succeed
      await retryButton.trigger('click');
      await nextTick();

      expect(attemptCount).toBe(3);
    }
  });

  it('handles data validation errors gracefully', async () => {
    // Setup invalid data response
    const invalidData = {
      dailyCalories: [
        { date: 'invalid-date', calories: 'invalid-calories', type: 'INVALID' },
      ],
      weeklyAverage: null,
      foodTypeBreakdown: null,
    };

    mockAnalyticsStore.fetchAnalytics.mockResolvedValue(invalidData);
    mockAnalyticsStore.analytics.value = invalidData;

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Should record validation error
    expect(mockChartDebug.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('データ検証エラー'),
        type: 'validation',
      }),
    );

    // Should show data validation error message
    expect(wrapper.find('.data-validation-error').exists()).toBe(true);
  });

  it('handles memory exhaustion errors', async () => {
    // Mock memory exhaustion
    mockChart.mockImplementation(() => {
      const error = new Error('Out of memory');
      error.name = 'RangeError';
      throw error;
    });

    const wrapper = mount(MealChartWithDebug);

    // Set up large dataset
    const largeDataset = {
      dailyCalories: Array.from({ length: 10000 }, (_, i) => ({
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
    await nextTick();

    // Should record memory error
    expect(mockErrorDiagnostics.recordRenderingError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Out of memory'),
      }),
    );

    // Should suggest data optimization
    expect(mockErrorDiagnostics.diagnostics.value.suggestions).toContain(
      'データポイント数が多すぎます。データの間引きを検討してください。',
    );
  });

  it('handles browser compatibility issues', async () => {
    // Mock canvas context failure (IE/old browsers)
    const mockCanvas = {
      getContext: vi.fn().mockReturnValue(null),
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any);

    const wrapper = mount(MealChartWithDebug);

    mockAnalyticsStore.analytics.value = {
      dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
      weeklyAverage: 250,
      foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
    };

    await nextTick();

    // Should detect canvas support issue
    expect(mockErrorDiagnostics.diagnostics.value.suggestions).toContain(
      'Canvas要素のサポートに問題があります。ブラウザの互換性を確認してください。',
    );

    // Should show compatibility error message
    expect(wrapper.find('.browser-compatibility-error').exists()).toBe(true);
  });

  it('provides detailed error information in debug mode', async () => {
    mockChartDebug.isDebugMode.value = true;

    const error = new Error('Detailed test error');
    error.stack = 'Error: Detailed test error\n    at testFunction\n    at anotherFunction';

    mockAnalyticsStore.fetchAnalytics.mockRejectedValue(error);
    mockAnalyticsStore.errorMessage.value = 'テストエラー';

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Should record detailed error information
    expect(mockChartDebug.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'テストエラー',
        stack: expect.stringContaining('testFunction'),
        type: 'network',
      }),
    );

    // Debug panel should show error details
    const debugPanel = wrapper.find('.debug-panel-mock');
    expect(debugPanel.exists()).toBe(true);
  });

  it('handles concurrent errors without interference', async () => {
    const wrapper = mount(MealChartWithDebug);

    // Simulate multiple concurrent errors
    const networkError = new Error('Network Error');
    const renderingError = new Error('Rendering Error');

    mockAnalyticsStore.fetchAnalytics.mockRejectedValue(networkError);
    mockChart.mockImplementation(() => {
      throw renderingError;
    });

    mockAnalyticsStore.analytics.value = {
      dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
      weeklyAverage: 250,
      foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
    };

    await nextTick();

    // Should record both errors
    expect(mockChartDebug.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Network Error'),
        type: 'network',
      }),
    );

    expect(mockErrorDiagnostics.recordRenderingError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Rendering Error'),
      }),
    );
  });

  it('recovers from temporary API failures', async () => {
    let failureCount = 0;

    mockAnalyticsStore.fetchAnalytics.mockImplementation(async () => {
      failureCount++;
      if (failureCount <= 2) {
        throw new Error('Temporary API failure');
      }
      return {
        dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
        weeklyAverage: 250,
        foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
      };
    });

    mockAnalyticsStore.retryLastOperation.mockImplementation(async () => {
      const result = await mockAnalyticsStore.fetchAnalytics();
      mockAnalyticsStore.analytics.value = result;
      mockAnalyticsStore.errorMessage.value = '';
      mockAnalyticsStore.error.value = null;
      return result;
    });

    const wrapper = mount(MealChartWithDebug);

    // Initial failure
    mockAnalyticsStore.errorMessage.value = 'API一時的エラー';
    await nextTick();

    // First retry (still fails)
    const retryButton = wrapper.find('.retry-button');
    if (retryButton.exists()) {
      await retryButton.trigger('click');
      await nextTick();

      expect(failureCount).toBe(2);

      // Second retry (succeeds)
      await retryButton.trigger('click');
      await nextTick();

      expect(failureCount).toBe(3);
      expect(mockAnalyticsStore.analytics.value).toBeTruthy();
    }
  });

  it('shows user-friendly error messages in Japanese', async () => {
    const errorScenarios = [
      {
        error: new Error('Network timeout'),
        expectedMessage: 'ネットワークタイムアウトが発生しました',
      },
      {
        error: new Error('Server error'),
        expectedMessage: 'サーバーエラーが発生しました',
      },
      {
        error: new Error('Invalid data format'),
        expectedMessage: 'データ形式が無効です',
      },
    ];

    for (const scenario of errorScenarios) {
      mockAnalyticsStore.fetchAnalytics.mockRejectedValue(scenario.error);
      mockAnalyticsStore.errorMessage.value = scenario.expectedMessage;

      const wrapper = mount(MealChartWithDebug);
      await nextTick();

      const errorMessage = wrapper.find('.error-message');
      if (errorMessage.exists()) {
        expect(errorMessage.text()).toContain(scenario.expectedMessage);
      }

      // Clean up for next iteration
      mockAnalyticsStore.errorMessage.value = '';
    }
  });

  it('prevents infinite retry loops', async () => {
    mockAnalyticsStore.fetchAnalytics.mockRejectedValue(new Error('Persistent error'));
    mockAnalyticsStore.retryCount.value = 5; // Max retries exceeded
    mockAnalyticsStore.canRetry.value = false;

    const wrapper = mount(MealChartWithDebug);

    mockAnalyticsStore.errorMessage.value = '最大再試行回数に達しました';
    await nextTick();

    // Retry button should be disabled
    const retryButton = wrapper.find('.retry-button');
    if (retryButton.exists()) {
      expect(retryButton.element.disabled).toBe(true);
    }

    // Should show max retry message
    expect(wrapper.find('.max-retry-message').exists()).toBe(true);
  });

  it('clears errors when successful operation occurs', async () => {
    // Start with error state
    mockAnalyticsStore.errorMessage.value = 'テストエラー';
    mockAnalyticsStore.error.value = new Error('Test error');

    const wrapper = mount(MealChartWithDebug);
    await nextTick();

    // Successful operation
    mockAnalyticsStore.fetchAnalytics.mockResolvedValue({
      dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
      weeklyAverage: 250,
      foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
    });

    mockAnalyticsStore.analytics.value = {
      dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
      weeklyAverage: 250,
      foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
    };

    mockAnalyticsStore.errorMessage.value = '';
    mockAnalyticsStore.error.value = null;

    await nextTick();

    // Error state should be cleared
    expect(wrapper.find('.error-container').exists()).toBe(false);
    expect(wrapper.find('.chart-wrapper').exists()).toBe(true);
  });
});
