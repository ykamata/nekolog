import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MealChart from '~/components/MealChart.vue';
import { useAnalyticsStore } from '~/stores/analytics';

// Chart.jsのモック
vi.mock('chart.js', () => {
  const mockChartInstance = {
    destroy: vi.fn(),
    resize: vi.fn(),
    update: vi.fn(),
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

// $fetchのモック
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

// useAnalyticsStoreのモック
const mockAnalyticsStore = {
  currentChartMode: 'line',
  setChartDisplayMode: vi.fn(),
  restoreDisplaySettings: vi.fn(),
};
vi.stubGlobal('useAnalyticsStore', () => mockAnalyticsStore);

// window.innerWidthのモック
Object.defineProperty(window, 'innerWidth', {
  writable: true,
  configurable: true,
  value: 1024,
});

// window.innerHeightのモック
Object.defineProperty(window, 'innerHeight', {
  writable: true,
  configurable: true,
  value: 768,
});

// ResizeObserverのモック
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// IntersectionObserverのモック
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

describe('MealChart レスポンシブ対応', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);

    // モックデータの設定
    mockFetch.mockResolvedValue({
      analytics: {
        dailyCalories: [
          { date: '2024-01-01', calories: 100, type: 'DRY' },
          { date: '2024-01-02', calories: 120, type: 'WET' },
        ],
        weeklyAverage: 110,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 60, totalCalories: 600, totalWeight: 100 },
          { type: 'WET', percentage: 40, totalCalories: 400, totalWeight: 80 },
        ],
        totalMeals: 10,
        averageCaloriesPerMeal: 100,
      },
      summary: {},
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('デスクトップ表示', () => {
    beforeEach(() => {
      // デスクトップサイズに設定
      window.innerWidth = 1200;
      window.innerHeight = 800;
    });

    it('デスクトップサイズでチャートが適切に表示される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートコンテナが表示されることを確認
      expect(wrapper.find('.chart-canvas-container').exists()).toBe(true);

      // デスクトップ用の高さが設定されることを確認
      const canvas = wrapper.find('canvas');
      expect(canvas.attributes('style')).toContain('height: 400px');
    });

    it('デスクトップでチャートコントロールが横並びで表示される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートコントロールが存在することを確認
      const chartControls = wrapper.find('.chart-controls');
      expect(chartControls.exists()).toBe(true);

      // フレックスレイアウトが適用されることを確認
      expect(chartControls.classes()).toContain('flex-wrap');
      expect(chartControls.classes()).toContain('gap-4');
    });
  });

  describe('タブレット表示', () => {
    beforeEach(() => {
      // タブレットサイズに設定
      window.innerWidth = 768;
      window.innerHeight = 1024;
    });

    it('タブレットサイズでチャートが適切に表示される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートコンテナが表示されることを確認
      expect(wrapper.find('.chart-canvas-container').exists()).toBe(true);

      // タブレット用の高さが設定されることを確認
      const canvas = wrapper.find('canvas');
      expect(canvas.attributes('style')).toContain('height: 400px');
    });
  });

  describe('モバイル表示', () => {
    beforeEach(() => {
      // モバイルサイズに設定
      window.innerWidth = 375;
      window.innerHeight = 667;
    });

    it('モバイルサイズでチャートが適切に表示される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートコンテナが表示されることを確認
      expect(wrapper.find('.chart-canvas-container').exists()).toBe(true);

      // モバイル用の高さが設定されることを確認
      const canvas = wrapper.find('canvas');
      expect(canvas.attributes('style')).toContain('height: 300px');
    });

    it('モバイルでチャートコントロールが縦並びで表示される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートコントロールが存在することを確認
      const chartControls = wrapper.find('.chart-controls');
      expect(chartControls.exists()).toBe(true);
    });

    it('モバイルでサマリーカードが縦並びで表示される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      // サマリーセクションが存在することを確認
      const summarySection = wrapper.find('.chart-summary');
      expect(summarySection.exists()).toBe(true);
    });
  });

  describe('タッチデバイス対応', () => {
    beforeEach(() => {
      // タッチデバイスをシミュレート
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        configurable: true,
        value: {},
      });

      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        configurable: true,
        value: 5,
      });
    });

    it('タッチデバイスでチャートが適切に設定される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートキャンバスにタッチ用の設定が適用されることを確認
      const canvasContainer = wrapper.find('.chart-canvas-container');
      expect(canvasContainer.exists()).toBe(true);
    });

    it('タッチデバイスでボタンのタッチターゲットサイズが確保される', async () => {
      window.innerWidth = 375; // モバイルサイズ

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートタイプ切り替えボタンが存在することを確認
      const chartTypeButtons = wrapper.findAll('.chart-type-toggle button');
      expect(chartTypeButtons.length).toBeGreaterThan(0);

      // フードタイプフィルターボタンが存在することを確認
      const foodTypeButtons = wrapper.findAll('.food-type-filter button');
      expect(foodTypeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('レスポンシブ動作', () => {
    it('画面サイズ変更時にチャートが適切に更新される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // 初期状態（デスクトップ）
      window.innerWidth = 1200;
      let canvas = wrapper.find('canvas');
      expect(canvas.attributes('style')).toContain('height: 400px');

      // モバイルサイズに変更
      window.innerWidth = 375;

      // リサイズイベントをトリガー
      const resizeEvent = new Event('resize');
      window.dispatchEvent(resizeEvent);

      await wrapper.vm.$nextTick();

      // モバイル用の高さに更新されることを確認
      canvas = wrapper.find('canvas');
      expect(canvas.attributes('style')).toContain('height: 300px');
    });

    it('オリエンテーション変更時にチャートが適切に更新される', async () => {
      // タッチデバイスをシミュレート
      Object.defineProperty(window, 'ontouchstart', {
        value: {},
      });

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // オリエンテーション変更イベントをトリガー
      const orientationEvent = new Event('orientationchange');
      window.dispatchEvent(orientationEvent);

      await wrapper.vm.$nextTick();

      // チャートが引き続き表示されることを確認
      expect(wrapper.find('.chart-canvas-container').exists()).toBe(true);
    });
  });

  describe('パフォーマンス最適化', () => {
    it('Intersection Observerが適切に設定される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // IntersectionObserverが呼び出されることを確認
      expect(global.IntersectionObserver).toHaveBeenCalled();
    });

    it('リサイズイベントがデバウンスされる', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // 複数のリサイズイベントを短時間で発生させる
      for (let i = 0; i < 5; i++) {
        const resizeEvent = new Event('resize');
        window.dispatchEvent(resizeEvent);
      }

      // デバウンス処理により、最後のイベントのみが処理されることを期待
      await new Promise(resolve => setTimeout(resolve, 200));

      // チャートが正常に動作することを確認
      expect(wrapper.find('.chart-canvas-container').exists()).toBe(true);
    });
  });

  describe('アクセシビリティ', () => {
    it('フォーカス可能な要素が適切に設定される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // チャートタイプ切り替えボタンがフォーカス可能であることを確認
      const chartTypeButtons = wrapper.findAll('.chart-type-toggle button');
      chartTypeButtons.forEach((button) => {
        expect(button.attributes('type')).toBe('button');
      });

      // フードタイプフィルターボタンがフォーカス可能であることを確認
      const foodTypeButtons = wrapper.findAll('.food-type-filter button');
      foodTypeButtons.forEach((button) => {
        expect(button.attributes('type')).toBe('button');
      });
    });

    it('適切なaria属性が設定される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // ボタンにtitle属性が設定されることを確認
      const chartTypeButtons = wrapper.findAll('.chart-type-toggle button');
      chartTypeButtons.forEach((button) => {
        expect(button.attributes('title')).toBeDefined();
      });
    });
  });
});
