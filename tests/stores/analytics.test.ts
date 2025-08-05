import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';
import type {
  MealAnalytics,
  DailyCalorieData, FoodType,
} from '~/types/cat-meal';

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('useAnalyticsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  const mockDailyCalorieData: DailyCalorieData[] = [
    { date: '2023-01-01', calories: 200, type: 'DRY' as FoodType },
    { date: '2023-01-01', calories: 100, type: 'WET' as FoodType },
    { date: '2023-01-02', calories: 250, type: 'DRY' as FoodType },
    { date: '2023-01-02', calories: 80, type: 'WET' as FoodType },
  ];

  const mockAnalytics: MealAnalytics = {
    dailyCalories: mockDailyCalorieData,
    weeklyAverage: 157.5,
    foodTypeBreakdown: [
      { type: 'DRY' as FoodType, percentage: 71.4 },
      { type: 'WET' as FoodType, percentage: 28.6 },
    ],
  };

  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = useAnalyticsStore();

      expect(store.analytics).toBe(null);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(store.selectedCatId).toBe(null);
      expect(store.selectedFoodType).toBe(null);
      expect(store.cache).toEqual({});

      // Check default date range (30 days ago to now)
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(store.dateRange.endDate.toDateString()).toBe(now.toDateString());
      expect(store.dateRange.startDate.toDateString()).toBe(
        thirtyDaysAgo.toDateString(),
      );
    });
  });

  describe('getters', () => {
    beforeEach(() => {
      const store = useAnalyticsStore();
      store.analytics = mockAnalytics;
    });

    it('should get daily calories data', () => {
      const store = useAnalyticsStore();

      expect(store.dailyCaloriesData).toEqual(mockDailyCalorieData);
    });

    it('should get weekly average', () => {
      const store = useAnalyticsStore();

      expect(store.weeklyAverage).toBe(157.5);
    });

    it('should get food type breakdown', () => {
      const store = useAnalyticsStore();

      expect(store.foodTypeBreakdown).toEqual(mockAnalytics.foodTypeBreakdown);
    });

    it('should get dry food percentage', () => {
      const store = useAnalyticsStore();

      expect(store.dryFoodPercentage).toBe(71.4);
    });

    it('should get wet food percentage', () => {
      const store = useAnalyticsStore();

      expect(store.wetFoodPercentage).toBe(28.6);
    });

    it('should get total calories today', () => {
      const store = useAnalyticsStore();
      const today = new Date().toISOString().split('T')[0];
      store.analytics = {
        ...mockAnalytics,
        dailyCalories: [
          { date: today, calories: 300, type: 'DRY' as FoodType },
          { date: '2023-01-01', calories: 200, type: 'DRY' as FoodType },
        ],
      };

      expect(store.totalCaloriesToday).toBe(300);
    });

    it('should calculate average daily calories', () => {
      const store = useAnalyticsStore();

      // mockDailyCalorieData has 4 entries: 200, 100, 250, 80
      // Total: 630, Average: 157.5
      expect(store.averageDailyCalories).toBe(157.5);
    });

    it('should generate chart data for line chart', () => {
      const store = useAnalyticsStore();

      const chartData = store.chartDataForLineChart;

      expect(chartData.labels).toHaveLength(4);
      expect(chartData.datasets).toHaveLength(1);
      expect(chartData.datasets[0].label).toBe('カロリー');
      expect(chartData.datasets[0].data).toEqual([200, 100, 250, 80]);
    });

    it('should generate chart data for bar chart', () => {
      const store = useAnalyticsStore();

      // テスト用の日付範囲を設定（データが存在する期間に限定）
      store.setDateRange(new Date('2023-01-01'), new Date('2023-01-02'));

      const chartData = store.chartDataForBarChart;

      expect(chartData.labels).toHaveLength(2); // 2 unique dates
      expect(chartData.datasets).toHaveLength(2); // DRY and WET
      expect(chartData.datasets[0].label).toBe('ドライフード');
      expect(chartData.datasets[1].label).toBe('ウェットフード');

      // データ欠損情報が含まれていることを確認
      expect(chartData.missingDataDates).toBeDefined();
      expect(Array.isArray(chartData.missingDataDates)).toBe(true);

      // フィルター情報が含まれていることを確認
      expect(chartData.appliedFilters).toBeDefined();
      expect(chartData.appliedFilters.dateRange).toBeDefined();
    });

    it('should return empty data when no analytics', () => {
      const store = useAnalyticsStore();
      store.analytics = null;

      expect(store.dailyCaloriesData).toEqual([]);
      expect(store.weeklyAverage).toBe(0);
      expect(store.foodTypeBreakdown).toEqual([]);
      expect(store.dryFoodPercentage).toBe(0);
      expect(store.wetFoodPercentage).toBe(0);
      expect(store.totalCaloriesToday).toBe(0);
      expect(store.averageDailyCalories).toBe(0);
    });
  });

  describe('fetchAnalytics', () => {
    it('should fetch analytics successfully', async () => {
      const store = useAnalyticsStore();
      mockFetch.mockResolvedValueOnce({ data: mockAnalytics });

      const result = await store.fetchAnalytics();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/meals/analytics?'),
      );
      expect(store.analytics).toEqual(mockAnalytics);
      expect(store.loading).toBe(false);
      expect(store.error).toBe(null);
      expect(result).toEqual(mockAnalytics);
    });

    it('should use cache when valid', async () => {
      const store = useAnalyticsStore();
      const cacheKey = JSON.stringify({
        catId: undefined,
        startDate: store.dateRange.startDate,
        endDate: store.dateRange.endDate,
        foodType: undefined,
      });

      store.cache[cacheKey] = {
        data: mockAnalytics,
        timestamp: new Date(),
        ttl: 5 * 60 * 1000,
      };

      const result = await store.fetchAnalytics();

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result).toEqual(mockAnalytics);
    });

    it('should apply filters in API call', async () => {
      const store = useAnalyticsStore();
      mockFetch.mockResolvedValueOnce({ data: mockAnalytics });

      const filter = {
        catId: 'cat1',
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31'),
        foodType: 'DRY' as FoodType,
      };

      await store.fetchAnalytics(filter);

      const expectedUrl = expect.stringContaining('catId=cat1');
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl);
    });

    it('should handle fetch error', async () => {
      const store = useAnalyticsStore();
      const error = new Error('Fetch failed');
      mockFetch.mockRejectedValueOnce(error);

      await expect(store.fetchAnalytics()).rejects.toThrow('Fetch failed');
      expect(store.error).toBe('Fetch failed');
    });

    it('should force refresh when requested', async () => {
      const store = useAnalyticsStore();
      const cacheKey = JSON.stringify({
        catId: null,
        startDate: store.dateRange.startDate.toISOString(),
        endDate: store.dateRange.endDate.toISOString(),
        foodType: null,
      });

      store.cache[cacheKey] = {
        data: mockAnalytics,
        timestamp: new Date(),
        ttl: 5 * 60 * 1000,
      };
      mockFetch.mockResolvedValueOnce({ data: mockAnalytics });

      await store.fetchAnalytics(undefined, true);

      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('date range actions', () => {
    it('should set date range', () => {
      const store = useAnalyticsStore();
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');

      store.setDateRange(startDate, endDate);

      expect(store.dateRange.startDate).toEqual(startDate);
      expect(store.dateRange.endDate).toEqual(endDate);
    });

    it('should set start date', () => {
      const store = useAnalyticsStore();
      const startDate = new Date('2023-01-01');

      store.setStartDate(startDate);

      expect(store.dateRange.startDate).toEqual(startDate);
    });

    it('should set end date', () => {
      const store = useAnalyticsStore();
      const endDate = new Date('2023-01-31');

      store.setEndDate(endDate);

      expect(store.dateRange.endDate).toEqual(endDate);
    });

    it('should set last 7 days', () => {
      const store = useAnalyticsStore();

      store.setLast7Days();

      const now = new Date();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      expect(store.dateRange.endDate.toDateString()).toBe(now.toDateString());
      expect(store.dateRange.startDate.toDateString()).toBe(
        sevenDaysAgo.toDateString(),
      );
    });

    it('should set last 30 days', () => {
      const store = useAnalyticsStore();

      store.setLast30Days();

      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(store.dateRange.endDate.toDateString()).toBe(now.toDateString());
      expect(store.dateRange.startDate.toDateString()).toBe(
        thirtyDaysAgo.toDateString(),
      );
    });

    it('should set last 90 days', () => {
      const store = useAnalyticsStore();

      store.setLast90Days();

      const now = new Date();
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      expect(store.dateRange.endDate.toDateString()).toBe(now.toDateString());
      expect(store.dateRange.startDate.toDateString()).toBe(
        ninetyDaysAgo.toDateString(),
      );
    });
  });

  describe('filter actions', () => {
    it('should set selected cat', () => {
      const store = useAnalyticsStore();

      store.setSelectedCat('cat1');

      expect(store.selectedCatId).toBe('cat1');
    });

    it('should set selected food type', () => {
      const store = useAnalyticsStore();

      store.setSelectedFoodType('DRY');

      expect(store.selectedFoodType).toBe('DRY');
    });

    it('should clear filters', () => {
      const store = useAnalyticsStore();
      store.selectedCatId = 'cat1';
      store.selectedFoodType = 'DRY';

      store.clearFilters();

      expect(store.selectedCatId).toBe(null);
      expect(store.selectedFoodType).toBe(null);
      // Should reset to default 30 days
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      expect(store.dateRange.endDate.toDateString()).toBe(now.toDateString());
      expect(store.dateRange.startDate.toDateString()).toBe(
        thirtyDaysAgo.toDateString(),
      );
    });
  });

  describe('utility actions', () => {
    it('should refresh data', async () => {
      const store = useAnalyticsStore();
      mockFetch.mockResolvedValueOnce({ data: mockAnalytics });

      await store.refreshData();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should clear error', () => {
      const store = useAnalyticsStore();
      store.error = 'Test error';

      store.clearError();

      expect(store.error).toBe(null);
    });

    it('should clear cache', () => {
      const store = useAnalyticsStore();
      store.cache = {
        test: { data: mockAnalytics, timestamp: new Date(), ttl: 1000 },
      };

      store.clearCache();

      expect(store.cache).toEqual({});
    });
  });

  describe('data export', () => {
    beforeEach(() => {
      const store = useAnalyticsStore();
      store.analytics = mockAnalytics;
    });

    it('should export to CSV', () => {
      const store = useAnalyticsStore();

      const csv = store.exportToCsv();

      expect(csv).toContain('Date,Calories,Food Type');
      expect(csv).toContain('2023-01-01,200,DRY');
      expect(csv).toContain('2023-01-01,100,WET');
    });

    it('should return empty string when no analytics', () => {
      const store = useAnalyticsStore();
      store.analytics = null;

      const csv = store.exportToCsv();

      expect(csv).toBe('');
    });

    it('should get analytics summary', () => {
      const store = useAnalyticsStore();

      const summary = store.getAnalyticsSummary();

      expect(summary).toEqual({
        totalDays: 4,
        totalCalories: 630,
        averageCalories: 157.5,
        weeklyAverage: 157.5,
        foodTypeBreakdown: mockAnalytics.foodTypeBreakdown,
      });
    });

    it('should return null summary when no analytics', () => {
      const store = useAnalyticsStore();
      store.analytics = null;

      const summary = store.getAnalyticsSummary();

      expect(summary).toBe(null);
    });
  });

  describe('enhanced bar chart data', () => {
    it('should provide enhanced bar chart data with quality info', () => {
      const store = useAnalyticsStore();
      store.analytics = mockAnalytics;
      store.setDateRange(new Date('2023-01-01'), new Date('2023-01-02'));

      const enhancedData = store.getEnhancedBarChartData();

      expect(enhancedData.qualityInfo).toBeDefined();
      expect(enhancedData.statistics).toBeDefined();
      expect(enhancedData.metadata).toBeDefined();
      expect(enhancedData.statistics.totalCalories).toBeDefined();
      expect(enhancedData.statistics.averageDaily).toBeDefined();
      expect(enhancedData.statistics.peakDay).toBeDefined();
    });
  });

  describe('data quality info', () => {
    it('should provide data quality information', () => {
      const store = useAnalyticsStore();
      store.analytics = mockAnalytics;
      store.setDateRange(new Date('2023-01-01'), new Date('2023-01-02'));

      const qualityInfo = store.dataQualityInfo;

      expect(qualityInfo).toBeDefined();
      expect(qualityInfo?.totalDays).toBe(2);
      expect(qualityInfo?.daysWithData).toBe(2);
      expect(qualityInfo?.missingDays).toBe(0);
      expect(qualityInfo?.dataCompleteness).toBe(100);
    });

    it('should return null when no analytics', () => {
      const store = useAnalyticsStore();
      store.analytics = null;

      const qualityInfo = store.dataQualityInfo;

      expect(qualityInfo).toBe(null);
    });
  });

  describe('active filters info', () => {
    it('should provide active filters information', () => {
      const store = useAnalyticsStore();
      store.setSelectedCat('cat1');
      store.setSelectedFoodType('DRY' as FoodType);

      const filtersInfo = store.activeFiltersInfo;

      expect(filtersInfo.count).toBe(3); // cat, foodType, dateRange
      expect(filtersInfo.hasActiveFilters).toBe(true);
      expect(filtersInfo.filters).toHaveLength(3);
    });

    it('should indicate no active filters when none are set', () => {
      const store = useAnalyticsStore();

      const filtersInfo = store.activeFiltersInfo;

      expect(filtersInfo.hasActiveFilters).toBe(false);
      expect(filtersInfo.filters).toHaveLength(1); // only dateRange
    });
  });
});
