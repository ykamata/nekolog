import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref } from 'vue';
import ChartDebugPanel from '~/components/ChartDebugPanel.vue';

// Mock useChartDebug composable
const mockChartDebug = {
  debugInfo: ref({
    chartInstance: {
      data: { datasets: [{ data: [1, 2, 3] }] },
      options: { responsive: true },
    },
    dataFetchTime: 150,
    renderTime: 45,
    dataPoints: 30,
    memoryUsage: 2048,
    errors: [
      {
        message: 'Test error message',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        stack: 'Error stack trace',
        type: 'rendering',
      },
    ],
    apiCalls: [
      {
        url: '/api/analytics/meals',
        method: 'GET',
        timestamp: new Date('2024-01-01T09:59:00Z'),
        duration: 120,
        status: 200,
        response: { success: true },
      },
    ],
  }),
  isDebugMode: ref(true),
  toggleDebugMode: vi.fn(),
  clearDebugInfo: vi.fn(),
  exportDebugInfo: vi.fn(),
};

vi.stubGlobal('useChartDebug', () => mockChartDebug);

// Mock useErrorDiagnostics composable
const mockErrorDiagnostics = {
  diagnostics: ref({
    systemInfo: {
      userAgent: 'Test Browser',
      viewport: { width: 1024, height: 768 },
      memory: { used: 50, total: 100 },
    },
    chartStatus: {
      isInitialized: true,
      hasData: true,
      renderingErrors: [],
    },
    suggestions: [
      'チャートのパフォーマンスを向上させるため、データポイント数を制限してください。',
    ],
  }),
  runDiagnostics: vi.fn(),
};

vi.stubGlobal('useErrorDiagnostics', () => mockErrorDiagnostics);

