import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// import.meta.client のモック
Object.defineProperty(import.meta, 'client', {
  value: true,
  configurable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('Analytics Store - チャート表示モード管理', () => {
  let analyticsStore: any;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    analyticsStore = useAnalyticsStore();
  });

  it('デフォルトで線グラフモードが設定されている', () => {
    expect(analyticsStore.currentChartMode).toBe('line');
    expect(analyticsStore.isLineChartMode).toBe(true);
    expect(analyticsStore.isBarChartMode).toBe(false);
  });

  it('表示モードを棒グラフに設定できる', () => {
    analyticsStore.setChartDisplayMode('bar');

    expect(analyticsStore.currentChartMode).toBe('bar');
    expect(analyticsStore.isLineChartMode).toBe(false);
    expect(analyticsStore.isBarChartMode).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-chart-mode', 'bar');
  });

  it('表示モードを線グラフに設定できる', () => {
    analyticsStore.setChartDisplayMode('line');

    expect(analyticsStore.currentChartMode).toBe('line');
    expect(analyticsStore.isLineChartMode).toBe(true);
    expect(analyticsStore.isBarChartMode).toBe(false);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-chart-mode', 'line');
  });

  it('表示モードをトグルできる', () => {
    expect(analyticsStore.currentChartMode).toBe('line');

    analyticsStore.toggleChartDisplayMode();
    expect(analyticsStore.currentChartMode).toBe('bar');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-chart-mode', 'bar');

    analyticsStore.toggleChartDisplayMode();
    expect(analyticsStore.currentChartMode).toBe('line');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-chart-mode', 'line');
  });

  it('localStorageから棒グラフ設定を復元できる', () => {
    localStorageMock.getItem.mockReturnValue('bar');

    analyticsStore.restoreDisplaySettings();

    expect(analyticsStore.currentChartMode).toBe('bar');
  });

  it('localStorageから線グラフ設定を復元できる', () => {
    localStorageMock.getItem.mockReturnValue('line');

    analyticsStore.restoreDisplaySettings();

    expect(analyticsStore.currentChartMode).toBe('line');
  });

  it('無効な値がlocalStorageにある場合はデフォルト値を使用する', () => {
    localStorageMock.getItem.mockReturnValue('invalid-mode');

    analyticsStore.restoreDisplaySettings();

    expect(analyticsStore.currentChartMode).toBe('line');
  });

  it('localStorageが利用できない場合はエラーにならない', () => {
    // import.meta.client を false にする
    Object.defineProperty(import.meta, 'client', {
      value: false,
      configurable: true,
    });

    const pinia = createPinia();
    setActivePinia(pinia);
    const store = useAnalyticsStore();

    expect(() => {
      store.setChartDisplayMode('bar');
      store.restoreDisplaySettings();
    }).not.toThrow();

    expect(store.currentChartMode).toBe('bar');
  });

  it('初期化時にlocalStorageから設定を復元する', () => {
    localStorageMock.getItem.mockReturnValue('bar');

    // 新しいストアインスタンスを作成
    const pinia = createPinia();
    setActivePinia(pinia);

    // restoreDisplaySettingsを呼び出してlocalStorageから設定を復元
    const newStore = useAnalyticsStore();
    newStore.restoreDisplaySettings();

    expect(newStore.currentChartMode).toBe('bar');
    expect(localStorageMock.getItem).toHaveBeenCalledWith('analytics-chart-mode');
  });
});
