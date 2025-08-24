import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';
import type { MealAnalytics, DailyCalorieData } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('Analytics Store - データ変換ロジックテスト（簡易版）', () => {
  let analyticsStore: ReturnType<typeof useAnalyticsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    analyticsStore = useAnalyticsStore();
    vi.clearAllMocks();
  });

  describe('積み上げ棒グラフ用データ変換', () => {
    const mockDailyCalorieData: DailyCalorieData[] = [
      { date: '2024-01-01', calories: 150, type: FoodType.DRY },
      { date: '2024-01-01', calories: 100, type: FoodType.WET },
      { date: '2024-01-02', calories: 200, type: FoodType.DRY },
      { date: '2024-01-02', calories: 80, type: FoodType.WET },
      { date: '2024-01-03', calories: 180, type: FoodType.DRY },
      { date: '2024-01-03', calories: 120, type: FoodType.WET },
    ];

    const mockAnalytics: MealAnalytics = {
      dailyCalories: mockDailyCalorieData,
      weeklyAverage: 155,
      foodTypeBreakdown: [
        { type: FoodType.DRY, percentage: 65.7, totalCalories: 530, totalWeight: 265 },
        { type: FoodType.WET, percentage: 34.3, totalCalories: 300, totalWeight: 150 },
      ],
    };

    beforeEach(() => {
      // 直接analyticsに値を設定
      analyticsStore.analytics = mockAnalytics;
      // 日付範囲を設定
      analyticsStore.dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-03'),
      };
    });

    it('chartDataForBarChartが正しい構造のデータを返す', () => {
      const chartData = analyticsStore.chartDataForBarChart;

      expect(chartData).toHaveProperty('labels');
      expect(chartData).toHaveProperty('datasets');
      expect(chartData).toHaveProperty('missingDataDates');
      expect(chartData).toHaveProperty('appliedFilters');

      expect(Array.isArray(chartData.labels)).toBe(true);
      expect(Array.isArray(chartData.datasets)).toBe(true);
      expect(chartData.datasets).toHaveLength(2);
    });

    it('日付ラベルが正しくソートされて生成される', () => {
      const chartData = analyticsStore.chartDataForBarChart;

      expect(chartData.labels).toEqual([
        '2024-01-01',
        '2024-01-02',
        '2024-01-03',
      ]);
    });

    it('ドライフードデータセットが正しく生成される', () => {
      const chartData = analyticsStore.chartDataForBarChart;
      const dryDataset = chartData.datasets.find(ds => ds.label === 'ドライフード');

      expect(dryDataset).toBeDefined();
      expect(dryDataset?.data).toEqual([150, 200, 180]);
    });

    it('ウェットフードデータセットが正しく生成される', () => {
      const chartData = analyticsStore.chartDataForBarChart;
      const wetDataset = chartData.datasets.find(ds => ds.label === 'ウェットフード');

      expect(wetDataset).toBeDefined();
      expect(wetDataset?.data).toEqual([100, 80, 120]);
    });

    it('同じ日付の複数記録が正しく集計される', () => {
      const multipleRecordsData: DailyCalorieData[] = [
        { date: '2024-01-01', calories: 50, type: FoodType.DRY },
        { date: '2024-01-01', calories: 100, type: FoodType.DRY },
        { date: '2024-01-01', calories: 30, type: FoodType.WET },
        { date: '2024-01-01', calories: 70, type: FoodType.WET },
      ];

      analyticsStore.analytics = {
        ...mockAnalytics,
        dailyCalories: multipleRecordsData,
      };

      const chartData = analyticsStore.chartDataForBarChart;
      const dryDataset = chartData.datasets.find(ds => ds.label === 'ドライフード');
      const wetDataset = chartData.datasets.find(ds => ds.label === 'ウェットフード');

      expect(dryDataset?.data[0]).toBe(150); // 50 + 100
      expect(wetDataset?.data[0]).toBe(100); // 30 + 70
    });

    it('空のデータセットでも正しい構造を返す', () => {
      analyticsStore.analytics = {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };

      const chartData = analyticsStore.chartDataForBarChart;

      expect(chartData.labels).toEqual([]);
      expect(chartData.datasets).toHaveLength(2);
      expect(chartData.datasets[0].data).toEqual([]);
      expect(chartData.datasets[1].data).toEqual([]);
    });
  });

  describe('線グラフ用データ変換', () => {
    const mockAnalytics: MealAnalytics = {
      dailyCalories: [
        { date: '2024-01-01', calories: 150, type: FoodType.DRY },
        { date: '2024-01-02', calories: 200, type: FoodType.WET },
        { date: '2024-01-03', calories: 180, type: FoodType.DRY },
      ],
      weeklyAverage: 176.7,
      foodTypeBreakdown: [
        { type: FoodType.DRY, percentage: 62.3, totalCalories: 330, totalWeight: 165 },
        { type: FoodType.WET, percentage: 37.7, totalCalories: 200, totalWeight: 100 },
      ],
    };

    beforeEach(() => {
      analyticsStore.analytics = mockAnalytics;
    });

    it('線グラフ用データが正しい構造で生成される', () => {
      const chartData = analyticsStore.chartDataForLineChart;

      expect(chartData).toHaveProperty('labels');
      expect(chartData).toHaveProperty('datasets');
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].label).toBe('カロリー');
    });

    it('線グラフ用データで全データが含まれる', () => {
      const chartData = analyticsStore.chartDataForLineChart;

      expect(chartData.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
      expect(chartData.datasets[0].data).toEqual([150, 200, 180]);
    });

    it('空のデータセットでも正しい構造を返す', () => {
      analyticsStore.analytics = {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };

      const chartData = analyticsStore.chartDataForLineChart;

      expect(chartData.labels).toEqual([]);
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].data).toEqual([]);
    });
  });

  describe('フードタイプ別データ集計', () => {
    const mockMixedData: DailyCalorieData[] = [
      { date: '2024-01-01', calories: 100, type: FoodType.DRY },
      { date: '2024-01-01', calories: 50, type: FoodType.WET },
      { date: '2024-01-02', calories: 120, type: FoodType.DRY },
      { date: '2024-01-02', calories: 80, type: FoodType.WET },
    ];

    beforeEach(() => {
      analyticsStore.analytics = {
        dailyCalories: mockMixedData,
        weeklyAverage: 87.5,
        foodTypeBreakdown: [
          { type: FoodType.DRY, percentage: 62.9, totalCalories: 220, totalWeight: 110 },
          { type: FoodType.WET, percentage: 37.1, totalCalories: 130, totalWeight: 65 },
        ],
      };
    });

    it('ドライフード割合が正しく計算される', () => {
      expect(analyticsStore.dryFoodPercentage).toBe(62.9);
    });

    it('ウェットフード割合が正しく計算される', () => {
      expect(analyticsStore.wetFoodPercentage).toBe(37.1);
    });

    it('フードタイプ別内訳が正しく取得される', () => {
      const breakdown = analyticsStore.foodTypeBreakdown;

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0]).toEqual({
        type: FoodType.DRY,
        percentage: 62.9,
        totalCalories: 220,
        totalWeight: 110,
      });
      expect(breakdown[1]).toEqual({
        type: FoodType.WET,
        percentage: 37.1,
        totalCalories: 130,
        totalWeight: 65,
      });
    });

    it('データが存在しない場合は0を返す', () => {
      analyticsStore.analytics = null;

      expect(analyticsStore.dryFoodPercentage).toBe(0);
      expect(analyticsStore.wetFoodPercentage).toBe(0);
      expect(analyticsStore.foodTypeBreakdown).toEqual([]);
    });
  });

  describe('日別カロリー計算', () => {
    const mockDailyData: DailyCalorieData[] = [
      { date: '2024-01-01', calories: 200, type: FoodType.DRY },
      { date: '2024-01-02', calories: 250, type: FoodType.WET },
      { date: '2024-01-03', calories: 180, type: FoodType.DRY },
    ];

    beforeEach(() => {
      analyticsStore.analytics = {
        dailyCalories: mockDailyData,
        weeklyAverage: 210,
        foodTypeBreakdown: [
          { type: FoodType.DRY, percentage: 60.3, totalCalories: 380, totalWeight: 190 },
          { type: FoodType.WET, percentage: 39.7, totalCalories: 250, totalWeight: 125 },
        ],
      };
    });

    it('平均日別カロリーが正しく計算される', () => {
      expect(analyticsStore.averageDailyCalories).toBe(210); // (200 + 250 + 180) / 3
    });

    it('今日のカロリーが正しく取得される', () => {
      const today = new Date().toISOString().split('T')[0];
      analyticsStore.analytics = {
        ...analyticsStore.analytics!,
        dailyCalories: [
          ...mockDailyData,
          { date: today, calories: 300, type: FoodType.DRY },
        ],
      };

      expect(analyticsStore.totalCaloriesToday).toBe(300);
    });

    it('今日のデータがない場合は0を返す', () => {
      expect(analyticsStore.totalCaloriesToday).toBe(0);
    });

    it('データが存在しない場合は0を返す', () => {
      analyticsStore.analytics = null;

      expect(analyticsStore.averageDailyCalories).toBe(0);
      expect(analyticsStore.totalCaloriesToday).toBe(0);
    });
  });

  describe('データ品質情報の計算', () => {
    beforeEach(() => {
      analyticsStore.dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
      };
    });

    it('完全なデータセットで100%の完全性を報告する', () => {
      const completeData: DailyCalorieData[] = Array.from({ length: 10 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: 200,
        type: FoodType.DRY,
      }));

      analyticsStore.analytics = {
        dailyCalories: completeData,
        weeklyAverage: 200,
        foodTypeBreakdown: [
          { type: FoodType.DRY, percentage: 100, totalCalories: 2000, totalWeight: 1000 },
        ],
      };

      const qualityInfo = analyticsStore.dataQualityInfo;

      expect(qualityInfo?.dataCompleteness).toBe(100);
      expect(qualityInfo?.missingDays).toBe(0);
      expect(qualityInfo?.hasSignificantGaps).toBe(false);
    });

    it('部分的なデータセットで正しい完全性を計算する', () => {
      const partialData: DailyCalorieData[] = [
        { date: '2024-01-01', calories: 200, type: FoodType.DRY },
        { date: '2024-01-03', calories: 200, type: FoodType.DRY },
        { date: '2024-01-05', calories: 200, type: FoodType.DRY },
      ];

      analyticsStore.analytics = {
        dailyCalories: partialData,
        weeklyAverage: 200,
        foodTypeBreakdown: [
          { type: FoodType.DRY, percentage: 100, totalCalories: 600, totalWeight: 300 },
        ],
      };

      const qualityInfo = analyticsStore.dataQualityInfo;

      expect(qualityInfo?.dataCompleteness).toBe(30); // 3/10 * 100
      expect(qualityInfo?.missingDays).toBe(7);
      expect(qualityInfo?.hasSignificantGaps).toBe(true);
    });

    it('データが存在しない場合はnullを返す', () => {
      analyticsStore.analytics = null;

      const qualityInfo = analyticsStore.dataQualityInfo;

      expect(qualityInfo).toBeNull();
    });
  });
});
