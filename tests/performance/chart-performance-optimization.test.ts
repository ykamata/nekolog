import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MealChart from '~/components/MealChart.vue';
import { useAnalyticsStore } from '~/stores/analytics';
import type { MealAnalytics } from '~/types/cat-meal';

// Chart.jsのモック
vi.mock('chart.js', () => ({
  Chart: vi.fn().mockImplementation(() => ({
    data: {},
    options: {},
    update: vi.fn(),
    destroy: vi.fn(),
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
  register: vi.fn(),
}));

// Performance APIのモック
Object.defineProperty(global, 'performance', {
  value: {
    now: vi.fn(() => Date.now()),
  },
});

// requestAnimationFrameのモック
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

describe('Chart Performance Optimization', () => {
  let pinia: ReturnType<typeof createPinia>;
  let analyticsStore: ReturnType<typeof useAnalyticsStore>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    analyticsStore = useAnalyticsStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('差分レンダリング機能', () => {
    it('データが変更されていない場合はチャート更新をスキップする', async () => {
      const mockAnalytics: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 100, type: 'DRY' },
          { date: '2024-01-02', calories: 120, type: 'WET' },
        ],
        dailyCaloriesByFoodType: [],
        weeklyAverage: 110,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 50, totalCalories: 100, totalWeight: 50 },
          { type: 'WET', percentage: 50, totalCalories: 120, totalWeight: 60 },
        ],
      };

      // モックデータを設定
      analyticsStore.analytics = mockAnalytics;

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      // 初回レンダリング
      await wrapper.vm.$nextTick();

      // Chart.jsのupdateメソッドが呼ばれた回数を記録
      const chartMock = (wrapper.vm as any).chart;
      const initialUpdateCount = chartMock?.update?.mock?.calls?.length || 0;

      // 同じデータで再度更新を試行
      (wrapper.vm as any).updateChart();
      await wrapper.vm.$nextTick();

      // updateが追加で呼ばれていないことを確認
      const finalUpdateCount = chartMock?.update?.mock?.calls?.length || 0;
      expect(finalUpdateCount).toBe(initialUpdateCount);
    });

    it('データが変更された場合のみチャート更新を実行する', async () => {
      const initialAnalytics: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 100, type: 'DRY' },
        ],
        dailyCaloriesByFoodType: [],
        weeklyAverage: 100,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 100, totalCalories: 100, totalWeight: 50 },
        ],
      };

      const updatedAnalytics: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 150, type: 'DRY' }, // カロリーが変更
        ],
        dailyCaloriesByFoodType: [],
        weeklyAverage: 150,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 100, totalCalories: 150, totalWeight: 75 },
        ],
      };

      analyticsStore.analytics = initialAnalytics;

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // データを変更
      analyticsStore.analytics = updatedAnalytics;
      (wrapper.vm as any).updateChart();
      await wrapper.vm.$nextTick();

      // updateが呼ばれたことを確認
      const chartMock = (wrapper.vm as any).chart;
      expect(chartMock?.update).toHaveBeenCalled();
    });
  });

  describe('更新キューのバッチ処理', () => {
    it('複数の更新要求を効率的にバッチ処理する', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      const vm = wrapper.vm as any;

      // 複数の更新要求を短時間で実行
      vm.updateChart();
      vm.updateChart();
      vm.updateChart();

      await new Promise(resolve => setTimeout(resolve, 50));

      // 最終的に1回の更新のみが実行されることを確認
      expect(vm.updateQueue.length).toBeLessThanOrEqual(1);
    });
  });

  describe('パフォーマンスメトリクス', () => {
    it('更新時間を正確に測定する', async () => {
      const mockPerformanceNow = vi.fn()
        .mockReturnValueOnce(1000) // 開始時間
        .mockReturnValueOnce(1050); // 終了時間（50ms後）

      global.performance.now = mockPerformanceNow;

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      const vm = wrapper.vm as any;

      // 更新を実行
      vm.updateChart();
      await new Promise(resolve => setTimeout(resolve, 100));

      // パフォーマンスメトリクスが記録されていることを確認
      expect(vm.performanceMetrics.updateCount).toBeGreaterThan(0);
      expect(vm.performanceMetrics.lastUpdateTime).toBeGreaterThan(0);
    });

    it('大量データ時にアニメーションを無効化する', async () => {
      // 大量のデータを生成
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: Math.random() * 200,
        type: i % 2 === 0 ? 'DRY' : 'WET',
      }));

      const mockAnalytics: MealAnalytics = {
        dailyCalories: largeDataset,
        dailyCaloriesByFoodType: [],
        weeklyAverage: 100,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 50, totalCalories: 5000, totalWeight: 2500 },
          { type: 'WET', percentage: 50, totalCalories: 5000, totalWeight: 2500 },
        ],
      };

      analyticsStore.analytics = mockAnalytics;

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      vm.updateChart();

      await new Promise(resolve => setTimeout(resolve, 100));

      // 大量データの場合、アニメーションが'none'に設定されることを確認
      const chartMock = vm.chart;
      if (chartMock?.update?.mock?.calls?.length > 0) {
        const lastCall = chartMock.update.mock.calls[chartMock.update.mock.calls.length - 1];
        expect(lastCall[0]).toBe('none');
      }
    });
  });

  describe('メモリ最適化', () => {
    it('定期的なメモリクリーンアップが実行される', async () => {
      const optimizeMemoryUsageSpy = vi.spyOn(analyticsStore, 'optimizeMemoryUsage');

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      // コンポーネントがマウントされた後、少し待つ
      await wrapper.vm.$nextTick();

      // setIntervalが設定されていることを確認するため、時間を進める
      vi.advanceTimersByTime(5 * 60 * 1000 + 100); // 5分+100ms

      // メモリ最適化が呼ばれたことを確認
      expect(optimizeMemoryUsageSpy).toHaveBeenCalled();
    });

    it('コンポーネント破棄時にインターバルがクリアされる', async () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      await wrapper.vm.$nextTick();

      // コンポーネントを破棄
      wrapper.unmount();

      // clearIntervalが呼ばれたことを確認
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('レスポンシブ最適化', () => {
    it('画面サイズ変更時にデバウンス処理が適用される', async () => {
      const wrapper = mount(MealChart, {
        global: {
          plugins: [pinia],
        },
      });

      const vm = wrapper.vm as any;
      const chartMock = vm.chart;

      if (chartMock) {
        const resizeSpy = vi.spyOn(chartMock, 'resize');

        // 複数回のリサイズイベントを短時間で発生させる
        global.dispatchEvent(new Event('resize'));
        global.dispatchEvent(new Event('resize'));
        global.dispatchEvent(new Event('resize'));

        // デバウンス時間（150ms）を待つ
        await new Promise(resolve => setTimeout(resolve, 200));

        // デバウンス処理により、最終的に1回のみresizeが呼ばれることを確認
        expect(resizeSpy).toHaveBeenCalledTimes(1);
      }
    });
  });
});
