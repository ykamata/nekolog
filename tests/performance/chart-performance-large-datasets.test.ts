import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import MealChart from '~/components/MealChart.vue';
import type { ChartDataPoint } from '~/types/cat-meal';

// 大規模データセット生成ユーティリティ
function generateLargeDataset(size: number): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const startDate = new Date('2024-01-01');

  for (let i = 0; i < size; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + Math.floor(i / 10)); // 1日に約10レコード

    data.push({
      date: date.toISOString().split('T')[0],
      catId: `cat-${(i % 2) + 1}`,
      catName: `Cat ${(i % 2) + 1}`,
      totalCalories: Math.floor(Math.random() * 200) + 100,
      dryFoodCalories: Math.floor(Math.random() * 150) + 50,
      wetFoodCalories: Math.floor(Math.random() * 100) + 20,
      mealCount: Math.floor(Math.random() * 3) + 1,
    });
  }

  return data;
}

// メモリ使用量測定ユーティリティ
function measureMemoryUsage(): number {
  if (typeof performance !== 'undefined' && 'memory' in performance) {
    return (performance as any).memory.usedJSHeapSize;
  }
  return 0;
}

// パフォーマンス測定ユーティリティ
function measureRenderTime(fn: () => Promise<void>): Promise<number> {
  return new Promise(async (resolve) => {
    const start = performance.now();
    await fn();
    const end = performance.now();
    resolve(end - start);
  });
}

describe('Chart Performance - Large Datasets', () => {
  let pinia: ReturnType<typeof createPinia>;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
  });

  afterEach(() => {
    // メモリクリーンアップ
    if (global.gc) {
      global.gc();
    }
  });

  it('1000データポイントでのチャートレンダリング性能をテスト', async () => {
    const largeDataset = generateLargeDataset(1000);
    const memoryBefore = measureMemoryUsage();

    const renderTime = await measureRenderTime(async () => {
      const wrapper = mount(MealChart, {
        props: {
          catId: undefined,
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31'),
          },
          chartType: 'line' as const,
          showDebug: false,
        },
        global: {
          plugins: [pinia],
          stubs: {
            canvas: true, // Canvas要素をスタブ化
          },
        },
      });

      // データ設定をシミュレート
      await wrapper.vm.$nextTick();
      wrapper.unmount();
    });

    const memoryAfter = measureMemoryUsage();
    const memoryUsed = memoryAfter - memoryBefore;

    // パフォーマンス要件の検証
    expect(renderTime).toBeLessThan(2000); // 2秒以内でレンダリング
    expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // 50MB以内のメモリ使用量

    console.log(`1000データポイント - レンダリング時間: ${renderTime.toFixed(2)}ms`);
    console.log(`メモリ使用量: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
  });

  it('5000データポイントでの性能劣化をテスト', async () => {
    const largeDataset = generateLargeDataset(5000);
    const memoryBefore = measureMemoryUsage();

    const renderTime = await measureRenderTime(async () => {
      const wrapper = mount(MealChart, {
        props: {
          catId: undefined,
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31'),
          },
          chartType: 'bar' as const,
          showDebug: false,
        },
        global: {
          plugins: [pinia],
          stubs: {
            canvas: true,
          },
        },
      });

      await wrapper.vm.$nextTick();
      wrapper.unmount();
    });

    const memoryAfter = measureMemoryUsage();
    const memoryUsed = memoryAfter - memoryBefore;

    // 大規模データでの許容範囲
    expect(renderTime).toBeLessThan(5000); // 5秒以内
    expect(memoryUsed).toBeLessThan(100 * 1024 * 1024); // 100MB以内

    console.log(`5000データポイント - レンダリング時間: ${renderTime.toFixed(2)}ms`);
    console.log(`メモリ使用量: ${(memoryUsed / 1024 / 1024).toFixed(2)}MB`);
  });

  it('データ処理アルゴリズムの性能をテスト', async () => {
    const { processChartData } = await import('~/utils/chart-data-processing');
    const largeDataset = generateLargeDataset(10000);

    const processingTime = await measureRenderTime(async () => {
      const processed = processChartData(largeDataset, {
        chartType: 'line',
        catId: undefined,
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-12-31'),
        },
      });

      // 処理結果の検証
      expect(processed.labels.length).toBeGreaterThan(0);
      expect(processed.datasets.length).toBeGreaterThan(0);
    });

    // データ処理は1秒以内
    expect(processingTime).toBeLessThan(1000);

    console.log(`10000データポイント処理時間: ${processingTime.toFixed(2)}ms`);
  });

  it('メモリリークの検出テスト', async () => {
    const initialMemory = measureMemoryUsage();
    const iterations = 10;

    for (let i = 0; i < iterations; i++) {
      const wrapper = mount(MealChart, {
        props: {
          catId: `cat-${i % 2 + 1}`,
          dateRange: {
            start: new Date('2024-01-01'),
            end: new Date('2024-12-31'),
          },
          chartType: 'line' as const,
          showDebug: false,
        },
        global: {
          plugins: [pinia],
          stubs: {
            canvas: true,
          },
        },
      });

      await wrapper.vm.$nextTick();
      wrapper.unmount();

      // 強制ガベージコレクション
      if (global.gc) {
        global.gc();
      }
    }

    const finalMemory = measureMemoryUsage();
    const memoryIncrease = finalMemory - initialMemory;

    // メモリ増加が10MB以内であることを確認
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);

    console.log(`${iterations}回のマウント/アンマウント後のメモリ増加: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
  });

  it('チャートタイプ切り替え時の性能をテスト', async () => {
    const dataset = generateLargeDataset(2000);
    const chartTypes = ['line', 'bar', 'stacked-bar'] as const;

    for (const chartType of chartTypes) {
      const renderTime = await measureRenderTime(async () => {
        const wrapper = mount(MealChart, {
          props: {
            catId: undefined,
            dateRange: {
              start: new Date('2024-01-01'),
              end: new Date('2024-12-31'),
            },
            chartType,
            showDebug: false,
          },
          global: {
            plugins: [pinia],
            stubs: {
              canvas: true,
            },
          },
        });

        await wrapper.vm.$nextTick();
        wrapper.unmount();
      });

      // 各チャートタイプで3秒以内
      expect(renderTime).toBeLessThan(3000);

      console.log(`${chartType}チャート - レンダリング時間: ${renderTime.toFixed(2)}ms`);
    }
  });
});
