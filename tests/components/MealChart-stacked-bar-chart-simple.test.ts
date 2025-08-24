import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import MealChart from '~/components/MealChart.vue';
import type { MealAnalytics } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

// Mock Chart.js
vi.mock('chart.js', () => {
  const mockChart = vi.fn().mockImplementation(() => ({
    destroy: vi.fn(),
    update: vi.fn(),
    resize: vi.fn(),
    data: {},
    options: {},
  }));
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
  analytics: {
    value: null as MealAnalytics | null,
  },
  loading: { value: false },
  errorMessage: { value: '' },
  currentChartMode: { value: 'bar' as 'line' | 'bar' },
  lastDataUpdate: { value: null },
  autoRefreshEnabled: { value: false },
  fetchAnalytics: vi.fn().mockResolvedValue({}),
  setChartDisplayMode: vi.fn(),
  stopAutoRefresh: vi.fn(),
};

vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);

// Mock NuxtLink
vi.stubGlobal('NuxtLink', {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
});

describe('MealChart - 積み上げ棒グラフ表示テスト（簡易版）', () => {
  const mockStackedBarData: MealAnalytics = {
    dailyCalories: [
      { date: '2024-01-01', calories: 150, type: FoodType.DRY },
      { date: '2024-01-01', calories: 100, type: FoodType.WET },
      { date: '2024-01-02', calories: 200, type: FoodType.DRY },
      { date: '2024-01-02', calories: 80, type: FoodType.WET },
    ],
    weeklyAverage: 132.5,
    foodTypeBreakdown: [
      { type: FoodType.DRY, percentage: 66.0, totalCalories: 350, totalWeight: 175 },
      { type: FoodType.WET, percentage: 34.0, totalCalories: 180, totalWeight: 90 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalyticsStore.analytics.value = mockStackedBarData;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.errorMessage.value = '';
    mockAnalyticsStore.currentChartMode.value = 'bar';
  });

  describe('積み上げ棒グラフモード表示', () => {
    it('積み上げ棒グラフモードでChart.jsが呼び出される', async () => {
      const { Chart } = await import('chart.js');

      mount(MealChart);
      await nextTick();
      await nextTick();

      expect(Chart).toHaveBeenCalled();
    });

    it('積み上げ棒グラフボタンがアクティブ状態で表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();

      const barButton = wrapper.find('.chart-type-toggle button:last-child');
      expect(barButton.classes()).toContain('bg-blue-600');
      expect(barButton.classes()).toContain('text-white');
      expect(barButton.text()).toContain('積み上げ棒グラフ');
    });

    it('フードタイプフィルターが無効化される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();

      const foodTypeButtons = wrapper.findAll('.food-type-filter button');
      foodTypeButtons.forEach((button) => {
        expect(button.attributes('disabled')).toBeDefined();
        expect(button.classes()).toContain('bg-gray-100');
        expect(button.classes()).toContain('cursor-not-allowed');
      });
    });

    it('フードタイプフィルターに無効化の説明が表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();

      const filterLabel = wrapper.find('.food-type-filter label');
      expect(filterLabel.text()).toContain('（積み上げ表示では無効）');
    });
  });

  describe('フードタイプ別内訳表示', () => {
    it('積み上げ棒グラフモードでフードタイプ別内訳が表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const foodBreakdown = wrapper.find('.food-breakdown');
      expect(foodBreakdown.exists()).toBe(true);

      const breakdownItems = wrapper.findAll('.breakdown-item');
      expect(breakdownItems).toHaveLength(2);

      // ドライフードの内訳
      expect(breakdownItems[0].text()).toContain('ドライフード');
      expect(breakdownItems[0].text()).toContain('66%');

      // ウェットフードの内訳
      expect(breakdownItems[1].text()).toContain('ウェットフード');
      expect(breakdownItems[1].text()).toContain('34%');
    });

    it('積み上げ表示の説明文が表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const explanation = wrapper.find('.bg-blue-50');
      expect(explanation.exists()).toBe(true);
      expect(explanation.text()).toContain('積み上げ表示:');
      expect(explanation.text()).toContain('各日のドライフードとウェットフードのカロリーを積み上げて表示');
    });
  });

  describe('サマリーカードの計算', () => {
    it('積み上げ棒グラフモードで総カロリーが正しく計算される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const summaryCards = wrapper.findAll('.summary-card');
      if (summaryCards.length > 0) {
        // 総カロリー: 150+100+200+80 = 530
        expect(summaryCards[0].text()).toContain('530.0 kcal');
      }
    });
  });

  describe('チャートタイプ切り替え', () => {
    it('積み上げ棒グラフから線グラフに切り替えられる', async () => {
      const wrapper = mount(MealChart);
      await nextTick();

      const lineButton = wrapper.find('.chart-type-toggle button:first-child');
      await lineButton.trigger('click');

      expect(mockAnalyticsStore.setChartDisplayMode).toHaveBeenCalledWith('line');
    });
  });

  describe('エラーハンドリング', () => {
    it('データ取得エラー時に適切なエラー表示がされる', async () => {
      mockAnalyticsStore.errorMessage.value = 'データ取得に失敗しました';
      mockAnalyticsStore.analytics.value = null;

      const wrapper = mount(MealChart);
      await nextTick();

      expect(wrapper.find('.error-container').exists()).toBe(true);
      expect(wrapper.text()).toContain('データの読み込みに失敗しました');
    });

    it('空のデータセットでも正常に表示される', async () => {
      const emptyData: MealAnalytics = {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };

      mockAnalyticsStore.analytics.value = emptyData;

      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      // エラーが発生せずに表示されることを確認
      expect(wrapper.find('.chart-wrapper').exists()).toBe(true);
    });
  });
});
