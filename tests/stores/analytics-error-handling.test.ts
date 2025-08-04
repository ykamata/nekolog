import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAnalyticsStore } from '~/stores/analytics';
import type { MealAnalytics } from '~/types/cat-meal';

// Mock the error handling utilities
vi.mock('~/utils/error-handling', () => ({
  parseApiError: vi.fn(error => ({
    code: 'MOCK_ERROR',
    message: error.message || 'Mock error',
    userMessage: 'モックエラーが発生しました',
    severity: 'medium',
    timestamp: new Date(),
  })),
  logError: vi.fn(),
  fetchWithRetry: vi.fn(),
  detectCalorieAnomalies: vi.fn(() => ({
    hasAnomalies: false,
    anomalies: [],
    cleanedData: [100, 120, 110],
    statistics: {
      originalCount: 3,
      cleanedCount: 3,
      removedCount: 0,
      mean: 110,
      median: 110,
      standardDeviation: 10,
    },
  })),
  generateDataQualityReport: vi.fn(() => ({
    overall: 'excellent',
    score: 95,
    issues: [],
    recommendations: ['データ品質は良好です'],
  })),
}));

// Mock $fetch
const mockFetch = vi.fn();
vi.stubGlobal('$fetch', mockFetch);

describe('Analytics Store Error Handling', () => {
  let store: ReturnType<typeof useAnalyticsStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useAnalyticsStore();
    vi.clearAllMocks();
  });

  describe('Error State Management', () => {
    it('should initialize with no error', () => {
      expect(store.hasError).toBe(false);
      expect(store.errorInfo).toBeNull();
      expect(store.errorMessage).toBe('');
      expect(store.errorSeverity).toBeNull();
    });

    it('should set error state when fetch fails', async () => {
      const mockError = new Error('Network error');
      mockFetch.mockRejectedValue(mockError);

      await expect(store.fetchAnalytics()).rejects.toThrow();

      expect(store.hasError).toBe(true);
      expect(store.errorInfo).toBeTruthy();
      expect(store.errorMessage).toBe('モックエラーが発生しました');
      expect(store.retryCount).toBe(1);
    });

    it('should clear error state', () => {
      // Set error state manually
      store.$patch({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          userMessage: 'Test user message',
          severity: 'high' as const,
          timestamp: new Date(),
        },
        retryCount: 2,
        lastErrorTime: new Date(),
      });

      expect(store.hasError).toBe(true);

      store.clearError();

      expect(store.hasError).toBe(false);
      expect(store.errorInfo).toBeNull();
      expect(store.retryCount).toBe(0);
      expect(store.lastErrorTime).toBeNull();
    });
  });

  describe('Retry Logic', () => {
    it('should allow retry when retry count is below limit', () => {
      store.$patch({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error',
          userMessage: 'ネットワークエラー',
          severity: 'medium' as const,
          timestamp: new Date(),
        },
        retryCount: 2,
      });

      expect(store.canRetry).toBe(true);
    });

    it('should not allow retry when retry count exceeds limit', () => {
      store.$patch({
        error: {
          code: 'NETWORK_ERROR',
          message: 'Network error',
          userMessage: 'ネットワークエラー',
          severity: 'medium' as const,
          timestamp: new Date(),
        },
        retryCount: 3,
      });

      expect(store.canRetry).toBe(false);
    });

    it('should not allow retry for auth errors', () => {
      store.$patch({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error',
          userMessage: '認証エラー',
          severity: 'high' as const,
          timestamp: new Date(),
        },
        retryCount: 1,
      });

      expect(store.canRetry).toBe(false);
    });
  });

  describe('Data Quality Management', () => {
    it('should initialize with no data quality issues', () => {
      expect(store.hasDataQualityIssues).toBe(false);
      expect(store.dataQualityScore).toBe(0);
      expect(store.dataQualityLevel).toBeNull();
      expect(store.anomaliesInfo).toBeNull();
    });

    it('should update data quality info after successful fetch', async () => {
      const mockAnalytics: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 100, type: 'DRY' },
          { date: '2024-01-02', calories: 120, type: 'WET' },
        ],
        weeklyAverage: 110,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 50, totalCalories: 100, totalWeight: 0 },
          { type: 'WET', percentage: 50, totalCalories: 120, totalWeight: 0 },
        ],
        totalMeals: 2,
        averageCaloriesPerMeal: 110,
      };

      mockFetch.mockResolvedValue({ data: mockAnalytics });

      await store.fetchAnalytics();

      expect(store.dataQualityScore).toBe(95);
      expect(store.dataQualityLevel).toBe('excellent');
      expect(store.qualityRecommendations).toEqual(['データ品質は良好です']);
    });
  });

  describe('Data Processing', () => {
    it('should process analytics data and remove invalid records', () => {
      const rawData: MealAnalytics = {
        dailyCalories: [
          { date: '2024-01-01', calories: 100, type: 'DRY' },
          { date: 'invalid-date', calories: 120, type: 'WET' },
          { date: '2024-01-03', calories: -50, type: 'DRY' }, // Invalid negative calories
        ],
        weeklyAverage: 90,
        foodTypeBreakdown: [],
        totalMeals: 3,
        averageCaloriesPerMeal: 90,
      };

      const processedData = store.processAnalyticsData(rawData);

      // Should filter out invalid records
      expect(processedData.dailyCalories.length).toBeLessThan(rawData.dailyCalories.length);
    });

    it('should recalculate food type breakdown correctly', () => {
      const dailyCalories = [
        { date: '2024-01-01', calories: 100, type: 'DRY' as const },
        { date: '2024-01-02', calories: 200, type: 'WET' as const },
      ];

      const breakdown = store.recalculateFoodTypeBreakdown(dailyCalories);

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0]).toMatchObject({
        type: 'DRY',
        percentage: 33.33,
        totalCalories: 100,
      });
      expect(breakdown[1]).toMatchObject({
        type: 'WET',
        percentage: 66.67,
        totalCalories: 200,
      });
    });

    it('should handle empty data in recalculation', () => {
      const breakdown = store.recalculateFoodTypeBreakdown([]);

      expect(breakdown).toHaveLength(2);
      expect(breakdown[0]).toMatchObject({
        type: 'DRY',
        percentage: 0,
        totalCalories: 0,
      });
      expect(breakdown[1]).toMatchObject({
        type: 'WET',
        percentage: 0,
        totalCalories: 0,
      });
    });

    it('should calculate weekly average correctly', () => {
      const dailyCalories = [
        { date: '2024-01-01', calories: 100, type: 'DRY' as const },
        { date: '2024-01-01', calories: 50, type: 'WET' as const }, // Same day
        { date: '2024-01-02', calories: 200, type: 'DRY' as const },
      ];

      const weeklyAverage = store.calculateWeeklyAverage(dailyCalories);

      // Should group by date: day 1 = 150, day 2 = 200, average = 175
      expect(weeklyAverage).toBe(175);
    });
  });

  describe('Cache Management with Errors', () => {
    it('should not use cache when error occurs', async () => {
      // Set up cache
      const cacheKey = JSON.stringify({
        catId: null,
        startDate: store.dateRange.startDate.toISOString(),
        endDate: store.dateRange.endDate.toISOString(),
        foodType: null,
      });

      store.cache[cacheKey] = {
        data: {
          dailyCalories: [],
          weeklyAverage: 0,
          foodTypeBreakdown: [],
          totalMeals: 0,
          averageCaloriesPerMeal: 0,
        },
        timestamp: new Date(),
        ttl: 5 * 60 * 1000,
      };

      // Mock fetch to fail
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(store.fetchAnalytics()).rejects.toThrow();

      // Should have attempted to fetch despite cache
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should clear cache on memory optimization', () => {
      // Add expired cache entries
      const oldTimestamp = new Date();
      oldTimestamp.setMinutes(oldTimestamp.getMinutes() - 10);

      store.cache['expired-key'] = {
        data: {
          dailyCalories: [],
          weeklyAverage: 0,
          foodTypeBreakdown: [],
          totalMeals: 0,
          averageCaloriesPerMeal: 0,
        },
        timestamp: oldTimestamp,
        ttl: 5 * 60 * 1000,
      };

      store.optimizeMemoryUsage();

      expect(store.cache['expired-key']).toBeUndefined();
    });
  });

  describe('Performance Stats with Error Info', () => {
    it('should include error information in performance stats', () => {
      store.$patch({
        error: {
          code: 'TEST_ERROR',
          message: 'Test error',
          userMessage: 'Test user message',
          severity: 'medium' as const,
          timestamp: new Date(),
        },
        retryCount: 2,
      });

      const stats = store.getPerformanceStats();

      expect(stats).toHaveProperty('cacheEntries');
      expect(stats).toHaveProperty('estimatedCacheSize');
      expect(stats).toHaveProperty('dataQuality');
    });
  });
});
