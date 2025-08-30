import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useErrorDiagnostics } from '~/composables/useErrorDiagnostics';

// Mock Chart.js
const mockChartInstance = {
  data: {
    datasets: [{ data: [1, 2, 3] }],
  },
  options: {
    responsive: true,
  },
  canvas: {
    getContext: vi.fn().mockReturnValue({}),
  },
};

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock navigator
Object.defineProperty(global, 'navigator', {
  value: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    language: 'ja-JP',
    hardwareConcurrency: 8,
    connection: {
      effectiveType: '4g',
      downlink: 10,
    },
  },
  writable: true,
});

// Mock window
Object.defineProperty(global, 'window', {
  value: {
    innerWidth: 1024,
    innerHeight: 768,
    devicePixelRatio: 2,
    screen: {
      width: 1920,
      height: 1080,
    },
  },
  writable: true,
});

describe('useErrorDiagnostics', () => {
  let errorDiagnostics: ReturnType<typeof useErrorDiagnostics>;

  beforeEach(() => {
    vi.clearAllMocks();
    errorDiagnostics = useErrorDiagnostics();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default diagnostics', () => {
    expect(errorDiagnostics.diagnostics.value).toEqual({
      systemInfo: {
        userAgent: '',
        viewport: { width: 0, height: 0 },
        memory: { used: 0, total: 0 },
        devicePixelRatio: 1,
        language: '',
        hardwareConcurrency: 0,
        connection: null,
      },
      chartStatus: {
        isInitialized: false,
        hasData: false,
        renderingErrors: [],
        canvasSupport: false,
      },
      suggestions: [],
    });
  });

  it('collects system information correctly', async () => {
    await errorDiagnostics.runDiagnostics();

    const systemInfo = errorDiagnostics.diagnostics.value.systemInfo;

    expect(systemInfo.userAgent).toContain('Mozilla/5.0');
    expect(systemInfo.viewport.width).toBe(1024);
    expect(systemInfo.viewport.height).toBe(768);
    expect(systemInfo.memory.used).toBe(50);
    expect(systemInfo.memory.total).toBe(100);
    expect(systemInfo.devicePixelRatio).toBe(2);
    expect(systemInfo.language).toBe('ja-JP');
    expect(systemInfo.hardwareConcurrency).toBe(8);
    expect(systemInfo.connection?.effectiveType).toBe('4g');
  });

  it('handles missing performance.memory gracefully', async () => {
    const originalMemory = mockPerformance.memory;
    delete (mockPerformance as any).memory;

    await errorDiagnostics.runDiagnostics();

    const systemInfo = errorDiagnostics.diagnostics.value.systemInfo;
    expect(systemInfo.memory.used).toBe(0);
    expect(systemInfo.memory.total).toBe(0);

    // Restore
    mockPerformance.memory = originalMemory;
  });

  it('handles missing navigator.connection gracefully', async () => {
    const originalConnection = (global.navigator as any).connection;
    delete (global.navigator as any).connection;

    await errorDiagnostics.runDiagnostics();

    const systemInfo = errorDiagnostics.diagnostics.value.systemInfo;
    expect(systemInfo.connection).toBe(null);

    // Restore
    (global.navigator as any).connection = originalConnection;
  });

  it('diagnoses chart status correctly', async () => {
    errorDiagnostics.setChartInstance(mockChartInstance as any);
    await errorDiagnostics.runDiagnostics();

    const chartStatus = errorDiagnostics.diagnostics.value.chartStatus;

    expect(chartStatus.isInitialized).toBe(true);
    expect(chartStatus.hasData).toBe(true);
    expect(chartStatus.canvasSupport).toBe(true);
  });

  it('detects chart without data', async () => {
    const emptyChartInstance = {
      data: { datasets: [] },
      options: {},
      canvas: { getContext: vi.fn().mockReturnValue({}) },
    };

    errorDiagnostics.setChartInstance(emptyChartInstance as any);
    await errorDiagnostics.runDiagnostics();

    const chartStatus = errorDiagnostics.diagnostics.value.chartStatus;
    expect(chartStatus.hasData).toBe(false);
  });

  it('detects canvas support issues', async () => {
    const chartWithoutCanvas = {
      data: { datasets: [{ data: [1, 2, 3] }] },
      options: {},
      canvas: { getContext: vi.fn().mockReturnValue(null) },
    };

    errorDiagnostics.setChartInstance(chartWithoutCanvas as any);
    await errorDiagnostics.runDiagnostics();

    const chartStatus = errorDiagnostics.diagnostics.value.chartStatus;
    expect(chartStatus.canvasSupport).toBe(false);
  });

  it('provides performance suggestions for high memory usage', async () => {
    mockPerformance.memory.usedJSHeapSize = 90 * 1024 * 1024; // 90MB
    mockPerformance.memory.totalJSHeapSize = 100 * 1024 * 1024; // 100MB

    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('メモリ使用量が高すぎます。データポイント数を減らすことを検討してください。');
  });

  it('provides suggestions for low-end devices', async () => {
    (global.navigator as any).hardwareConcurrency = 2;
    (global.window as any).devicePixelRatio = 1;

    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('低スペックデバイスが検出されました。アニメーションを無効にすることを推奨します。');
  });

  it('provides suggestions for slow network', async () => {
    (global.navigator as any).connection = {
      effectiveType: '2g',
      downlink: 0.5,
    };

    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('ネットワーク速度が遅いです。データの事前読み込みを検討してください。');
  });

  it('provides suggestions for small viewport', async () => {
    (global.window as any).innerWidth = 320;
    (global.window as any).innerHeight = 568;

    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('小さな画面サイズが検出されました。モバイル向けの最適化を適用してください。');
  });

  it('provides suggestions for chart without data', async () => {
    const emptyChartInstance = {
      data: { datasets: [] },
      options: {},
      canvas: { getContext: vi.fn().mockReturnValue({}) },
    };

    errorDiagnostics.setChartInstance(emptyChartInstance as any);
    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('チャートにデータがありません。データの取得状況を確認してください。');
  });

  it('provides suggestions for canvas support issues', async () => {
    const chartWithoutCanvas = {
      data: { datasets: [{ data: [1, 2, 3] }] },
      options: {},
      canvas: { getContext: vi.fn().mockReturnValue(null) },
    };

    errorDiagnostics.setChartInstance(chartWithoutCanvas as any);
    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('Canvas要素のサポートに問題があります。ブラウザの互換性を確認してください。');
  });

  it('records rendering errors', () => {
    const error = {
      message: 'Chart rendering failed',
      timestamp: new Date(),
      stack: 'Error stack trace',
    };

    errorDiagnostics.recordRenderingError(error);

    const chartStatus = errorDiagnostics.diagnostics.value.chartStatus;
    expect(chartStatus.renderingErrors).toHaveLength(1);
    expect(chartStatus.renderingErrors[0]).toEqual(error);
  });

  it('limits rendering error history', () => {
    // Add more than the limit (assuming limit is 10)
    for (let i = 0; i < 15; i++) {
      errorDiagnostics.recordRenderingError({
        message: `Error ${i}`,
        timestamp: new Date(),
        stack: `Stack ${i}`,
      });
    }

    const chartStatus = errorDiagnostics.diagnostics.value.chartStatus;
    expect(chartStatus.renderingErrors).toHaveLength(10);
    // Should keep the most recent errors
    expect(chartStatus.renderingErrors[0].message).toBe('Error 5');
    expect(chartStatus.renderingErrors[9].message).toBe('Error 14');
  });

  it('provides browser-specific suggestions', async () => {
    // Mock Safari user agent
    Object.defineProperty(global.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
      writable: true,
    });

    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    // Should include Safari-specific suggestions if any
    expect(suggestions.some(s => s.includes('Safari'))).toBe(false); // No specific Safari issues in this test
  });

  it('detects WebGL support', async () => {
    const mockCanvas = document.createElement('canvas');
    const mockWebGLContext = {};

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(mockWebGLContext as any);

    await errorDiagnostics.runDiagnostics();

    expect(document.createElement).toHaveBeenCalledWith('canvas');
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl');
  });

  it('provides suggestions for missing WebGL support', async () => {
    const mockCanvas = document.createElement('canvas');

    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas);
    vi.spyOn(mockCanvas, 'getContext').mockReturnValue(null);

    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('WebGLサポートが無効です。ハードウェアアクセラレーションを有効にしてください。');
  });

  it('analyzes chart performance metrics', async () => {
    const performanceMetrics = {
      dataFetchTime: 2000, // 2 seconds
      renderTime: 500, // 500ms
      dataPoints: 1000,
    };

    errorDiagnostics.analyzePerformance(performanceMetrics);
    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toContain('データ取得時間が長すぎます。APIのパフォーマンスを確認してください。');
    expect(suggestions).toContain('レンダリング時間が長すぎます。データポイント数を減らすことを検討してください。');
    expect(suggestions).toContain('データポイント数が多すぎます。データの間引きを検討してください。');
  });

  it('provides no suggestions for good performance', async () => {
    // Reset to good performance conditions
    mockPerformance.memory.usedJSHeapSize = 10 * 1024 * 1024; // 10MB
    (global.navigator as any).hardwareConcurrency = 8;
    (global.window as any).innerWidth = 1920;
    (global.window as any).innerHeight = 1080;
    (global.navigator as any).connection = {
      effectiveType: '4g',
      downlink: 10,
    };

    errorDiagnostics.setChartInstance(mockChartInstance as any);
    await errorDiagnostics.runDiagnostics();

    const suggestions = errorDiagnostics.diagnostics.value.suggestions;
    expect(suggestions).toHaveLength(0);
  });

  it('exports diagnostic report', async () => {
    await errorDiagnostics.runDiagnostics();

    const report = errorDiagnostics.exportDiagnosticReport();
    const parsed = JSON.parse(report);

    expect(parsed.timestamp).toBeDefined();
    expect(parsed.systemInfo).toBeDefined();
    expect(parsed.chartStatus).toBeDefined();
    expect(parsed.suggestions).toBeDefined();
    expect(parsed.version).toBeDefined();
  });

  it('clears diagnostic data', () => {
    errorDiagnostics.recordRenderingError({
      message: 'Test error',
      timestamp: new Date(),
      stack: 'Test stack',
    });

    errorDiagnostics.clearDiagnostics();

    const chartStatus = errorDiagnostics.diagnostics.value.chartStatus;
    expect(chartStatus.renderingErrors).toHaveLength(0);
    expect(chartStatus.isInitialized).toBe(false);
    expect(chartStatus.hasData).toBe(false);
  });
});
