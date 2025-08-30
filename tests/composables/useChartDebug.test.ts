import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useChartDebug } from '~/composables/useChartDebug';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1024 * 1024, // 1MB
    totalJSHeapSize: 2 * 1024 * 1024, // 2MB
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock Chart.js instance
const mockChartInstance = {
  data: {
    datasets: [
      { data: [1, 2, 3, 4, 5] },
      { data: [2, 3, 4, 5, 6] },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
  },
  destroy: vi.fn(),
  update: vi.fn(),
  resize: vi.fn(),
};

describe('useChartDebug', () => {
  let chartDebug: ReturnType<typeof useChartDebug>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    chartDebug = useChartDebug();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default debug info', () => {
    expect(chartDebug.debugInfo.value).toEqual({
      chartInstance: null,
      dataFetchTime: 0,
      renderTime: 0,
      dataPoints: 0,
      memoryUsage: 0,
      errors: [],
      apiCalls: [],
    });
    expect(chartDebug.isDebugMode.value).toBe(false);
  });

  it('toggles debug mode', () => {
    expect(chartDebug.isDebugMode.value).toBe(false);

    chartDebug.toggleDebugMode();
    expect(chartDebug.isDebugMode.value).toBe(true);

    chartDebug.toggleDebugMode();
    expect(chartDebug.isDebugMode.value).toBe(false);
  });

  it('persists debug mode state in localStorage', () => {
    chartDebug.toggleDebugMode();

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'chart-debug-mode',
      'true',
    );
  });

  it('restores debug mode state from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue('true');

    const newChartDebug = useChartDebug();
    expect(newChartDebug.isDebugMode.value).toBe(true);
  });

  it('records API calls with timing information', () => {
    const apiCall = {
      url: '/api/analytics/meals',
      method: 'GET',
      timestamp: new Date(),
      duration: 150,
      status: 200,
      response: { success: true, data: [] },
    };

    chartDebug.recordApiCall(apiCall);

    expect(chartDebug.debugInfo.value.apiCalls).toHaveLength(1);
    expect(chartDebug.debugInfo.value.apiCalls[0]).toEqual(apiCall);
  });

  it('limits API call history to prevent memory leaks', () => {
    // Add more than the limit (assuming limit is 50)
    for (let i = 0; i < 60; i++) {
      chartDebug.recordApiCall({
        url: `/api/test/${i}`,
        method: 'GET',
        timestamp: new Date(),
        duration: 100,
        status: 200,
        response: {},
      });
    }

    expect(chartDebug.debugInfo.value.apiCalls).toHaveLength(50);
    // Should keep the most recent calls
    expect(chartDebug.debugInfo.value.apiCalls[0].url).toBe('/api/test/10');
    expect(chartDebug.debugInfo.value.apiCalls[49].url).toBe('/api/test/59');
  });

  it('records errors with stack traces', () => {
    const error = {
      message: 'Chart rendering failed',
      timestamp: new Date(),
      stack: 'Error: Chart rendering failed\n    at renderChart',
      type: 'rendering' as const,
    };

    chartDebug.recordError(error);

    expect(chartDebug.debugInfo.value.errors).toHaveLength(1);
    expect(chartDebug.debugInfo.value.errors[0]).toEqual(error);
  });

  it('categorizes errors by type', () => {
    const errors = [
      {
        message: 'Network error',
        timestamp: new Date(),
        stack: 'NetworkError',
        type: 'network' as const,
      },
      {
        message: 'Rendering error',
        timestamp: new Date(),
        stack: 'RenderingError',
        type: 'rendering' as const,
      },
      {
        message: 'Validation error',
        timestamp: new Date(),
        stack: 'ValidationError',
        type: 'validation' as const,
      },
    ];

    errors.forEach(error => chartDebug.recordError(error));

    const networkErrors = chartDebug.debugInfo.value.errors.filter(e => e.type === 'network');
    const renderingErrors = chartDebug.debugInfo.value.errors.filter(e => e.type === 'rendering');
    const validationErrors = chartDebug.debugInfo.value.errors.filter(e => e.type === 'validation');

    expect(networkErrors).toHaveLength(1);
    expect(renderingErrors).toHaveLength(1);
    expect(validationErrors).toHaveLength(1);
  });

  it('updates performance metrics', () => {
    const metrics = {
      dataFetchTime: 200,
      renderTime: 50,
      dataPoints: 100,
      memoryUsage: 2048,
    };

    chartDebug.updatePerformanceMetrics(metrics);

    expect(chartDebug.debugInfo.value.dataFetchTime).toBe(200);
    expect(chartDebug.debugInfo.value.renderTime).toBe(50);
    expect(chartDebug.debugInfo.value.dataPoints).toBe(100);
    expect(chartDebug.debugInfo.value.memoryUsage).toBe(2048);
  });

  it('calculates memory usage from performance API', () => {
    chartDebug.updatePerformanceMetrics({});

    expect(chartDebug.debugInfo.value.memoryUsage).toBe(1024 * 1024); // 1MB
  });

  it('handles missing performance.memory gracefully', () => {
    // Mock environment without performance.memory (like some browsers)
    const originalMemory = mockPerformance.memory;
    delete (mockPerformance as any).memory;

    chartDebug.updatePerformanceMetrics({});

    expect(chartDebug.debugInfo.value.memoryUsage).toBe(0);

    // Restore
    mockPerformance.memory = originalMemory;
  });

  it('tracks chart instance information', () => {
    chartDebug.setChartInstance(mockChartInstance as any);

    expect(chartDebug.debugInfo.value.chartInstance).toBe(mockChartInstance);
    expect(chartDebug.debugInfo.value.dataPoints).toBe(10); // 5 + 5 from two datasets
  });

  it('calculates data points from chart instance', () => {
    const chartWithMultipleDatasets = {
      data: {
        datasets: [
          { data: [1, 2, 3] },
          { data: [4, 5, 6, 7] },
          { data: [8, 9] },
        ],
      },
    };

    chartDebug.setChartInstance(chartWithMultipleDatasets as any);

    expect(chartDebug.debugInfo.value.dataPoints).toBe(9); // 3 + 4 + 2
  });

  it('clears debug information', () => {
    // Add some debug data first
    chartDebug.recordError({
      message: 'Test error',
      timestamp: new Date(),
      stack: 'Error stack',
      type: 'rendering',
    });
    chartDebug.recordApiCall({
      url: '/api/test',
      method: 'GET',
      timestamp: new Date(),
      duration: 100,
      status: 200,
      response: {},
    });

    chartDebug.clearDebugInfo();

    expect(chartDebug.debugInfo.value.errors).toHaveLength(0);
    expect(chartDebug.debugInfo.value.apiCalls).toHaveLength(0);
    expect(chartDebug.debugInfo.value.dataFetchTime).toBe(0);
    expect(chartDebug.debugInfo.value.renderTime).toBe(0);
    expect(chartDebug.debugInfo.value.dataPoints).toBe(0);
    expect(chartDebug.debugInfo.value.memoryUsage).toBe(0);
  });

  it('exports debug information as JSON', () => {
    chartDebug.recordError({
      message: 'Test error',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      stack: 'Error stack',
      type: 'rendering',
    });

    const exported = chartDebug.exportDebugInfo();
    const parsed = JSON.parse(exported);

    expect(parsed.errors).toHaveLength(1);
    expect(parsed.errors[0].message).toBe('Test error');
    expect(parsed.timestamp).toBeDefined();
    expect(parsed.userAgent).toBeDefined();
  });

  it('includes system information in export', () => {
    const exported = chartDebug.exportDebugInfo();
    const parsed = JSON.parse(exported);

    expect(parsed.systemInfo).toBeDefined();
    expect(parsed.systemInfo.userAgent).toBeDefined();
    expect(parsed.systemInfo.viewport).toBeDefined();
    expect(parsed.systemInfo.timestamp).toBeDefined();
  });

  it('measures operation timing', async () => {
    const startTime = chartDebug.startTiming();

    // Simulate some async operation
    await new Promise(resolve => setTimeout(resolve, 10));

    const duration = chartDebug.endTiming(startTime);

    expect(duration).toBeGreaterThan(0);
    expect(typeof duration).toBe('number');
  });

  it('tracks multiple concurrent operations', () => {
    const operation1 = chartDebug.startTiming();
    const operation2 = chartDebug.startTiming();

    const duration1 = chartDebug.endTiming(operation1);
    const duration2 = chartDebug.endTiming(operation2);

    expect(duration1).toBeGreaterThanOrEqual(0);
    expect(duration2).toBeGreaterThanOrEqual(0);
  });

  it('provides performance recommendations', () => {
    // Set high data points to trigger performance warning
    chartDebug.updatePerformanceMetrics({
      dataPoints: 1000,
      renderTime: 500,
      memoryUsage: 10 * 1024 * 1024, // 10MB
    });

    const recommendations = chartDebug.getPerformanceRecommendations();

    expect(recommendations).toContain('データポイント数が多すぎます');
    expect(recommendations).toContain('レンダリング時間が長すぎます');
    expect(recommendations).toContain('メモリ使用量が多すぎます');
  });

  it('provides no recommendations for good performance', () => {
    chartDebug.updatePerformanceMetrics({
      dataPoints: 50,
      renderTime: 30,
      memoryUsage: 1024 * 1024, // 1MB
    });

    const recommendations = chartDebug.getPerformanceRecommendations();

    expect(recommendations).toHaveLength(0);
  });

  it('handles chart instance cleanup', () => {
    chartDebug.setChartInstance(mockChartInstance as any);
    expect(chartDebug.debugInfo.value.chartInstance).toBe(mockChartInstance);

    chartDebug.setChartInstance(null);
    expect(chartDebug.debugInfo.value.chartInstance).toBe(null);
    expect(chartDebug.debugInfo.value.dataPoints).toBe(0);
  });

  it('tracks error frequency', () => {
    const errorMessage = 'Repeated error';

    // Record the same error multiple times
    for (let i = 0; i < 3; i++) {
      chartDebug.recordError({
        message: errorMessage,
        timestamp: new Date(),
        stack: 'Error stack',
        type: 'rendering',
      });
    }

    const errorFrequency = chartDebug.getErrorFrequency();
    expect(errorFrequency[errorMessage]).toBe(3);
  });

  it('provides error statistics', () => {
    chartDebug.recordError({
      message: 'Network error',
      timestamp: new Date(),
      stack: 'NetworkError',
      type: 'network',
    });
    chartDebug.recordError({
      message: 'Rendering error',
      timestamp: new Date(),
      stack: 'RenderingError',
      type: 'rendering',
    });

    const stats = chartDebug.getErrorStatistics();

    expect(stats.total).toBe(2);
    expect(stats.byType.network).toBe(1);
    expect(stats.byType.rendering).toBe(1);
  });
});
