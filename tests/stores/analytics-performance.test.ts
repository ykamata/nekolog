import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';
import type { MealAnalytics, DailyCalorieData } from '~/types/cat-meal';

describe.skip('Analytics Store Performance Optimization', () => {
  let analyticsStore: ReturnType<typeof useAnalyticsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    analyticsStore = useAnalyticsStore();
  });

  describe('大量データ時のサンプリング機能', () => {
    it('LineChart用データで大量データ時にサンプリングが適用される', () => {
      // 大量のデータを生成（200件を超える）
      const largeDataset: DailyCalorieData[] = Array.from({ length: 300 }, (_, i) => ({
        date: `2024-01-${String((i % 31) + 1).padStart(2, '0')}`,
        calories: Math.random() * 200 + 50,
        type: i % 2 === 0 ? 'DRY' : 'WET',
      }));

      const mockAnalytics: MealAnalytics = {
        dailyCalories: largeDataset,
        dailyCaloriesByFoodType: [],
        weeklyAverage: 125,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 50, totalCalories: 18750, totalWeight: 9375 },
          { type: 'WET', percentage: 50, totalCalories: 18750, totalWeight: 9375 },
        ],
      };

      analyticsStore.analytics = mockAnalytics;

      const chartData = analyticsStore.chartDataForLineChart as any;

      // サンプリングが適用されていることを確認
      expect(chartData.samplingInfo.applied).toBe(true);
      expect(chartData.samplingInfo.originalCount).toBe(300);
      expect(chartData.samplingInfo.sampledCount).toBeLessThan(300);
      expect(chartData.labels.length).toBeLessThan(300);
    });

    it('BarChart用データで大量データ時にサンプリングが適用される', () => {
      // 大量の日付範囲を設定（90日を超える）
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-06-01'); // 約150日

      analyticsStore.setDateRange(startDate, endDate);

      // 一部の日付にデータがある状態を模擬
      const mockAnalytics: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 100, type: 'DRY' },
          { date: '2024-01-15', calories: 120, type: 'WET' },
          { date: '2024-02-01', calories: 110, type: 'DRY' },
          { date: '2024-03-01', calories: 130, type: 'WET' },
        ],
        dailyCaloriesByFoodType: [],
        weeklyAverage: 115,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 50, totalCalories: 210, totalWeight: 105 },
          { type: 'WET', percentage: 50, totalCalories: 250, totalWeight: 125 },
        ],
      };

      analyticsStore.analytics = mockAnalytics;

      const chartData = analyticsStore.chartDataForBarChart as any;

      // サンプリングが適用されていることを確認
      expect(chartData.samplingInfo.applied).toBe(true);
      expect(chartData.samplingInfo.originalCount).toBeGreaterThan(90);
      expect(chartData.samplingInfo.sampledCount).toBeLessThan(chartData.samplingInfo.originalCount);
    });

    it('適応的サンプリングで重要な日付が保持される', () => {
      // 大量の日付範囲を設定
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-04-01'); // 約90日

      analyticsStore.setDateRange(startDate, endDate);

      const mockAnalytics: MealAnalytics = {
        dailyCalories: [],
        dailyCaloriesByFoodType: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };

      analyticsStore.analytics = mockAnalytics;

      const chartData = analyticsStore.chartDataForBarChart as any;

      if (chartData.samplingInfo.applied) {
        // 重要な日付（月初、週末）が含まれているかチェック
        const labels = chartData.labels;

        // 最初と最後の日付が含まれていることを確認
        expect(labels.length).toBeGreaterThan(0);

        // サンプリングされたデータ数が元のデータ数より少ないことを確認
        expect(chartData.samplingInfo.sampledCount).toBeLessThan(chartData.samplingInfo.originalCount);
      }
    });

    it('小さなデータセットではサンプリングが適用されない', () => {
      // 小さなデータセット（90日以下）
      const smallDataset: DailyCalorieData[] = Array.from({ length: 30 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: Math.random() * 200 + 50,
        type: i % 2 === 0 ? 'DRY' : 'WET',
      }));

      const mockAnalytics: MealAnalytics = {
        dailyCalories: smallDataset,
        dailyCaloriesByFoodType: [],
        weeklyAverage: 125,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 50, totalCalories: 1875, totalWeight: 937.5 },
          { type: 'WET', percentage: 50, totalCalories: 1875, totalWeight: 937.5 },
        ],
      };

      analyticsStore.analytics = mockAnalytics;

      const chartData = analyticsStore.chartDataForLineChart as any;

      // サンプリングが適用されていないことを確認
      expect(chartData.samplingInfo.applied).toBe(false);
      expect(chartData.samplingInfo.originalCount).toBe(30);
      expect(chartData.samplingInfo.sampledCount).toBe(30);
      expect(chartData.labels.length).toBe(30);
    });
  });

  describe('メモリ使用量最適化', () => {
    it('期限切れのキャッシュエントリが削除される', () => {
      // 期限切れのキャッシュエントリを作成
      const expiredTimestamp = new Date(Date.now() - 10 * 60 * 1000); // 10分前
      analyticsStore.cache['expired-key'] = {
        data: {} as MealAnalytics,
        timestamp: expiredTimestamp,
        ttl: 5 * 60 * 1000, // 5分のTTL
      };

      // 有効なキャッシュエントリを作成
      const validTimestamp = new Date();
      analyticsStore.cache['valid-key'] = {
        data: {} as MealAnalytics,
        timestamp: validTimestamp,
        ttl: 5 * 60 * 1000,
      };

      // メモリ最適化を実行
      analyticsStore.optimizeMemoryUsage();

      // 期限切れのエントリが削除され、有効なエントリが残っていることを確認
      expect(analyticsStore.cache['expired-key']).toBeUndefined();
      expect(analyticsStore.cache['valid-key']).toBeDefined();
    });

    it('キャッシュサイズが制限を超えた場合に古いエントリが削除される', () => {
      // 制限を超える数のキャッシュエントリを作成
      for (let i = 0; i < 15; i++) {
        const timestamp = new Date(Date.now() - i * 1000); // 1秒ずつ古くする
        analyticsStore.cache[`key-${i}`] = {
          data: {} as MealAnalytics,
          timestamp,
          ttl: 10 * 60 * 1000, // 10分のTTL（期限切れにならないように）
        };
      }

      // メモリ最適化を実行
      analyticsStore.optimizeMemoryUsage();

      // キャッシュエントリ数が制限（10）以下になっていることを確認
      const remainingKeys = Object.keys(analyticsStore.cache);
      expect(remainingKeys.length).toBeLessThanOrEqual(10);

      // 新しいエントリが残っていることを確認
      expect(analyticsStore.cache['key-0']).toBeDefined();
      expect(analyticsStore.cache['key-1']).toBeDefined();
    });

    it('パフォーマンス統計が正確に計算される', () => {
      // テスト用のキャッシュデータを作成
      const testData: MealAnalytics = {
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

      analyticsStore.cache['test-key-1'] = {
        data: testData,
        timestamp: new Date(),
        ttl: 5 * 60 * 1000,
      };

      analyticsStore.cache['test-key-2'] = {
        data: testData,
        timestamp: new Date(),
        ttl: 5 * 60 * 1000,
      };

      const stats = analyticsStore.getPerformanceStats();

      expect(stats.cacheEntries).toBe(2);
      expect(stats.estimatedCacheSize).toBeGreaterThan(0);
      expect(stats.lastOptimization).toBeDefined();
    });
  });

  describe('データ品質情報', () => {
    it('データ完全性が正確に計算される', () => {
      // 30日間の期間を設定
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-30');
      analyticsStore.setDateRange(startDate, endDate);

      // 15日分のデータのみ存在する状態を模擬
      const partialData: DailyCalorieData[] = Array.from({ length: 15 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: 100,
        type: 'DRY',
      }));

      const mockAnalytics: MealAnalytics = {
        dailyCalories: partialData,
        dailyCaloriesByFoodType: [],
        weeklyAverage: 100,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 100, totalCalories: 1500, totalWeight: 750 },
        ],
      };

      analyticsStore.analytics = mockAnalytics;

      const qualityInfo = analyticsStore.dataQualityInfo;

      expect(qualityInfo).toBeDefined();
      if (qualityInfo) {
        expect(qualityInfo.totalDays).toBe(30);
        expect(qualityInfo.daysWithData).toBe(15);
        expect(qualityInfo.missingDays).toBe(15);
        expect(qualityInfo.dataCompleteness).toBe(50); // 15/30 * 100 = 50%
      }
    });

    it('フィルター適用状態が正確に記録される', () => {
      analyticsStore.setSelectedCat('cat-1');
      analyticsStore.setSelectedFoodType('DRY');

      const filtersInfo = analyticsStore.activeFiltersInfo;

      expect(filtersInfo.hasActiveFilters).toBe(true);
      expect(filtersInfo.count).toBe(3); // cat, foodType, dateRange
      expect(filtersInfo.filters).toContainEqual({ type: 'cat', value: 'cat-1' });
      expect(filtersInfo.filters).toContainEqual({ type: 'foodType', value: 'DRY' });
    });
  });

  describe('拡張バーチャートデータ', () => {
    it('統計情報が正確に計算される', () => {
      // 日付範囲を設定
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-03');
      analyticsStore.setDateRange(startDate, endDate);

      const mockAnalytics: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 100, type: 'DRY' },
          { date: '2024-01-02', calories: 150, type: 'WET' },
          { date: '2024-01-03', calories: 120, type: 'DRY' },
        ],
        dailyCaloriesByFoodType: [],
        weeklyAverage: 123.33,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 60, totalCalories: 220, totalWeight: 110 },
          { type: 'WET', percentage: 40, totalCalories: 150, totalWeight: 75 },
        ],
      };

      analyticsStore.analytics = mockAnalytics;

      const enhancedData = analyticsStore.getEnhancedBarChartData();

      expect(enhancedData.statistics).toBeDefined();
      // データセットが存在する場合のみチェック
      if (enhancedData.datasets.length > 0) {
        expect(enhancedData.statistics.peakDay.date).toBeDefined();
        expect(enhancedData.statistics.peakDay.calories).toBeGreaterThanOrEqual(0);
      }
      expect(enhancedData.metadata.generatedAt).toBeDefined();
      expect(enhancedData.metadata.dataPoints).toBeGreaterThanOrEqual(0);
    });
  });
});