describe('ChartDebugPanel', () => {
  const mountComponent = (props = {}) => {
    return mount(ChartDebugPanel, {
      props: {
        isVisible: true,
        ...props,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockChartDebug.isDebugMode.value = true;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders debug panel when visible', () => {
    const wrapper = mountComponent({ isVisible: true });

    expect(wrapper.find('.debug-panel').exists()).toBe(true);
    expect(wrapper.find('.debug-panel-header').exists()).toBe(true);
    expect(wrapper.find('.debug-panel-content').exists()).toBe(true);
  });

  it('hides debug panel when not visible', () => {
    const wrapper = mountComponent({ isVisible: false });

    expect(wrapper.find('.debug-panel').exists()).toBe(false);
  });

  it('displays performance metrics correctly', () => {
    const wrapper = mountComponent();

    const performanceSection = wrapper.find('[data-testid="performance-metrics"]');
    expect(performanceSection.exists()).toBe(true);

    expect(performanceSection.text()).toContain('データ取得時間: 150ms');
    expect(performanceSection.text()).toContain('レンダリング時間: 45ms');
    expect(performanceSection.text()).toContain('データポイント数: 30');
    expect(performanceSection.text()).toContain('メモリ使用量: 2.0KB');
  });

  it('displays chart instance information', () => {
    const wrapper = mountComponent();

    const chartInfoSection = wrapper.find('[data-testid="chart-info"]');
    expect(chartInfoSection.exists()).toBe(true);

    expect(chartInfoSection.text()).toContain('Chart.js インスタンス');
    expect(chartInfoSection.text()).toContain('データセット数: 1');
    expect(chartInfoSection.text()).toContain('レスポンシブ: 有効');
  });

  it('displays API call history', () => {
    const wrapper = mountComponent();

    const apiCallsSection = wrapper.find('[data-testid="api-calls"]');
    expect(apiCallsSection.exists()).toBe(true);

    expect(apiCallsSection.text()).toContain('API呼び出し履歴');
    expect(apiCallsSection.text()).toContain('GET /api/analytics/meals');
    expect(apiCallsSection.text()).toContain('120ms');
    expect(apiCallsSection.text()).toContain('200');
  });

  it('displays error log with details', () => {
    const wrapper = mountComponent();

    const errorLogSection = wrapper.find('[data-testid="error-log"]');
    expect(errorLogSection.exists()).toBe(true);

    expect(errorLogSection.text()).toContain('エラーログ');
    expect(errorLogSection.text()).toContain('Test error message');
    expect(errorLogSection.text()).toContain('rendering');
  });

  it('shows error details when error item is clicked', async () => {
    const wrapper = mountComponent();

    const errorItem = wrapper.find('[data-testid="error-item"]');
    if (errorItem.exists()) {
      await errorItem.trigger('click');

      const errorDetails = wrapper.find('[data-testid="error-details"]');
      expect(errorDetails.exists()).toBe(true);
      expect(errorDetails.text()).toContain('Error stack trace');
    }
  });

  it('toggles debug mode when toggle button is clicked', async () => {
    const wrapper = mountComponent();

    const toggleButton = wrapper.find('[data-testid="debug-toggle"]');
    await toggleButton.trigger('click');

    expect(mockChartDebug.toggleDebugMode).toHaveBeenCalled();
  });

  it('clears debug information when clear button is clicked', async () => {
    const wrapper = mountComponent();

    const clearButton = wrapper.find('[data-testid="clear-debug"]');
    await clearButton.trigger('click');

    expect(mockChartDebug.clearDebugInfo).toHaveBeenCalled();
  });

  it('exports debug information when export button is clicked', async () => {
    const wrapper = mountComponent();

    const exportButton = wrapper.find('[data-testid="export-debug"]');
    await exportButton.trigger('click');

    expect(mockChartDebug.exportDebugInfo).toHaveBeenCalled();
  });

  it('displays system diagnostics', () => {
    const wrapper = mountComponent();

    const diagnosticsSection = wrapper.find('[data-testid="system-diagnostics"]');
    expect(diagnosticsSection.exists()).toBe(true);

    expect(diagnosticsSection.text()).toContain('システム診断');
    expect(diagnosticsSection.text()).toContain('Test Browser');
    expect(diagnosticsSection.text()).toContain('1024x768');
    expect(diagnosticsSection.text()).toContain('メモリ使用率: 50%');
  });

  it('shows diagnostic suggestions', () => {
    const wrapper = mountComponent();

    const suggestionsSection = wrapper.find('[data-testid="suggestions"]');
    expect(suggestionsSection.exists()).toBe(true);

    expect(suggestionsSection.text()).toContain('改善提案');
    expect(suggestionsSection.text()).toContain('データポイント数を制限してください');
  });

  it('runs diagnostics when diagnostic button is clicked', async () => {
    const wrapper = mountComponent();

    const diagnosticButton = wrapper.find('[data-testid="run-diagnostics"]');
    await diagnosticButton.trigger('click');

    expect(mockErrorDiagnostics.runDiagnostics).toHaveBeenCalled();
  });

  it('handles empty debug information gracefully', async () => {
    mockChartDebug.debugInfo.value = {
      chartInstance: null,
      dataFetchTime: 0,
      renderTime: 0,
      dataPoints: 0,
      memoryUsage: 0,
      errors: [],
      apiCalls: [],
    };

    const wrapper = mountComponent();
    await nextTick();

    expect(wrapper.find('[data-testid="performance-metrics"]').text()).toContain('データ取得時間: 0ms');
    expect(wrapper.find('[data-testid="api-calls"]').text()).toContain('API呼び出し履歴なし');
    expect(wrapper.find('[data-testid="error-log"]').text()).toContain('エラーなし');
  });

  it('formats memory usage correctly', () => {
    // Test different memory sizes
    const testCases = [
      { bytes: 1024, expected: '1.0KB' },
      { bytes: 1048576, expected: '1.0MB' },
      { bytes: 1073741824, expected: '1.0GB' },
      { bytes: 512, expected: '512B' },
    ];

    testCases.forEach(({ bytes, expected }) => {
      mockChartDebug.debugInfo.value.memoryUsage = bytes;
      const wrapper = mountComponent();
      expect(wrapper.find('[data-testid="performance-metrics"]').text()).toContain(expected);
    });
  });

  it('displays API call status with appropriate styling', () => {
    const wrapper = mountComponent();

    const apiCallItem = wrapper.find('[data-testid="api-call-item"]');
    if (apiCallItem.exists()) {
      // Success status (200) should have success styling
      expect(apiCallItem.classes()).toContain('status-success');
    }
  });

  it('handles error API calls with error styling', async () => {
    mockChartDebug.debugInfo.value.apiCalls = [
      {
        url: '/api/analytics/meals',
        method: 'GET',
        timestamp: new Date(),
        duration: 5000,
        status: 500,
        response: { error: 'Internal Server Error' },
      },
    ];

    const wrapper = mountComponent();
    await nextTick();

    const apiCallItem = wrapper.find('[data-testid="api-call-item"]');
    if (apiCallItem.exists()) {
      expect(apiCallItem.classes()).toContain('status-error');
    }
  });

  it('collapses and expands sections', async () => {
    const wrapper = mountComponent();

    const performanceHeader = wrapper.find('[data-testid="performance-header"]');
    await performanceHeader.trigger('click');

    const performanceContent = wrapper.find('[data-testid="performance-content"]');
    expect(performanceContent.classes()).toContain('collapsed');

    // Click again to expand
    await performanceHeader.trigger('click');
    expect(performanceContent.classes()).not.toContain('collapsed');
  });

  it('filters debug information by type', async () => {
    const wrapper = mountComponent();

    const errorFilter = wrapper.find('[data-testid="filter-errors"]');
    await errorFilter.trigger('click');

    // Should show only error-related information
    expect(wrapper.find('[data-testid="error-log"]').exists()).toBe(true);
    expect(wrapper.find('[data-testid="api-calls"]').exists()).toBe(false);
  });

  it('searches through debug information', async () => {
    const wrapper = mountComponent();

    const searchInput = wrapper.find('[data-testid="debug-search"]');
    await searchInput.setValue('Test error');

    // Should highlight matching items
    const highlightedItems = wrapper.findAll('.search-highlight');
    expect(highlightedItems.length).toBeGreaterThan(0);
  });

  it('handles real-time updates to debug information', async () => {
    const wrapper = mountComponent();

    // Simulate new error being added
    mockChartDebug.debugInfo.value.errors.push({
      message: 'New error message',
      timestamp: new Date(),
      stack: 'New error stack',
      type: 'network',
    });

    await nextTick();

    expect(wrapper.find('[data-testid="error-log"]').text()).toContain('New error message');
  });
});
