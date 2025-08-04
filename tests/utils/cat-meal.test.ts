/**
 * Unit tests for cat meal utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  transformPrismaCat,
  transformPrismaFood,
  transformPrismaMealRecord,
  validateCatInput,
  validateFoodInput,
  validateMealRecordInput,
  validateMealRecordForm,
  calculateCaloriesFromGrams,
  calculateGramsFromCalories,
  convertQuantityInput,
  formatDate,
  formatDateTime,
  getStartOfDay,
  getEndOfDay,
  getLastNDaysRange,
  groupMealRecordsByDate,
  calculateDailyCalories,
  calculateDailyCaloriesWithFoodType,
  calculateFoodTypeBreakdown,
  calculateWeeklyAverage,
  generateMealAnalytics,
  generateDateRange,
  fillMissingDatesForFoodType,
  createErrorResponse,
  isValidationError,
} from '~/utils/cat-meal';
import { FoodType } from '~/types/cat-meal';
import type { MealRecord } from '~/types/cat-meal';

describe('Data Transformation Functions', () => {
  describe('transformPrismaCat', () => {
    it('should transform Prisma cat model correctly', () => {
      const prismaCat = {
        id: 'cat123',
        name: 'ミケ',
        birthdate: '2020-01-01T00:00:00.000Z',
        weight: 4.5,
        photoUrl: 'https://example.com/cat.jpg',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      const result = transformPrismaCat(prismaCat);

      expect(result).toEqual({
        id: 'cat123',
        name: 'ミケ',
        birthdate: new Date('2020-01-01T00:00:00.000Z'),
        weight: 4.5,
        photoUrl: 'https://example.com/cat.jpg',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
      });
    });

    it('should handle null optional fields', () => {
      const prismaCat = {
        id: 'cat123',
        name: 'ミケ',
        birthdate: null,
        weight: null,
        photoUrl: null,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      const result = transformPrismaCat(prismaCat);

      expect(result.birthdate).toBeUndefined();
      expect(result.weight).toBeNull();
      expect(result.photoUrl).toBeNull();
    });
  });

  describe('transformPrismaFood', () => {
    it('should transform Prisma food model correctly', () => {
      const prismaFood = {
        id: 'food123',
        name: 'プレミアムドライフード',
        type: 'DRY',
        brand: 'ロイヤルカナン',
        caloriesPerGram: 3.5,
        pricePerUnit: 2000,
        unit: 'g',
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-02T00:00:00.000Z',
      };

      const result = transformPrismaFood(prismaFood);

      expect(result).toEqual({
        id: 'food123',
        name: 'プレミアムドライフード',
        type: FoodType.DRY,
        brand: 'ロイヤルカナン',
        caloriesPerGram: 3.5,
        pricePerUnit: 2000,
        unit: 'g',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        updatedAt: new Date('2023-01-02T00:00:00.000Z'),
      });
    });
  });

  describe('transformPrismaMealRecord', () => {
    it('should transform Prisma meal record model correctly', () => {
      const prismaMealRecord = {
        id: 'meal123',
        catId: 'cat123',
        foodId: 'food123',
        quantity: 50,
        calories: 175,
        mealTime: '2023-01-01T08:00:00.000Z',
        notes: '朝食',
        createdAt: '2023-01-01T08:00:00.000Z',
        updatedAt: '2023-01-01T08:00:00.000Z',
      };

      const result = transformPrismaMealRecord(prismaMealRecord);

      expect(result).toEqual({
        id: 'meal123',
        catId: 'cat123',
        foodId: 'food123',
        quantity: 50,
        calories: 175,
        mealTime: new Date('2023-01-01T08:00:00.000Z'),
        notes: '朝食',
        createdAt: new Date('2023-01-01T08:00:00.000Z'),
        updatedAt: new Date('2023-01-01T08:00:00.000Z'),
        cat: undefined,
        food: undefined,
      });
    });
  });
});

describe('Validation Functions', () => {
  describe('validateCatInput', () => {
    it('should validate correct cat input', () => {
      const validInput = {
        name: 'ミケ',
        birthdate: new Date('2020-01-01'),
        weight: 4.5,
        photoUrl: 'https://example.com/cat.jpg',
      };

      const result = validateCatInput(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should reject invalid cat input', () => {
      const invalidInput = {
        name: '',
        weight: -1,
        photoUrl: 'invalid-url',
      };

      const result = validateCatInput(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors).toContain('猫の名前は必須です');
        expect(result.errors).toContain('体重は正の数値で入力してください');
        expect(result.errors).toContain('有効なURLを入力してください');
      }
    });
  });

  describe('validateFoodInput', () => {
    it('should validate correct food input', () => {
      const validInput = {
        name: 'プレミアムドライフード',
        type: FoodType.DRY,
        brand: 'ロイヤルカナン',
        caloriesPerGram: 3.5,
        pricePerUnit: 2000,
        unit: 'g',
      };

      const result = validateFoodInput(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should reject invalid food input', () => {
      const invalidInput = {
        name: '',
        type: 'INVALID',
        caloriesPerGram: -1,
      };

      const result = validateFoodInput(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });

  describe('validateMealRecordInput', () => {
    it('should validate correct meal record input', () => {
      const validInput = {
        catId: 'clh1234567890abcdef123',
        foodId: 'clh1234567890abcdef456',
        quantity: 50,
        calories: 175,
        mealTime: new Date('2023-01-01T08:00:00.000Z'),
        notes: '朝食',
      };

      const result = validateMealRecordInput(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validInput);
      }
    });

    it('should reject invalid meal record input', () => {
      const invalidInput = {
        catId: 'invalid-id',
        foodId: 'invalid-id',
        quantity: -1,
        calories: -1,
      };

      const result = validateMealRecordInput(invalidInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });
  });
});

describe('Calculation Functions', () => {
  describe('calculateCaloriesFromGrams', () => {
    it('should calculate calories correctly', () => {
      expect(calculateCaloriesFromGrams(50, 3.5)).toBe(175);
      expect(calculateCaloriesFromGrams(100, 2.5)).toBe(250);
      expect(calculateCaloriesFromGrams(0, 3.5)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateCaloriesFromGrams(33.33, 3.333)).toBe(111.09);
    });
  });

  describe('calculateGramsFromCalories', () => {
    it('should calculate grams correctly', () => {
      expect(calculateGramsFromCalories(175, 3.5)).toBe(50);
      expect(calculateGramsFromCalories(250, 2.5)).toBe(100);
    });

    it('should handle zero calories per gram', () => {
      expect(calculateGramsFromCalories(100, 0)).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateGramsFromCalories(100, 3.333)).toBe(30.0);
    });
  });

  describe('convertQuantityInput', () => {
    it('should convert grams to calories', () => {
      const input = { value: 50, unit: 'g' as const };
      const result = convertQuantityInput(input, 3.5);

      expect(result).toEqual({
        grams: 50,
        calories: 175,
      });
    });

    it('should convert calories to grams', () => {
      const input = { value: 175, unit: 'cal' as const };
      const result = convertQuantityInput(input, 3.5);

      expect(result).toEqual({
        grams: 50,
        calories: 175,
      });
    });
  });
});

describe('Date Utility Functions', () => {
  describe('formatDate', () => {
    it('should format date in Japanese format', () => {
      const date = new Date('2023-01-01T08:00:00.000Z');
      const result = formatDate(date);

      expect(result).toMatch(/2023\/01\/01/);
    });
  });

  describe('formatDateTime', () => {
    it('should format datetime in Japanese format', () => {
      const date = new Date('2023-01-01T08:30:00.000Z');
      const result = formatDateTime(date);

      expect(result).toMatch(/2023\/01\/01/);
    });
  });

  describe('getStartOfDay', () => {
    it('should return start of day', () => {
      const date = new Date('2023-01-01T15:30:45.123Z');
      const result = getStartOfDay(date);

      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe('getEndOfDay', () => {
    it('should return end of day', () => {
      const date = new Date('2023-01-01T15:30:45.123Z');
      const result = getEndOfDay(date);

      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });
  });

  describe('getLastNDaysRange', () => {
    it('should return correct date range', () => {
      const result = getLastNDaysRange(7);

      expect(result.startDate).toBeInstanceOf(Date);
      expect(result.endDate).toBeInstanceOf(Date);
      expect(result.startDate.getTime()).toBeLessThanOrEqual(
        result.endDate.getTime(),
      );
    });
  });
});

describe('Analytics Functions', () => {
  const mockMealRecords: MealRecord[] = [
    {
      id: 'meal1',
      catId: 'cat1',
      foodId: 'food1',
      quantity: 50,
      calories: 175,
      mealTime: new Date('2023-01-01T08:00:00.000Z'),
      notes: '朝食',
      createdAt: new Date('2023-01-01T08:00:00.000Z'),
      updatedAt: new Date('2023-01-01T08:00:00.000Z'),
      food: {
        id: 'food1',
        name: 'ドライフード',
        type: FoodType.DRY,
        caloriesPerGram: 3.5,
        unit: 'g',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: 'meal2',
      catId: 'cat1',
      foodId: 'food2',
      quantity: 30,
      calories: 90,
      mealTime: new Date('2023-01-01T12:00:00.000Z'),
      notes: '夕食',
      createdAt: new Date('2023-01-01T12:00:00.000Z'),
      updatedAt: new Date('2023-01-01T12:00:00.000Z'),
      food: {
        id: 'food2',
        name: 'ウェットフード',
        type: FoodType.WET,
        caloriesPerGram: 3.0,
        unit: 'g',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ];

  describe('groupMealRecordsByDate', () => {
    it('should group meal records by date', () => {
      const result = groupMealRecordsByDate(mockMealRecords);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result['2023/01/01']).toHaveLength(2);
    });
  });

  describe('calculateDailyCalories', () => {
    it('should calculate daily calories correctly', () => {
      const result = calculateDailyCalories(mockMealRecords);

      expect(result).toHaveLength(1);
      expect(result[0].calories).toBe(265); // 175 + 90
      expect(result[0].date).toBe('2023/01/01');
    });
  });

  describe('calculateFoodTypeBreakdown', () => {
    it('should calculate food type breakdown correctly', () => {
      const result = calculateFoodTypeBreakdown(mockMealRecords);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.type === FoodType.DRY)?.percentage).toBe(66); // 175/265 * 100
      expect(result.find(r => r.type === FoodType.WET)?.percentage).toBe(34); // 90/265 * 100
    });

    it('should handle empty meal records', () => {
      const result = calculateFoodTypeBreakdown([]);

      expect(result).toHaveLength(2);
      expect(result.find(r => r.type === FoodType.DRY)?.percentage).toBe(0);
      expect(result.find(r => r.type === FoodType.WET)?.percentage).toBe(0);
    });
  });

  describe('calculateWeeklyAverage', () => {
    it('should calculate weekly average correctly', () => {
      const dailyCalories = [
        { date: '2023/01/01', calories: 265, type: FoodType.DRY },
        { date: '2023/01/02', calories: 280, type: FoodType.DRY },
        { date: '2023/01/03', calories: 250, type: FoodType.DRY },
      ];

      const result = calculateWeeklyAverage(dailyCalories);

      expect(result).toBeGreaterThan(0);
    });

    it('should handle empty data', () => {
      const result = calculateWeeklyAverage([]);

      expect(result).toBe(0);
    });
  });

  describe('calculateDailyCaloriesWithFoodType', () => {
    it('should calculate daily calories with food type breakdown', () => {
      const result = calculateDailyCaloriesWithFoodType(mockMealRecords);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        date: '2023/01/01',
        dryCalories: 175,
        wetCalories: 90,
        totalCalories: 265,
      });
    });
  });

  describe('generateDateRange', () => {
    it('should generate date range correctly', () => {
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-03');

      const result = generateDateRange(startDate, endDate);

      expect(result).toEqual(['2023/01/01', '2023/01/02', '2023/01/03']);
    });
  });

  describe('fillMissingDatesForFoodType', () => {
    it('should fill missing dates with zero values', () => {
      const data = [
        { date: '2023/01/01', dryCalories: 100, wetCalories: 50, totalCalories: 150 },
        { date: '2023/01/03', dryCalories: 120, wetCalories: 80, totalCalories: 200 },
      ];
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-03');

      const result = fillMissingDatesForFoodType(data, startDate, endDate);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        date: '2023/01/01',
        dryCalories: 100,
        wetCalories: 50,
        totalCalories: 150,
      });
      expect(result[1]).toEqual({
        date: '2023/01/02',
        dryCalories: 0,
        wetCalories: 0,
        totalCalories: 0,
      });
      expect(result[2]).toEqual({
        date: '2023/01/03',
        dryCalories: 120,
        wetCalories: 80,
        totalCalories: 200,
      });
    });
  });

  describe('generateMealAnalytics', () => {
    it('should generate complete analytics', () => {
      const result = generateMealAnalytics(mockMealRecords);

      expect(result).toHaveProperty('dailyCalories');
      expect(result).toHaveProperty('dailyCaloriesByFoodType');
      expect(result).toHaveProperty('weeklyAverage');
      expect(result).toHaveProperty('foodTypeBreakdown');
      expect(result.dailyCalories).toHaveLength(1);
      expect(result.dailyCaloriesByFoodType).toHaveLength(1);
      expect(result.foodTypeBreakdown).toHaveLength(2);
    });
  });
});

describe('Error Handling Functions', () => {
  describe('createErrorResponse', () => {
    it('should create error response with message only', () => {
      const result = createErrorResponse('エラーが発生しました');

      expect(result).toEqual({
        error: 'エラーが発生しました',
      });
    });

    it('should create error response with details', () => {
      const result = createErrorResponse('バリデーションエラー', [
        '名前は必須です',
        '値が無効です',
      ]);

      expect(result).toEqual({
        error: 'バリデーションエラー',
        details: ['名前は必須です', '値が無効です'],
      });
    });
  });

  describe('isValidationError', () => {
    it('should identify validation error correctly', () => {
      const validationError = { success: false, errors: ['エラー'] };
      const otherError = new Error('その他のエラー');

      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(otherError)).toBe(false);
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
    });
  });
});
