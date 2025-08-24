import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref, computed } from 'vue';
import MealChart from '~/components/MealChart.vue';
import type { MealAnalytics, DailyCalorieData } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

// Get Chart mock reference
let mockChart: any;

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

// Mock useAnalyticsStore
const mockAnalyticsStore = {
  analytics: ref(null),
  loading: ref(false),
  error: ref(null),
  errorMessage: ref(''),
  currentChartMode: ref('bar'),
  lastDataUpdate: ref(null),
  autoRefreshEnabled: ref(false),
  fetchAnalytics: vi.fn().mockResolvedValue({}),
  setChartDisplayMode: vi.fn((mode) => {
    mockAnalyticsStore.currentChartMode.value = mode;
  }),
  stopAutoRefresh: vi.fn(),
};

vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);

// Mock NuxtLink
const NuxtLink = {
  name: 'NuxtLink',
  props: ['to'],
  template: '<a :href="to"><slot /></a>',
};

vi.stubGlobal('NuxtLink', NuxtLink);

// Mock window for responsive behavior
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

describe('MealChart - 積み上げ棒グラフ表示テスト', () => {
  const mockStackedBarData: MealAnalytics = {
    dailyCalories: [
      { date: '2024-01-01', calories: 150, type: FoodType.DRY },
      { date: '2024-01-01', calories: 100, type: FoodType.WET },
      { date: '2024-01-02', calories: 200, type: FoodType.DRY },
      { date: '2024-01-02', calories: 80, type: FoodType.WET },
      { date: '2024-01-03', calories: 180, type: FoodType.DRY },
      { date: '2024-01-03', calories: 120, type: FoodType.WET },
    ],
    weeklyAverage: 155,
    foodTypeBreakdown: [
      { type: FoodType.DRY, percentage: 63.6, totalCalories: 530, totalWeight: 265 },
      { type: FoodType.WET, percentage: 36.4, totalCalories: 300, totalWeight: 150 },
    ],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ data: mockStackedBarData });
    mockAnalyticsStore.analytics.value = mockStackedBarData;
    mockAnalyticsStore.loading.value = false;
    mockAnalyticsStore.error.value = null;
    mockAnalyticsStore.currentChartMode.value = 'bar';

    // Get Chart mock reference
    const chartModule = await import('chart.js');
    mockChart = chartModule.Chart;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('積み上げ棒グラフモード表示', () => {
    it('積み上げ棒グラフモードでChart.jsが正しい設定で初期化される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      expect(mockChart).toHaveBeenCalled();
      const chartConfig = mockChart.mock.calls[0][0];

      // チャートタイプが'bar'であることを確認
      expect(chartConfig.type).toBe('bar');

      // 積み上げ設定が有効であることを確認
      expect(chartConfig.options.scales.x.stacked).toBe(true);
      expect(chartConfig.options.scales.y.stacked).toBe(true);

      // データセットが2つ（ドライ・ウェット）存在することを確認
      expect(chartConfig.data.datasets).toHaveLength(2);
      expect(chartConfig.data.datasets[0].label).toBe('ドライフード (kcal)');
      expect(chartConfig.data.datasets[1].label).toBe('ウェットフード (kcal)');

      // 各データセットにstack設定があることを確認
      expect(chartConfig.data.datasets[0].stack).toBe('calories');
      expect(chartConfig.data.datasets[1].stack).toBe('calories');
    });

    it('積み上げ棒グラフで日別データが正しく集計される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const chartConfig = mockChart.mock.calls[0][0];
      const datasets = chartConfig.data.datasets;

      // 日付ラベルが正しく設定されていることを確認
      expect(chartConfig.data.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);

      // ドライフードデータが正しく集計されていることを確認
      expect(datasets[0].data).toEqual([150, 200, 180]);

      // ウェットフードデータが正しく集計されていることを確認
      expect(datasets[1].data).toEqual([100, 80, 120]);
    });

    it('積み上げ棒グラフで色設定が正しく適用される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const chartConfig = mockChart.mock.calls[0][0];
      const datasets = chartConfig.data.datasets;

      // ドライフードの色設定
      expect(datasets[0].backgroundColor).toBe('rgba(59, 130, 246, 0.8)');
      expect(datasets[0].borderColor).toBe('rgb(59, 130, 246)');

      // ウェットフードの色設定
      expect(datasets[1].backgroundColor).toBe('rgba(34, 197, 94, 0.8)');
      expect(datasets[1].borderColor).toBe('rgb(34, 197, 94)');
    });

    it('積み上げ棒グラフでレジェンドが表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const chartConfig = mockChart.mock.calls[0][0];

      // レジェンドが表示されることを確認
      expect(chartConfig.options.plugins.legend.display).toBe(true);
    });

    it('積み上げ棒グラフでツールチップが正しく設定される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const chartConfig = mockChart.mock.calls[0][0];
      const tooltipConfig = chartConfig.options.plugins.tooltip;

      // ツールチップモードが'index'であることを確認
      expect(tooltipConfig.mode).toBe('index');
      expect(tooltipConfig.intersect).toBe(false);

      // フッターコールバックが設定されていることを確認（合計表示用）
      expect(tooltipConfig.callbacks.footer).toBeDefined();
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
      expect(breakdownItems[0].text()).toContain('63.6%');

      // ウェットフードの内訳
      expect(breakdownItems[1].text()).toContain('ウェットフード');
      expect(breakdownItems[1].text()).toContain('36.4%');
    });

    it('フードタイプ別内訳で合計カロリーが正しく計算される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const breakdownItems = wrapper.findAll('.breakdown-item');

      // 総カロリー: 830kcal
      // ドライフード: 830 * 63.6% = 527.9kcal
      expect(breakdownItems[0].text()).toContain('527.9 kcal');

      // ウェットフード: 830 * 36.4% = 302.1kcal
      expect(breakdownItems[1].text()).toContain('302.1 kcal');
    });

    it('フードタイプ別内訳でプログレスバーが正しく表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const progressBars = wrapper.findAll('.breakdown-item .bg-gray-200 > div');

      // ドライフードのプログレスバー
      expect(progressBars[0].attributes('style')).toContain('width: 63.6%');
      expect(progressBars[0].classes()).toContain('bg-blue-600');

      // ウェットフードのプログレスバー
      expect(progressBars[1].attributes('style')).toContain('width: 36.4%');
      expect(progressBars[1].classes()).toContain('bg-green-600');
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

  describe('フードタイプフィルターの無効化', () => {
    it('積み上げ棒グラフモードでフードタイプフィルターが無効になる', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const foodTypeButtons = wrapper.findAll('.food-type-filter button');

      // すべてのフードタイプフィルターボタンが無効化されていることを確認
      foodTypeButtons.forEach((button) => {
        expect(button.attributes('disabled')).toBeDefined();
        expect(button.classes()).toContain('bg-gray-100');
        expect(button.classes()).toContain('text-gray-400');
        expect(button.classes()).toContain('cursor-not-allowed');
      });
    });

    it('フードタイプフィルターに無効化の説明が表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const filterLabel = wrapper.find('.food-type-filter label');
      expect(filterLabel.text()).toContain('（積み上げ表示では無効）');
    });

    it('フードタイプフィルターボタンのツールチップに無効化の説明が表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const foodTypeButtons = wrapper.findAll('.food-type-filter button');

      foodTypeButtons.forEach((button) => {
        expect(button.attributes('title')).toBe('積み上げ表示では無効');
      });
    });
  });

  describe('サマリーカードの計算', () => {
    it('積み上げ棒グラフモードで総カロリーが正しく計算される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const summaryCards = wrapper.findAll('.summary-card');

      // 総カロリー: 150+100+200+80+180+120 = 830
      expect(summaryCards[0].text()).toContain('830.0 kcal');
    });

    it('積み上げ棒グラフモードで1日平均が正しく計算される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const summaryCards = wrapper.findAll('.summary-card');

      // 1日平均: (250+280+300) / 3 = 276.7
      expect(summaryCards[1].text()).toContain('276.7 kcal');
    });
  });

  describe('レスポンシブ対応', () => {
    it('モバイル表示で積み上げ棒グラフのレジェンドが下部に配置される', async () => {
      // モバイル幅に設定
      Object.defineProperty(window, 'innerWidth', {
        value: 500,
        writable: true,
      });

      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const chartConfig = mockChart.mock.calls[0][0];

      // レジェンドが下部に配置されることを確認
      expect(chartConfig.options.plugins.legend.position).toBe('bottom');
    });

    it('タブレット表示で適切なフォントサイズが設定される', async () => {
      // タブレット幅に設定
      Object.defineProperty(window, 'innerWidth', {
        value: 800,
        writable: true,
      });

      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const chartConfig = mockChart.mock.calls[0][0];

      // タイトルフォントサイズがタブレット用に設定されることを確認
      expect(chartConfig.options.plugins.title.font.size).toBe(15);
    });
  });

  describe('データ欠損の処理', () => {
    it('データが存在しない日付で0値が表示される', async () => {
      const sparseData: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 150, type: FoodType.DRY },
          { date: '2024-01-03', calories: 180, type: FoodType.DRY },
        ],
        weeklyAverage: 165,
        foodTypeBreakdown: [
          { type: FoodType.DRY, percentage: 100, totalCalories: 330, totalWeight: 165 },
        ],
      };

      mockAnalyticsStore.analytics.value = sparseData;

      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const chartConfig = mockChart.mock.calls[0][0];

      // 2024-01-02のデータが0として表示されることを確認
      expect(chartConfig.data.labels).toContain('2024-01-02');
      const dryDataIndex = chartConfig.data.labels.indexOf('2024-01-02');
      expect(chartConfig.data.datasets[0].data[dryDataIndex]).toBe(0);
    });
  });

  describe('チャートタイプ切り替え', () => {
    it('線グラフから積み上げ棒グラフに切り替えられる', async () => {
      mockAnalyticsStore.currentChartMode.value = 'line';

      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const barButton = wrapper.find('.chart-type-toggle button:last-child');
      await barButton.trigger('click');

      expect(mockAnalyticsStore.setChartDisplayMode).toHaveBeenCalledWith('bar');
    });

    it('積み上げ棒グラフボタンがアクティブ状態で表示される', async () => {
      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      const barButton = wrapper.find('.chart-type-toggle button:last-child');

      expect(barButton.classes()).toContain('bg-blue-600');
      expect(barButton.classes()).toContain('text-white');
      expect(barButton.text()).toContain('積み上げ棒グラフ');
    });
  });

  describe('エラーハンドリング', () => {
    it('積み上げ棒グラフでデータ取得エラー時に適切なエラー表示がされる', async () => {
      mockAnalyticsStore.error.value = 'データ取得に失敗しました';
      mockAnalyticsStore.analytics.value = null;

      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      expect(wrapper.find('.error-container').exists()).toBe(true);
      expect(wrapper.text()).toContain('データの読み込みに失敗しました');
    });

    it('空のデータセットでも積み上げ棒グラフが正常に表示される', async () => {
      const emptyData: MealAnalytics = {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };

      mockAnalyticsStore.analytics.value = emptyData;

      const wrapper = mount(MealChart);
      await nextTick();
      await nextTick();

      expect(mockChart).toHaveBeenCalled();
      const chartConfig = mockChart.mock.calls[0][0];

      expect(chartConfig.data.labels).toEqual([]);
      expect(chartConfig.data.datasets).toHaveLength(2);
      expect(chartConfig.data.datasets[0].data).toEqual([]);
      expect(chartConfig.data.datasets[1].data).toEqual([]);
    });
  });
});
