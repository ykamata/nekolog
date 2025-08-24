import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';
import type { MealAnalytics, DailyCalorieData } from '~/types/cat-meal';
import { FoodType } from '~/types/cat-meal';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('Analytics Store - データ変換ロジックテスト', () => {
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
      { date: '2024-01-04', calories: 160, type: FoodType.DRY },
      // 2024-01-04にはウェットフードのデータなし（欠損データのテスト）
    ];

    const mockAnalytics: MealAnalytics = {
      dailyCalories: mockDailyCalorieData,
      weeklyAverage: 155,
      foodTypeBreakdown: [
        { type: FoodType.DRY, percentage: 65.7, totalCalories: 690, totalWeight: 345 },
        { type: FoodType.WET, percentage: 34.3, totalCalories: 300, totalWeight: 150 },
      ],
    };

    beforeEach(() => {
      analyticsStore.analytics = mockAnalytics;
      analyticsStore.setDateRange(new Date('2024-01-01'), new Date('2024-01-04'));
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
        '2024-01-04',
      ]);
    });

    it('ドライフードデータセットが正しく生成される', () => {
      const chartData = analyticsStore.chartDataForBarChart;
      const dryDataset = chartData.datasets.find(ds => ds.label === 'ドライフード');

      expect(dryDataset).toBeDefined();
      expect(dryDataset?.data).toEqual([150, 200, 180, 160]);
      expect(dryDataset?.stack).toBe('calories');
    });

    it('ウェットフードデータセットが正しく生成される', () => {
      const chartData = analyticsStore.chartDataForBarChart;
      const wetDataset = chartData.datasets.find(ds => ds.label === 'ウェットフード');

      expect(wetDataset).toBeDefined();
      expect(wetDataset?.data).toEqual([100, 80, 120, 0]); // 2024-01-04は0
      expect(wetDataset?.stack).toBe('calories');
    });

    it('データ欠損日が正しく識別される', () => {
      // 2024-01-05にデータがない状態をテスト
      analyticsStore.setDateRange(new Date('2024-01-01'), new Date('2024-01-05'));

      const chartData = analyticsStore.chartDataForBarChart;

      expect(chartData.missingDataDates).toContain('2024-01-05');
    });

    it('適用されたフィルター情報が正しく記録される', () => {
      analyticsStore.setSelectedCat('test-cat-id');
      analyticsStore.setSelectedFoodType(FoodType.DRY);

      const chartData = analyticsStore.chartDataForBarChart;

      expect(chartData.appliedFilters).toEqual({
        dateRange: {
          startDate: '2024-01-01T00:00:00.000Z',
          endDate: '2024-01-04T00:00:00.000Z',
        },
        catId: 'test-cat-id',
        foodType: FoodType.DRY,
      });
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

  describe('拡張バーチャートデータ変換', () => {
    const mockAnalytics: MealAnalytics = {
      dailyCalories: [
        { date: '2024-01-01', calories: 250, type: FoodType.DRY },
        { date: '2024-01-02', calories: 300, type: FoodType.WET },
        { date: '2024-01-03', calories: 200, type: FoodType.DRY },
      ],
      weeklyAverage: 250,
      foodTypeBreakdown: [
        { type: FoodType.DRY, percentage: 60, totalCalories: 450, totalWeight: 225 },
        { type: FoodType.WET, percentage: 40, totalCalories: 300, totalWeight: 150 },
      ],
    };

    beforeEach(() => {
      analyticsStore.analytics = mockAnalytics;
      analyticsStore.setDateRange(new Date('2024-01-01'), new Date('2024-01-03'));
    });

    it('getEnhancedBarChartDataが基本チャートデータを含む', () => {
      const enhancedData = analyticsStore.getEnhancedBarChartData();

      expect(enhancedData).toHaveProperty('labels');
      expect(enhancedData).toHaveProperty('datasets');
      expect(enhancedData?.labels).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
      expect(enhancedData?.datasets).toHaveLength(2);
    });

    it('データ品質情報が正しく含まれる', () => {
      const enhancedData = analyticsStore.getEnhancedBarChartData();

      expect(enhancedData?.qualityInfo).toBeDefined();
      expect(enhancedData?.qualityInfo?.totalDays).toBe(3);
      expect(enhancedData?.qualityInfo?.daysWithData).toBe(3);
      expect(enhancedData?.qualityInfo?.dataCompleteness).toBe(100);
    });

    it('統計情報が正しく計算される', () => {
      const enhancedData = analyticsStore.getEnhancedBarChartData();

      expect(enhancedData?.statistics).toBeDefined();
      expect(enhancedData?.statistics.totalCalories).toBe(750); // 250 + 300 + 200
      expect(enhancedData?.statistics.averageDaily).toBe(250); // 750 / 3
      expect(enhancedData?.statistics.peakDay).toEqual({
        date: '2024-01-02',
        calories: 300,
      });
    });

    it('メタデータが正しく生成される', () => {
      const enhancedData = analyticsStore.getEnhancedBarChartData();

      expect(enhancedData?.metadata).toBeDefined();
      expect(enhancedData?.metadata.generatedAt).toBeDefined();
      expect(enhancedData?.metadata.filters).toEqual(analyticsStore.currentFilters);
    });

    it('データが存在しない場合はnullを返す', () => {
      analyticsStore.analytics = null;

      const enhancedData = analyticsStore.getEnhancedBarChartData();

      expect(enhancedData).toBeNull();
    });
  });

  describe('データ品質情報の計算', () => {
    beforeEach(() => {
      analyticsStore.setDateRange(new Date('2024-01-01'), new Date('2024-01-10'));
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

    it('欠損期間の詳細が正しく分析される', () => {
      const sparseData: DailyCalorieData[] = [
        { date: '2024-01-01', calories: 200, type: FoodType.DRY },
        { date: '2024-01-05', calories: 200, type: FoodType.DRY },
        { date: '2024-01-10', calories: 200, type: FoodType.DRY },
      ];

      analyticsStore.analytics = {
        dailyCalories: sparseData,
        weeklyAverage: 200,
        foodTypeBreakdown: [
          { type: FoodType.DRY, percentage: 100, totalCalories: 600, totalWeight: 300 },
        ],
      };

      const qualityInfo = analyticsStore.dataQualityInfo;

      expect(qualityInfo?.missingDateRanges).toBeDefined();
      expect(qualityInfo?.longestMissingPeriod).toBeGreaterThan(0);
    });

    it('データが存在しない場合はnullを返す', () => {
      analyticsStore.analytics = null;

      const qualityInfo = analyticsStore.dataQualityInfo;

      expect(qualityInfo).toBeNull();
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
      { date: '2024-01-03', calories: 90, type: FoodType.DRY },
      // 2024-01-03にはウェットフードなし
    ];

    beforeEach(() => {
      analyticsStore.analytics = {
        dailyCalories: mockMixedData,
        weeklyAverage: 90,
        foodTypeBreakdown: [
          { type: FoodType.DRY, percentage: 70.5, totalCalories: 310, totalWeight: 155 },
          { type: FoodType.WET, percentage: 29.5, totalCalories: 130, totalWeight: 65 },
        ],
      };
    });

    it('ドライフード割合が正しく計算される', () => {
      expect(analyticsStore.dryFoodPercentage).toBe(70.5);
    });

    it('ウェットフード割合が正しく計算される', () => {
      expect(analyticsStore.wetFoodPercentage).toBe(29.5);
    });

    it('フードタイプ別内訳が正しく取得される', () => {
      const breakdown = analyticsStore.foodTypeBreakdown;

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0]).toEqual({
        type: FoodType.DRY,
        percentage: 70.5,
        totalCalories: 310,
        totalWeight: 155,
      });
      expect(breakdown[1]).toEqual({
        type: FoodType.WET,
        percentage: 29.5,
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

  describe('アクティブフィルター情報', () => {
    it('フィルターが設定されていない場合の情報を返す', () => {
      const filtersInfo = analyticsStore.activeFiltersInfo;

      expect(filtersInfo.hasActiveFilters).toBe(false);
      expect(filtersInfo.count).toBe(1); // 日付範囲のみ
      expect(filtersInfo.filters).toHaveLength(1);
      expect(filtersInfo.filters[0].type).toBe('dateRange');
    });

    it('複数のフィルターが設定されている場合の情報を返す', () => {
      analyticsStore.setSelectedCat('test-cat');
      analyticsStore.setSelectedFoodType(FoodType.DRY);

      const filtersInfo = analyticsStore.activeFiltersInfo;

      expect(filtersInfo.hasActiveFilters).toBe(true);
      expect(filtersInfo.count).toBe(3); // 日付範囲 + 猫 + フードタイプ
      expect(filtersInfo.filters).toHaveLength(3);

      const filterTypes = filtersInfo.filters.map(f => f.type);
      expect(filterTypes).toContain('dateRange');
      expect(filterTypes).toContain('cat');
      expect(filterTypes).toContain('foodType');
    });
  });
});
