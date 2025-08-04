import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MealChart from '~/components/MealChart.vue';
import { useAnalyticsStore } from '~/stores/analytics';

// Chart.jsのモック
vi.mock('chart.js', () => ({
  Chart: {
    register: vi.fn(),
    prototype: {
      destroy: vi.fn(),
      update: vi.fn(),
      resize: vi.fn(),
    },
  },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  BarElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

// $fetchのモック
global.$fetch = vi.fn();

// localStorageのモック
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('MealChart - フード種別フィルター機能', () => {
  let analyticsStore: ReturnType<typeof useAnalyticsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    analyticsStore = useAnalyticsStore();
    vi.clearAllMocks();

    // $fetchのモックレスポンス
    (global.$fetch as any).mockResolvedValue({
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
  });

  it('デフォルトで「すべて」フィルターが選択されている', async () => {
    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    const allButton = wrapper.find('button[title*="すべてのフードタイプを表示"]');
    expect(allButton.exists()).toBe(true);
    expect(allButton.classes()).toContain('bg-blue-600');
    expect(allButton.classes()).toContain('text-white');
  });

  it('ドライフードボタンをクリックするとフィルターが切り替わる', async () => {
    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    const dryButton = wrapper.find('button[title*="ドライフードのみ表示"]');
    await dryButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(dryButton.classes()).toContain('bg-blue-600');
    expect(dryButton.classes()).toContain('text-white');

    // localStorageに保存されることを確認
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-food-type-filter', 'DRY');
  });

  it('ウェットフードボタンをクリックするとフィルターが切り替わる', async () => {
    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    const wetButton = wrapper.find('button[title*="ウェットフードのみ表示"]');
    await wetButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(wetButton.classes()).toContain('bg-blue-600');
    expect(wetButton.classes()).toContain('text-white');

    // localStorageに保存されることを確認
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-food-type-filter', 'WET');
  });

  it('「すべて」ボタンをクリックするとフィルターがリセットされる', async () => {
    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    // まずドライフードを選択
    const dryButton = wrapper.find('button[title*="ドライフードのみ表示"]');
    await dryButton.trigger('click');
    await wrapper.vm.$nextTick();

    // 「すべて」を選択
    const allButton = wrapper.find('button[title*="すべてのフードタイプを表示"]');
    await allButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(allButton.classes()).toContain('bg-blue-600');
    expect(allButton.classes()).toContain('text-white');

    // localStorageから削除されることを確認
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('analytics-food-type-filter');
  });

  it('積み上げ棒グラフモードではフィルターボタンが無効になる', async () => {
    analyticsStore.setChartDisplayMode('bar');
    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    const allButton = wrapper.find('button[title*="積み上げ表示では無効"]');
    const dryButton = wrapper.find('button[title*="積み上げ表示では無効"]');
    const wetButton = wrapper.find('button[title*="積み上げ表示では無効"]');

    expect(allButton.attributes('disabled')).toBeDefined();
    expect(dryButton.attributes('disabled')).toBeDefined();
    expect(wetButton.attributes('disabled')).toBeDefined();

    expect(allButton.classes()).toContain('bg-gray-100');
    expect(allButton.classes()).toContain('text-gray-400');
    expect(allButton.classes()).toContain('cursor-not-allowed');
  });

  it('線グラフモードではフィルターボタンが有効になる', async () => {
    analyticsStore.setChartDisplayMode('line');
    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    const allButton = wrapper.find('button[title*="すべてのフードタイプを表示"]');
    const dryButton = wrapper.find('button[title*="ドライフードのみ表示"]');
    const wetButton = wrapper.find('button[title*="ウェットフードのみ表示"]');

    expect(allButton.attributes('disabled')).toBeUndefined();
    expect(dryButton.attributes('disabled')).toBeUndefined();
    expect(wetButton.attributes('disabled')).toBeUndefined();

    expect(allButton.classes()).not.toContain('cursor-not-allowed');
    expect(dryButton.classes()).not.toContain('cursor-not-allowed');
    expect(wetButton.classes()).not.toContain('cursor-not-allowed');
  });

  it('localStorageからフィルター設定を復元する', async () => {
    localStorageMock.getItem.mockReturnValue('DRY');

    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    const dryButton = wrapper.find('button[title*="ドライフードのみ表示"]');
    expect(dryButton.classes()).toContain('bg-blue-600');
    expect(dryButton.classes()).toContain('text-white');
  });

  it('フィルター変更時にヘルプテキストが適切に表示される', async () => {
    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    // 線グラフモードでのヘルプテキスト
    analyticsStore.setChartDisplayMode('line');
    await wrapper.vm.$nextTick();

    const lineHelpText = wrapper.find('label:contains("フードタイプ") span');
    expect(lineHelpText.exists()).toBe(false); // 線グラフモードでは特別なヘルプテキストなし

    // 積み上げ棒グラフモードでのヘルプテキスト
    analyticsStore.setChartDisplayMode('bar');
    await wrapper.vm.$nextTick();

    const barHelpText = wrapper.find('span:contains("（積み上げ表示では無効）")');
    expect(barHelpText.exists()).toBe(true);
  });

  it('モバイル表示でボタンサイズが適切に調整される', async () => {
    // ウィンドウサイズをモバイルサイズに設定
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 500,
    });

    const wrapper = mount(MealChart);
    await wrapper.vm.$nextTick();

    const buttons = wrapper.findAll('.food-type-filter button');
    buttons.forEach((button) => {
      expect(button.classes()).toContain('flex-1'); // フレックスで均等配置
    });
  });
});

describe('Analytics Store - フード種別フィルター管理', () => {
  let analyticsStore: ReturnType<typeof useAnalyticsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    analyticsStore = useAnalyticsStore();
    vi.clearAllMocks();
  });

  it('デフォルトでフィルターが設定されていない', () => {
    expect(analyticsStore.selectedFoodType).toBe(null);
  });

  it('フード種別フィルターを設定できる', () => {
    analyticsStore.setSelectedFoodType('DRY');

    expect(analyticsStore.selectedFoodType).toBe('DRY');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('analytics-food-type-filter', 'DRY');
  });

  it('フード種別フィルターをクリアできる', () => {
    analyticsStore.setSelectedFoodType('DRY');
    analyticsStore.setSelectedFoodType(null);

    expect(analyticsStore.selectedFoodType).toBe(null);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('analytics-food-type-filter');
  });

  it('localStorageからフィルター設定を復元できる', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'analytics-food-type-filter') return 'WET';
      return null;
    });

    analyticsStore.restoreDisplaySettings();

    expect(analyticsStore.selectedFoodType).toBe('WET');
  });

  it('無効な値がlocalStorageにある場合はデフォルト値を使用する', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'analytics-food-type-filter') return 'INVALID';
      return null;
    });

    analyticsStore.restoreDisplaySettings();

    expect(analyticsStore.selectedFoodType).toBe(null);
  });
});
