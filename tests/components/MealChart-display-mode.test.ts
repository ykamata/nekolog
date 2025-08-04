import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MealChart from '~/components/MealChart.vue';
import { useAnalyticsStore } from '~/stores/analytics';

// Chart.js のモック
vi.mock('chart.js', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
  })),
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

// Chart.register のモック
const mockRegister = vi.fn();
vi.doMock('chart.js', () => ({
  Chart: {
    register: mockRegister,
  },
  CategoryScale: vi.fn(),
  LinearScale: vi.fn(),
  PointElement: vi.fn(),
  LineElement: vi.fn(),
  BarElement: vi.fn(),
  Title: vi.fn(),
  Tooltip: vi.fn(),
  Legend: vi.fn(),
}));

// $fetch のモック
global.$fetch = vi.fn().mockResolvedValue({
  analytics: {
    dailyCalories: [
      { date: '2024-01-01', calories: 100, type: 'DRY' },
      { date: '2024-01-01', calories: 50, type: 'WET' },
      { date: '2024-01-02', calories: 120, type: 'DRY' },
      { date: '2024-01-02', calories: 60, type: 'WET' },
    ],
    weeklyAverage: 82.5,
    foodTypeBreakdown: [
      { type: 'DRY', percentage: 66.7, totalCalories: 220, totalWeight: 100 },
      { type: 'WET', percentage: 33.3, totalCalories: 110, totalWeight: 50 },
    ],
    totalMeals: 4,
    averageCaloriesPerMeal: 82.5,
  },
});

// localStorage のモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('MealChart - 表示モード切り替え機能', () => {
  let wrapper: any;
  let analyticsStore: any;

  beforeEach(() => {
    // Pinia のセットアップ
    const pinia = createPinia();
    setActivePinia(pinia);
    analyticsStore = useAnalyticsStore();

    // localStorage モックのリセット
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);

    // コンポーネントのマウント
    wrapper = mount(MealChart, {
      global: {
        plugins: [pinia],
        stubs: {
          canvas: true,
        },
      },
      props: {
        catId: 'test-cat-id',
        height: 400,
      },
    });
  });

  it('デフォルトで線グラフモードが選択されている', () => {
    expect(analyticsStore.currentChartMode).toBe('line');

    const lineButton = wrapper.find('button[title="線グラフ表示に切り替え"]');
    const barButton = wrapper.find('button[title="積み上げ棒グラフ表示に切り替え"]');

    expect(lineButton.classes()).toContain('bg-blue-600');
    expect(lineButton.classes()).toContain('text-white');
    expect(barButton.classes()).toContain('bg-white');
    expect(barButton.classes()).toContain('text-gray-700');
  });

  it('棒グラフボタンをクリックすると表示モードが切り替わる', async () => {
    const barButton = wrapper.find('button[title="積み上げ棒グラフ表示に切り替え"]');

    await barButton.trigger('click');

    expect(analyticsStore.currentChartMode).toBe('bar');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-chart-mode', 'bar');
  });

  it('線グラフボタンをクリックすると表示モードが切り替わる', async () => {
    // 最初に棒グラフモードに設定
    analyticsStore.setChartDisplayMode('bar');
    await wrapper.vm.$nextTick();

    const lineButton = wrapper.find('button[title="線グラフ表示に切り替え"]');

    await lineButton.trigger('click');

    expect(analyticsStore.currentChartMode).toBe('line');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-chart-mode', 'line');
  });

  it('localStorageから保存された表示モードを復元する', () => {
    localStorageMock.getItem.mockReturnValue('bar');

    // 新しいストアインスタンスを作成
    const pinia = createPinia();
    setActivePinia(pinia);
    const newStore = useAnalyticsStore();

    expect(newStore.currentChartMode).toBe('bar');
  });

  it('棒グラフモードではフードタイプフィルターが無効になる', async () => {
    const barButton = wrapper.find('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.trigger('click');

    const foodTypeSelect = wrapper.find('select');
    expect(foodTypeSelect.attributes('disabled')).toBeDefined();
    expect(foodTypeSelect.classes()).toContain('bg-gray-100');
    expect(foodTypeSelect.classes()).toContain('cursor-not-allowed');
  });

  it('線グラフモードではフードタイプフィルターが有効になる', async () => {
    // 最初に棒グラフモードに設定
    analyticsStore.setChartDisplayMode('bar');
    await wrapper.vm.$nextTick();

    const lineButton = wrapper.find('button[title="線グラフ表示に切り替え"]');
    await lineButton.trigger('click');

    const foodTypeSelect = wrapper.find('select');
    expect(foodTypeSelect.attributes('disabled')).toBeUndefined();
    expect(foodTypeSelect.classes()).not.toContain('bg-gray-100');
    expect(foodTypeSelect.classes()).not.toContain('cursor-not-allowed');
  });

  it('表示モード切り替え時に適切なヘルプテキストが表示される', async () => {
    const barButton = wrapper.find('button[title="積み上げ棒グラフ表示に切り替え"]');
    await barButton.trigger('click');

    const helpText = wrapper.find('.food-type-filter .text-xs');
    expect(helpText.text()).toContain('（積み上げ表示では無効）');
  });

  it('設定の自動保存メッセージが表示される', () => {
    const autoSaveMessage = wrapper.find('.chart-type-toggle .text-xs');
    expect(autoSaveMessage.text()).toContain('(設定は自動保存されます)');
  });
});

describe('Analytics Store - 表示モード管理', () => {
  let analyticsStore: unknown;

  beforeEach(() => {
    const pinia = createPinia();
    setActivePinia(pinia);
    analyticsStore = useAnalyticsStore();
    vi.clearAllMocks();
  });

  it('デフォルトで線グラフモードが設定されている', () => {
    expect(analyticsStore.currentChartMode).toBe('line');
    expect(analyticsStore.isLineChartMode).toBe(true);
    expect(analyticsStore.isBarChartMode).toBe(false);
  });

  it('表示モードを設定できる', () => {
    analyticsStore.setChartDisplayMode('bar');

    expect(analyticsStore.currentChartMode).toBe('bar');
    expect(analyticsStore.isLineChartMode).toBe(false);
    expect(analyticsStore.isBarChartMode).toBe(true);
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-chart-mode', 'bar');
  });

  it('表示モードをトグルできる', () => {
    expect(analyticsStore.currentChartMode).toBe('line');

    analyticsStore.toggleChartDisplayMode();
    expect(analyticsStore.currentChartMode).toBe('bar');

    analyticsStore.toggleChartDisplayMode();
    expect(analyticsStore.currentChartMode).toBe('line');
  });

  it('localStorageから設定を復元できる', () => {
    localStorageMock.getItem.mockReturnValue('bar');

    analyticsStore.restoreDisplaySettings();

    expect(analyticsStore.currentChartMode).toBe('bar');
  });

  it('無効な値がlocalStorageにある場合はデフォルト値を使用する', () => {
    localStorageMock.getItem.mockReturnValue('invalid-mode');

    analyticsStore.restoreDisplaySettings();

    expect(analyticsStore.currentChartMode).toBe('line');
  });
});
