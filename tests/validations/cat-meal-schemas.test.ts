/**
 * Unit tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest';
import {
  CatSchema,
  FoodSchema,
  MealRecordSchema,
  CatInputSchema,
  FoodInputSchema,
  MealRecordInputSchema,
  CatUpdateSchema,
  FoodUpdateSchema,
  MealRecordUpdateSchema,
  MealRecordFilterSchema,
  CatFilterSchema,
  FoodFilterSchema,
  MealRecordFormSchema,
  DateRangeSchema,
  QuantityInputSchema,
  FoodTypeSchema,
} from '~/lib/validations/cat-meal';
import { FoodType } from '~/types/cat-meal';

describe('Zod Validation Schemas', () => {
  describe('FoodTypeSchema', () => {
    it('should validate valid food types', () => {
      expect(FoodTypeSchema.parse('DRY')).toBe(FoodType.DRY);
      expect(FoodTypeSchema.parse('WET')).toBe(FoodType.WET);
    });

    it('should reject invalid food types', () => {
      expect(() => FoodTypeSchema.parse('INVALID')).toThrow();
      expect(() => FoodTypeSchema.parse('')).toThrow();
      expect(() => FoodTypeSchema.parse(null)).toThrow();
    });
  });

  describe('CatSchema', () => {
    const validCat = {
      id: 1,
      name: 'ミケ',
      birthdate: new Date('2020-01-01'),
      weight: 4.5,
      photoUrl: 'https://example.com/cat.jpg',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should validate valid cat data', () => {
      const result = CatSchema.parse(validCat);
      expect(result).toEqual(validCat);
    });

    it('should reject invalid cat data', () => {
      expect(() =>
        CatSchema.parse({ ...validCat, id: 0 }),
      ).toThrow();
      expect(() => CatSchema.parse({ ...validCat, name: '' })).toThrow();
      expect(() => CatSchema.parse({ ...validCat, weight: -1 })).toThrow();
      expect(() => CatSchema.parse({ ...validCat, weight: 25 })).toThrow();
      expect(() =>
        CatSchema.parse({ ...validCat, photoUrl: 'invalid-url' }),
      ).toThrow();
    });

    it('should handle optional fields', () => {
      const minimalCat = {
        id: 1,
        name: 'ミケ',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      const result = CatSchema.parse(minimalCat);
      expect(result.birthdate).toBeUndefined();
      expect(result.weight).toBeUndefined();
      expect(result.photoUrl).toBeUndefined();
    });
  });

  describe('FoodSchema', () => {
    const validFood = {
      id: 1,
      name: 'プレミアムドライフード',
      type: FoodType.DRY,
      brand: 'ロイヤルカナン',
      caloriesPerGram: 3.5,
      pricePerUnit: 2000,
      unit: 'g',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should validate valid food data', () => {
      const result = FoodSchema.parse(validFood);
      expect(result).toEqual(validFood);
    });

    it('should reject invalid food data', () => {
      expect(() => FoodSchema.parse({ ...validFood, name: '' })).toThrow();
      expect(() =>
        FoodSchema.parse({ ...validFood, caloriesPerGram: -1 }),
      ).toThrow();
      expect(() =>
        FoodSchema.parse({ ...validFood, caloriesPerGram: 15 }),
      ).toThrow();
      expect(() =>
        FoodSchema.parse({ ...validFood, pricePerUnit: -100 }),
      ).toThrow();
    });

    it('should handle optional fields', () => {
      const minimalFood = {
        id: 1,
        name: 'プレミアムドライフード',
        type: FoodType.DRY,
        caloriesPerGram: 3.5,
        unit: 'g',
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      const result = FoodSchema.parse(minimalFood);
      expect(result.brand).toBeUndefined();
      expect(result.pricePerUnit).toBeUndefined();
    });

    it('should use default unit', () => {
      const foodWithoutUnit = {
        id: 1,
        name: 'プレミアムドライフード',
        type: FoodType.DRY,
        caloriesPerGram: 3.5,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-02'),
      };

      const result = FoodSchema.parse(foodWithoutUnit);
      expect(result.unit).toBe('g');
    });
  });

  describe('MealRecordSchema', () => {
    const validMealRecord = {
      id: 1,
      catId: 1,
      foodId: 2,
      quantity: 50,
      calories: 175,
      mealTime: new Date('2023-01-01T08:00:00.000Z'),
      notes: '朝食',
      createdAt: new Date('2023-01-01T08:00:00.000Z'),
      updatedAt: new Date('2023-01-01T08:00:00.000Z'),
    };

    it('should validate valid meal record data', () => {
      const result = MealRecordSchema.parse(validMealRecord);
      expect(result).toEqual(validMealRecord);
    });

    it('should reject invalid meal record data', () => {
      expect(() =>
        MealRecordSchema.parse({ ...validMealRecord, catId: 0 }),
      ).toThrow();
      expect(() =>
        MealRecordSchema.parse({ ...validMealRecord, foodId: 0 }),
      ).toThrow();
      expect(() =>
        MealRecordSchema.parse({ ...validMealRecord, quantity: -1 }),
      ).toThrow();
      expect(() =>
        MealRecordSchema.parse({ ...validMealRecord, quantity: 1500 }),
      ).toThrow();
      expect(() =>
        MealRecordSchema.parse({ ...validMealRecord, calories: -1 }),
      ).toThrow();
      expect(() =>
        MealRecordSchema.parse({ ...validMealRecord, calories: 6000 }),
      ).toThrow();
    });

    it('should handle optional notes', () => {
      const mealRecordWithoutNotes = { ...validMealRecord };
      delete mealRecordWithoutNotes.notes;

      const result = MealRecordSchema.parse(mealRecordWithoutNotes);
      expect(result.notes).toBeUndefined();
    });

    it('should accept quantities with up to 2 decimal places', () => {
      const testCases = [
        8.7,   // floating-point edge case
        10.5,
        12.34, // 2 decimals
        100,   // integer
        0.1,
        0.01,
      ];

      testCases.forEach((quantity) => {
        const record = { ...validMealRecord, quantity };
        expect(() => MealRecordSchema.parse(record)).not.toThrow();
      });
    });

    it('should reject quantities with more than 2 decimal places', () => {
      const testCases = [
        8.123,   // 3 decimals
        10.5678, // 4 decimals
      ];

      testCases.forEach((quantity) => {
        const record = { ...validMealRecord, quantity };
        expect(() => MealRecordSchema.parse(record)).toThrow('量は小数点以下2桁まで入力できます');
      });
    });
  });

  describe('Input Schemas', () => {
    describe('CatInputSchema', () => {
      it('should validate valid cat input', () => {
        const validInput = {
          name: 'ミケ',
          birthdate: new Date('2020-01-01'),
          weight: 4.5,
          photoUrl: 'https://example.com/cat.jpg',
        };

        const result = CatInputSchema.parse(validInput);
        expect(result).toEqual(validInput);
      });

      it('should reject empty name', () => {
        expect(() => CatInputSchema.parse({ name: '' })).toThrow();
      });

      it('should reject name that is too long', () => {
        const longName = 'a'.repeat(51);
        expect(() => CatInputSchema.parse({ name: longName })).toThrow();
      });
    });

    describe('FoodInputSchema', () => {
      it('should validate valid food input', () => {
        const validInput = {
          name: 'プレミアムドライフード',
          type: FoodType.DRY,
          brand: 'ロイヤルカナン',
          caloriesPerGram: 3.5,
          pricePerUnit: 2000,
          unit: 'g',
        };

        const result = FoodInputSchema.parse(validInput);
        expect(result).toEqual(validInput);
      });

      it('should use default unit', () => {
        const inputWithoutUnit = {
          name: 'プレミアムドライフード',
          type: FoodType.DRY,
          caloriesPerGram: 3.5,
        };

        const result = FoodInputSchema.parse(inputWithoutUnit);
        expect(result.unit).toBe('g');
      });
    });

    describe('MealRecordInputSchema', () => {
      it('should validate valid meal record input', () => {
        const validInput = {
          catId: 1,
          foodId: 2,
          quantity: 50,
          calories: 175,
          mealTime: new Date('2023-01-01T08:00:00.000Z'),
          notes: '朝食',
        };

        const result = MealRecordInputSchema.parse(validInput);
        expect(result).toEqual(validInput);
      });

      it('should accept string date for mealTime', () => {
        const inputWithStringDate = {
          catId: 1,
          foodId: 2,
          quantity: 50,
          calories: 175,
          mealTime: '2023-01-01T08:00:00.000Z',
          notes: '朝食',
        };

        const result = MealRecordInputSchema.parse(inputWithStringDate);
        expect(result.mealTime).toBeInstanceOf(Date);
        expect(result.mealTime.toISOString()).toBe('2023-01-01T08:00:00.000Z');
      });

      it('should handle optional calories', () => {
        const inputWithoutCalories = {
          catId: 1,
          foodId: 2,
          quantity: 50,
          mealTime: new Date('2023-01-01T08:00:00.000Z'),
        };

        const result = MealRecordInputSchema.parse(inputWithoutCalories);
        expect(result.calories).toBeUndefined();
      });
    });
  });

  describe('Update Schemas', () => {
    it('should allow partial updates for cats', () => {
      const partialUpdate = { name: '新しい名前' };
      const result = CatUpdateSchema.parse(partialUpdate);
      expect(result).toEqual(partialUpdate);
    });

    it('should allow partial updates for foods', () => {
      const partialUpdate = { pricePerUnit: 2500 };
      const result = FoodUpdateSchema.parse(partialUpdate);
      expect(result).toEqual(partialUpdate);
    });

    it('should allow partial updates for meal records', () => {
      const partialUpdate = { notes: '更新されたメモ' };
      const result = MealRecordUpdateSchema.parse(partialUpdate);
      expect(result).toEqual(partialUpdate);
    });
  });

  describe('Filter Schemas', () => {
    describe('MealRecordFilterSchema', () => {
      it('should validate meal record filter', () => {
        const filter = {
          catId: 1,
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31'),
          foodType: FoodType.DRY,
          limit: 50,
          offset: 0,
        };

        const result = MealRecordFilterSchema.parse(filter);
        expect(result).toEqual(filter);
      });

      it('should use default values', () => {
        const result = MealRecordFilterSchema.parse({});
        expect(result.limit).toBe(20);
        expect(result.offset).toBe(0);
      });

      it('should reject invalid limit', () => {
        expect(() => MealRecordFilterSchema.parse({ limit: 150 })).toThrow();
        expect(() => MealRecordFilterSchema.parse({ limit: -1 })).toThrow();
      });
    });

    describe('CatFilterSchema', () => {
      it('should validate cat filter', () => {
        const filter = { name: 'ミケ', limit: 10, offset: 5 };
        const result = CatFilterSchema.parse(filter);
        expect(result).toEqual(filter);
      });
    });

    describe('FoodFilterSchema', () => {
      it('should validate food filter', () => {
        const filter = {
          name: 'ドライフード',
          type: FoodType.DRY,
          brand: 'ロイヤルカナン',
          limit: 30,
          offset: 10,
        };

        const result = FoodFilterSchema.parse(filter);
        expect(result).toEqual(filter);
      });
    });
  });

  describe('Special Schemas', () => {
    describe('MealRecordFormSchema', () => {
      it('should validate form data with string IDs', () => {
        const formData = {
          catId: 123,
          foodId: 456,
          quantity: 50,
          calories: 175,
          mealTime: new Date('2023-01-01T08:00:00.000Z'),
          notes: '朝食',
        };

        const result = MealRecordFormSchema.parse(formData);
        expect(result).toEqual(formData);
      });

      it('should reject empty string IDs', () => {
        expect(() =>
          MealRecordFormSchema.parse({
            catId: 0,
            foodId: 456,
            quantity: 50,
            mealTime: new Date(),
          }),
        ).toThrow();
      });
    });

    describe('DateRangeSchema', () => {
      it('should validate valid date range', () => {
        const dateRange = {
          startDate: new Date('2023-01-01'),
          endDate: new Date('2023-01-31'),
        };

        const result = DateRangeSchema.parse(dateRange);
        expect(result).toEqual(dateRange);
      });

      it('should reject invalid date range', () => {
        const invalidRange = {
          startDate: new Date('2023-01-31'),
          endDate: new Date('2023-01-01'),
        };

        expect(() => DateRangeSchema.parse(invalidRange)).toThrow();
      });
    });

    describe('QuantityInputSchema', () => {
      it('should validate gram input', () => {
        const gramInput = { value: 50, unit: 'g' as const };
        const result = QuantityInputSchema.parse(gramInput);
        expect(result).toEqual(gramInput);
      });

      it('should validate calorie input', () => {
        const calorieInput = { value: 175, unit: 'cal' as const };
        const result = QuantityInputSchema.parse(calorieInput);
        expect(result).toEqual(calorieInput);
      });

      it('should reject invalid unit', () => {
        expect(() =>
          QuantityInputSchema.parse({ value: 50, unit: 'kg' }),
        ).toThrow();
      });

      it('should reject negative value', () => {
        expect(() =>
          QuantityInputSchema.parse({ value: -50, unit: 'g' }),
        ).toThrow();
      });
    });
  });

  describe('Error Messages', () => {
    it('should provide Japanese error messages', () => {
      try {
        CatInputSchema.parse({ name: '' });
      }
      catch (error: any) {
        expect(error.errors[0].message).toBe('猫の名前は必須です');
      }
    });

    it('should provide specific validation messages', () => {
      try {
        MealRecordInputSchema.parse({
          catId: 0,
          foodId: 0,
          quantity: -1,
          mealTime: new Date(),
        });
      }
      catch (error: any) {
        const messages = error.errors.map((e: any) => e.message);
        expect(messages).toContain('有効な猫IDを選択してください');
        expect(messages).toContain('有効なフードIDを選択してください');
        expect(messages).toContain('量は正の数値で入力してください');
      }
    });
  });
});
