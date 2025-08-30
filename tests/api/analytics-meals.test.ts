/**
 * チャート分析ユーティリティのテスト
 */

import { describe, it, expect } from 'vitest';
import {
  generateChartData,
  processMealRecordsForChart,
  calculateFoodTypeStats,
  validateDateRange,
  formatDateForChart,
  type ChartFilters,
} from '~/utils/chart-data-processing';
import type { MealRecord } from '~/types/cat-meal';

describe('Chart Data Processing', () => {
  // テスト用のモックデータ
  const mockMealRecords: MealRecord[] = [
    {
      id: 'meal1',
      catId: 'cat1',
      foodId: 'food1',
      quantity: 30,
      calories: 105,
      mealTime: new Date('2024-01-01T08:00:00Z'),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: {
        id: 'cat1',
        name: 'テスト猫1',
        birthdate: null,
        weight: null,
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      food: {
        id: 'food1',
        name: 'ドライフード',
        type: 'DRY',
        brand: null,
        caloriesPerGram: 3.5,
        pricePerUnit: null,
        unit: 'g',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'meal2',
      catId: 'cat1',
      foodId: 'food2',
      quantity: 50,
      calories: 60,
      mealTime: new Date('2024-01-02T08:00:00Z'),
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      cat: {
        id: 'cat1',
        name: 'テスト猫1',
        birthdate: null,
        weight: null,
        photoUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      food: {
        id: 'food2',
        name: 'ウェットフード',
        type: 'WET',
        brand: null,
        caloriesPerGram: 1.2,
        pricePerUnit: null,
        unit: 'g',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  describe('processMealRecordsForChart', () => {
    it('食事記録を正しくチャートデータポイントに変換する', () => {
      const filters: ChartFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        chartType: 'line',
      };

      const result = processMealRecordsForChart(mockMealRecords, filters);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        date: '2024/01/01',
        catId: 'cat1',
        catName: 'テスト猫1',
        totalCalories: 105,
        dryFoodCalories: 105,
        wetFoodCalories: 0,
        mealCount: 1,
      });
      expect(result[1]).toMatchObject({
        date: '2024/01/02',
        catId: 'cat1',
        catName: 'テスト猫1',
        totalCalories: 60,
        dryFoodCalories: 0,
        wetFoodCalories: 60,
        mealCount: 1,
      });
    });

    it('猫IDでフィルタリングできる', () => {
      const filters: ChartFilters = {
        catId: 'cat1',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        chartType: 'line',
      };

      const result = processMealRecordsForChart(mockMealRecords, filters);

      expect(result).toHaveLength(2);
      result.forEach((point) => {
        expect(point.catId).toBe('cat1');
      });
    });

    it('日付範囲でフィルタリングできる', () => {
      const filters: ChartFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-01'),
        },
        chartType: 'line',
      };

      const result = processMealRecordsForChart(mockMealRecords, filters);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2024/01/01');
    });
  });

  describe('calculateFoodTypeStats', () => {
    it('フードタイプ別の統計を正しく計算する', () => {
      const dataPoints = processMealRecordsForChart(mockMealRecords, {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        chartType: 'line',
      });

      const stats = calculateFoodTypeStats(dataPoints);

      expect(stats.totalDryCalories).toBe(105);
      expect(stats.totalWetCalories).toBe(60);
      expect(stats.dryFoodPercentage).toBeCloseTo(64, 0); // 105/165 * 100
      expect(stats.wetFoodPercentage).toBeCloseTo(36, 0); // 60/165 * 100
      expect(stats.averageDailyCalories).toBeCloseTo(82.5, 1); // 165/2
    });

    it('データが空の場合に0を返す', () => {
      const stats = calculateFoodTypeStats([]);

      expect(stats.totalDryCalories).toBe(0);
      expect(stats.totalWetCalories).toBe(0);
      expect(stats.dryFoodPercentage).toBe(0);
      expect(stats.wetFoodPercentage).toBe(0);
      expect(stats.averageDailyCalories).toBe(0);
    });
  });

  describe('generateChartData', () => {
    it('ラインチャート用のデータを生成する', () => {
      const filters: ChartFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        chartType: 'line',
      };

      const result = generateChartData(mockMealRecords, filters, ['cat1']);

      expect(result.isEmpty).toBe(false);
      expect(result.labels).toEqual(['2024/01/01', '2024/01/02']);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].label).toBe('テスト猫1');
      expect(result.datasets[0].type).toBe('line');
      expect(result.datasets[0].data).toEqual([105, 60]);
    });

    it('バーチャート用のデータを生成する', () => {
      const filters: ChartFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        chartType: 'bar',
      };

      const result = generateChartData(mockMealRecords, filters, ['cat1']);

      expect(result.isEmpty).toBe(false);
      expect(result.datasets).toHaveLength(1);
      expect(result.datasets[0].type).toBe('bar');
    });

    it('積み上げバーチャート用のデータを生成する', () => {
      const filters: ChartFilters = {
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-02'),
        },
        chartType: 'stacked-bar',
      };

      const result = generateChartData(mockMealRecords, filters);

      expect(result.isEmpty).toBe(false);
      expect(result.datasets).toHaveLength(2);
      expect(result.datasets[0].label).toBe('ドライフード');
      expect(result.datasets[1].label).toBe('ウェットフード');
      expect(result.datasets[0].data).toEqual([105, 0]);
      expect(result.datasets[1].data).toEqual([0, 60]);
    });

    it('データが空の場合に適切なレスポンスを返す', () => {
      const filters: ChartFilters = {
        dateRange: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-02'),
        },
        chartType: 'line',
      };

      const result = generateChartData(mockMealRecords, filters);

      expect(result.isEmpty).toBe(true);
      expect(result.labels).toEqual([]);
      expect(result.datasets).toEqual([]);
    });
  });

  describe('validateDateRange', () => {
    it('有効な日付範囲を受け入れる', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-02');

      const result = validateDateRange(startDate, endDate);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('開始日が終了日より後の場合にエラーを返す', () => {
      const startDate = new Date('2024-01-02');
      const endDate = new Date('2024-01-01');

      const result = validateDateRange(startDate, endDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('開始日は終了日より前の日付を選択してください');
    });

    it('365日を超える範囲でエラーを返す', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2025-01-02');

      const result = validateDateRange(startDate, endDate);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('日付範囲は365日以内で選択してください');
    });
  });

  describe('formatDateForChart', () => {
    it('日付を正しい形式でフォーマットする', () => {
      const date = new Date('2024-01-01T08:00:00Z');
      const result = formatDateForChart(date);

      expect(result).toBe('2024/01/01');
    });
  });
});
