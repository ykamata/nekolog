import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processChartData,
  transformMealDataForChart,
  calculateChartSummary,
  validateChartData,
  optimizeDataForPerformance,
} from '~/utils/chart-data-processing';
import type { MealAnalytics } from '~/types/cat-meal';

describe('chart-data-processing', () => {
  const mockMealData: MealAnalytics = {
    dailyCalories: [
      { date: '2024-01-01', calories: 250.5, type: 'DRY' },
      { date: '2024-01-02', calories: 280.0, type: 'WET' },
      { date: '2024-01-03', calories: 265.5, type: 'DRY' },
      { date: '2024-01-04', calories: 290.0, type: 'WET' },
      { date: '2024-01-05', calories: 275.5, type: 'DRY' },
    ],
    weeklyAverage: 272.3,
    foodTypeBreakdown: [
      { type: 'DRY', percentage: 60 },
      { type: 'WET', percentage: 40 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processChartData', () => {
    it('processes meal data for line chart correctly', () => {
      const result = processChartData(mockMealData, 'line');

      expect(result.labels).toEqual(['1/1', '1/2', '1/3', '1/4', '1/5']);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].label).toBe('カロリー');
      expect(result.datasets[0].data).toEqual([250.5, 280.0, 265.5, 290.0, 275.5]);
      expect(result.datasets[0].type).toBe('line');
    });

    it('processes meal data for bar chart correctly', () => {
      const result = processChartData(mockMealData, 'bar');

      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].type).toBe('bar');
      expect(result.datasets[0].backgroundColor).toBeDefined();
    });

    it('processes meal data for stacked bar chart correctly', () => {
      const result = processChartData(mockMealData, 'stacked-bar');

      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].label).toBe('ドライフード');
      expect(result.datasets[1].label).toBe('ウェットフード');
      expect(result.datasets[0].stack).toBe('food-type');
      expect(result.datasets[1].stack).toBe('food-type');
    });

    it('handles empty data gracefully', () => {
      const emptyData: MealAnalytics = {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };

      const result = processChartData(emptyData, 'line');

      expect(result.labels).toEqual([]);
      expect(result.datasets[0].data).toEqual([]);
      expect(result.isEmpty).toBe(true);
    });

    it('filters data by food type', () => {
      const result = processChartData(mockMealData, 'line', 'DRY');

      const expectedData = [250.5, 0, 265.5, 0, 275.5]; // Only DRY food calories
      expect(result.datasets[0].data).toEqual(expectedData);
    });

    it('applies date range filtering', () => {
      const dateRange = {
        start: new Date('2024-01-02'),
        end: new Date('2024-01-04'),
      };

      const result = processChartData(mockMealData, 'line', null, dateRange);

      expect(result.labels).toEqual(['1/2', '1/3', '1/4']);
      expect(result.datasets[0].data).toEqual([280.0, 265.5, 290.0]);
    });
  });

  describe('transformMealDataForChart', () => {
    it('transforms daily calories to chart format', () => {
      const result = transformMealDataForChart(mockMealData.dailyCalories);

      expect(result.labels).toHaveLength(5);
      expect(result.dryFoodData).toEqual([250.5, 0, 265.5, 0, 275.5]);
      expect(result.wetFoodData).toEqual([0, 280.0, 0, 290.0, 0]);
      expect(result.totalCalories).toEqual([250.5, 280.0, 265.5, 290.0, 275.5]);
    });

    it('handles mixed food types on same day', () => {
      const mixedData = [
        { date: '2024-01-01', calories: 150.0, type: 'DRY' as const },
        { date: '2024-01-01', calories: 100.0, type: 'WET' as const },
        { date: '2024-01-02', calories: 200.0, type: 'DRY' as const },
      ];

      const result = transformMealDataForChart(mixedData);

      expect(result.labels).toEqual(['1/1', '1/2']);
      expect(result.dryFoodData).toEqual([150.0, 200.0]);
      expect(result.wetFoodData).toEqual([100.0, 0]);
      expect(result.totalCalories).toEqual([250.0, 200.0]);
    });

    it('sorts data by date correctly', () => {
      const unsortedData = [
        { date: '2024-01-03', calories: 265.5, type: 'DRY' as const },
        { date: '2024-01-01', calories: 250.5, type: 'DRY' as const },
        { date: '2024-01-02', calories: 280.0, type: 'WET' as const },
      ];

      const result = transformMealDataForChart(unsortedData);

      expect(result.labels).toEqual(['1/1', '1/2', '1/3']);
      expect(result.totalCalories).toEqual([250.5, 280.0, 265.5]);
    });
  });

  describe('calculateChartSummary', () => {
    it('calculates summary statistics correctly', () => {
      const result = calculateChartSummary(mockMealData);

      expect(result.totalCalories).toBe(1361.5); // Sum of all calories
      expect(result.averagePerDay).toBeCloseTo(272.3, 1);
      expect(result.maxCalories).toBe(290.0);
      expect(result.minCalories).toBe(250.5);
      expect(result.dryFoodPercentage).toBe(60);
      expect(result.wetFoodPercentage).toBe(40);
    });

    it('handles empty data in summary calculation', () => {
      const emptyData: MealAnalytics = {
        dailyCalories: [],
        weeklyAverage: 0,
        foodTypeBreakdown: [],
      };

      const result = calculateChartSummary(emptyData);

      expect(result.totalCalories).toBe(0);
      expect(result.averagePerDay).toBe(0);
      expect(result.maxCalories).toBe(0);
      expect(result.minCalories).toBe(0);
      expect(result.dryFoodPercentage).toBe(0);
      expect(result.wetFoodPercentage).toBe(0);
    });

    it('calculates filtered summary correctly', () => {
      const result = calculateChartSummary(mockMealData, 'DRY');

      const dryFoodTotal = 250.5 + 265.5 + 275.5; // 791.5
      expect(result.totalCalories).toBe(dryFoodTotal);
      expect(result.averagePerDay).toBeCloseTo(263.83, 1); // 791.5 / 3
      expect(result.dryFoodPercentage).toBe(100);
      expect(result.wetFoodPercentage).toBe(0);
    });
  });

  describe('validateChartData', () => {
    it('validates correct chart data', () => {
      const validData = {
        labels: ['1/1', '1/2', '1/3'],
        datasets: [{
          label: 'カロリー',
          data: [250, 280, 265],
          type: 'line' as const,
        }],
      };

      const result = validateChartData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects mismatched labels and data length', () => {
      const invalidData = {
        labels: ['1/1', '1/2', '1/3'],
        datasets: [{
          label: 'カロリー',
          data: [250, 280], // Missing one data point
          type: 'line' as const,
        }],
      };

      const result = validateChartData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ラベル数とデータ数が一致しません');
    });

    it('detects invalid data values', () => {
      const invalidData = {
        labels: ['1/1', '1/2', '1/3'],
        datasets: [{
          label: 'カロリー',
          data: [250, NaN, -100], // Invalid values
          type: 'line' as const,
        }],
      };

      const result = validateChartData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('無効なデータ値が含まれています');
    });

    it('detects empty datasets', () => {
      const invalidData = {
        labels: ['1/1', '1/2', '1/3'],
        datasets: [],
      };

      const result = validateChartData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('データセットが空です');
    });
  });

  describe('optimizeDataForPerformance', () => {
    it('reduces data points when count exceeds threshold', () => {
      // Create large dataset
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: 250 + Math.random() * 50,
        type: i % 2 === 0 ? 'DRY' as const : 'WET' as const,
      }));

      const largeAnalytics: MealAnalytics = {
        dailyCalories: largeData,
        weeklyAverage: 275,
        foodTypeBreakdown: [
          { type: 'DRY', percentage: 50 },
          { type: 'WET', percentage: 50 },
        ],
      };

      const result = optimizeDataForPerformance(largeAnalytics, 500);

      expect(result.dailyCalories.length).toBeLessThanOrEqual(500);
      expect(result.dailyCalories.length).toBeGreaterThan(0);
    });

    it('preserves data when under threshold', () => {
      const result = optimizeDataForPerformance(mockMealData, 100);

      expect(result.dailyCalories).toHaveLength(5);
      expect(result).toEqual(mockMealData);
    });

    it('uses intelligent sampling to preserve trends', () => {
      // Create data with clear trend
      const trendData = Array.from({ length: 100 }, (_, i) => ({
        date: `2024-01-${String(i + 1).padStart(2, '0')}`,
        calories: 200 + i * 2, // Increasing trend
        type: 'DRY' as const,
      }));

      const trendAnalytics: MealAnalytics = {
        dailyCalories: trendData,
        weeklyAverage: 300,
        foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
      };

      const result = optimizeDataForPerformance(trendAnalytics, 20);

      expect(result.dailyCalories).toHaveLength(20);

      // Should preserve start and end points
      expect(result.dailyCalories[0].calories).toBe(200);
      expect(result.dailyCalories[19].calories).toBe(398);
    });

    it('handles edge cases in optimization', () => {
      const singlePointData: MealAnalytics = {
        dailyCalories: [{ date: '2024-01-01', calories: 250, type: 'DRY' }],
        weeklyAverage: 250,
        foodTypeBreakdown: [{ type: 'DRY', percentage: 100 }],
      };

      const result = optimizeDataForPerformance(singlePointData, 10);

      expect(result.dailyCalories).toHaveLength(1);
      expect(result).toEqual(singlePointData);
    });
  });

  describe('date formatting', () => {
    it('formats dates correctly for different locales', () => {
      const testData = [
        { date: '2024-01-01', calories: 250, type: 'DRY' as const },
        { date: '2024-12-31', calories: 280, type: 'WET' as const },
      ];

      const result = transformMealDataForChart(testData);

      expect(result.labels).toEqual(['1/1', '12/31']);
    });

    it('handles different date formats', () => {
      const testData = [
        { date: '2024-01-01T00:00:00Z', calories: 250, type: 'DRY' as const },
        { date: '2024-01-02T12:30:00Z', calories: 280, type: 'WET' as const },
      ];

      const result = transformMealDataForChart(testData);

      expect(result.labels).toEqual(['1/1', '1/2']);
    });
  });

  describe('error handling', () => {
    it('handles malformed date strings', () => {
      const malformedData = [
        { date: 'invalid-date', calories: 250, type: 'DRY' as const },
        { date: '2024-01-02', calories: 280, type: 'WET' as const },
      ];

      expect(() => transformMealDataForChart(malformedData)).not.toThrow();

      const result = transformMealDataForChart(malformedData);
      expect(result.labels).toHaveLength(1); // Should skip invalid date
    });

    it('handles null or undefined values', () => {
      const dataWithNulls = [
        { date: '2024-01-01', calories: null as any, type: 'DRY' as const },
        { date: '2024-01-02', calories: 280, type: 'WET' as const },
      ];

      const result = transformMealDataForChart(dataWithNulls);

      expect(result.totalCalories[0]).toBe(0); // Should treat null as 0
      expect(result.totalCalories[1]).toBe(280);
    });
  });
});
