import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import {
  MealRecordInputSchema,
  MealRecordUpdateSchema,
  MealRecordFilterSchema,
} from '~/lib/validations/cat-meal';
import {
  calculateCaloriesFromGrams,
  generateMealAnalytics,
} from '~/utils/cat-meal';

describe.skip('Meal Record Management API Logic', () => {
  // Test data
  let testCatId: string;
  let testCat2Id: string;
  let testFoodId: string;
  let testFood2Id: string;
  let createdMealId: string;

  const testMealRecord = {
    quantity: 50,
    calories: 175,
    mealTime: new Date('2024-01-15T08:00:00Z'),
    notes: '朝ごはん',
  };

  const testMealRecord2 = {
    quantity: 30,
    calories: 105,
    mealTime: new Date('2024-01-15T18:00:00Z'),
    notes: '夜ごはん',
  };

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.mealRecord.deleteMany({
      where: {
        OR: [
          {
            cat: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
          {
            food: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
        ],
      },
    });
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.food.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });

    // Create test cats
    const cat1 = await prisma.cat.create({
      data: {
        name: 'テスト猫1',
        birthdate: new Date('2020-01-01'),
        weight: 4.5,
      },
    });
    testCatId = cat1.id;

    const cat2 = await prisma.cat.create({
      data: {
        name: 'テスト猫2',
        birthdate: new Date('2021-06-15'),
        weight: 3.2,
      },
    });
    testCat2Id = cat2.id;

    // Create test foods
    const food1 = await prisma.food.create({
      data: {
        name: 'テストドライフード',
        type: 'DRY',
        brand: 'テストブランド',
        caloriesPerGram: 3.5,
        pricePerUnit: 1500,
      },
    });
    testFoodId = food1.id;

    const food2 = await prisma.food.create({
      data: {
        name: 'テストウェットフード',
        type: 'WET',
        brand: 'テストブランド',
        caloriesPerGram: 1.2,
        pricePerUnit: 200,
      },
    });
    testFood2Id = food2.id;
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.mealRecord.deleteMany({
      where: {
        OR: [
          {
            cat: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
          {
            food: {
              name: {
                startsWith: 'テスト',
              },
            },
          },
        ],
      },
    });
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
    await prisma.food.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
  });

  describe('Meal Record Creation Logic', () => {
    it('should validate meal record input schema with valid data', () => {
      const mealData = {
        catId: testCatId,
        foodId: testFoodId,
        ...testMealRecord,
      };

      const result = MealRecordInputSchema.safeParse(mealData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testCatId);
        expect(result.data.foodId).toBe(testFoodId);
        expect(result.data.quantity).toBe(testMealRecord.quantity);
        expect(result.data.calories).toBe(testMealRecord.calories);
      }
    });

    it('should reject invalid meal record input data', () => {
      const invalidMeal = {
        catId: 'invalid-id',
        foodId: 'invalid-id',
        quantity: -1, // Negative quantity
        calories: -1, // Negative calories
        mealTime: 'invalid-date',
      };

      const result = MealRecordInputSchema.safeParse(invalidMeal);
      expect(result.success).toBe(false);
    });

    it('should create meal record in database', async () => {
      const mealData = {
        catId: testCatId,
        foodId: testFoodId,
        ...testMealRecord,
      };

      const validatedData = MealRecordInputSchema.parse(mealData);

      const mealRecord = await prisma.mealRecord.create({
        data: validatedData,
        include: {
          cat: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          food: {
            select: {
              id: true,
              name: true,
              type: true,
              brand: true,
              caloriesPerGram: true,
              unit: true,
            },
          },
        },
      });

      expect(mealRecord.catId).toBe(testCatId);
      expect(mealRecord.foodId).toBe(testFoodId);
      expect(mealRecord.quantity).toBe(testMealRecord.quantity);
      expect(mealRecord.calories).toBe(testMealRecord.calories);
      expect(mealRecord.notes).toBe(testMealRecord.notes);
      expect(mealRecord.cat?.name).toBe('テスト猫1');
      expect(mealRecord.food?.name).toBe('テストドライフード');

      createdMealId = mealRecord.id;
    });

    it('should auto-calculate calories when not provided', async () => {
      const food = await prisma.food.findUnique({
        where: { id: testFoodId },
        select: { caloriesPerGram: true },
      });

      const mealData = {
        catId: testCatId,
        foodId: testFoodId,
        quantity: 50,
        mealTime: new Date(),
      };

      const expectedCalories = calculateCaloriesFromGrams(
        mealData.quantity,
        food!.caloriesPerGram,
      );

      const mealRecord = await prisma.mealRecord.create({
        data: {
          ...mealData,
          calories: expectedCalories,
        },
      });

      expect(mealRecord.calories).toBe(expectedCalories);
      expect(mealRecord.calories).toBe(175); // 50 * 3.5 = 175
    });

    it('should validate cat and food existence', async () => {
      // Test with non-existent cat
      const catExists = await prisma.cat.findUnique({
        where: { id: 'non-existent-cat-id' },
      });
      expect(catExists).toBeNull();

      // Test with non-existent food
      const foodExists = await prisma.food.findUnique({
        where: { id: 'non-existent-food-id' },
      });
      expect(foodExists).toBeNull();

      // Test with valid IDs
      const validCat = await prisma.cat.findUnique({
        where: { id: testCatId },
      });
      expect(validCat).not.toBeNull();

      const validFood = await prisma.food.findUnique({
        where: { id: testFoodId },
      });
      expect(validFood).not.toBeNull();
    });
  });

  describe('Meal Record Reading Logic', () => {
    beforeEach(async () => {
      const mealRecord = await prisma.mealRecord.create({
        data: {
          catId: testCatId,
          foodId: testFoodId,
          ...testMealRecord,
        },
      });
      createdMealId = mealRecord.id;
    });

    it('should find meal record by ID', async () => {
      const mealRecord = await prisma.mealRecord.findUnique({
        where: { id: createdMealId },
        include: {
          cat: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
          food: {
            select: {
              id: true,
              name: true,
              type: true,
              brand: true,
              caloriesPerGram: true,
              unit: true,
            },
          },
        },
      });

      expect(mealRecord).not.toBeNull();
      expect(mealRecord?.id).toBe(createdMealId);
      expect(mealRecord?.catId).toBe(testCatId);
      expect(mealRecord?.foodId).toBe(testFoodId);
      expect(mealRecord?.cat?.name).toBe('テスト猫1');
      expect(mealRecord?.food?.name).toBe('テストドライフード');
    });

    it('should list meal records with filtering', async () => {
      // Create additional meal records
      await prisma.mealRecord.create({
        data: {
          catId: testCat2Id,
          foodId: testFood2Id,
          ...testMealRecord2,
        },
      });

      // Test filtering by cat
      const catMeals = await prisma.mealRecord.findMany({
        where: { catId: testCatId },
        include: {
          cat: { select: { name: true } },
          food: { select: { name: true, type: true } },
        },
      });

      expect(catMeals).toHaveLength(1);
      expect(catMeals[0].cat?.name).toBe('テスト猫1');

      // Test filtering by food type
      const dryFoodMeals = await prisma.mealRecord.findMany({
        where: {
          food: { type: 'DRY' },
          cat: {
            name: {
              startsWith: 'テスト',
            },
          },
        },
        include: {
          food: { select: { type: true } },
        },
      });

      expect(dryFoodMeals).toHaveLength(1);
      expect(dryFoodMeals[0].food?.type).toBe('DRY');
    });

    it('should support date range filtering', async () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-15T23:59:59Z');

      const mealsInRange = await prisma.mealRecord.findMany({
        where: {
          mealTime: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      expect(mealsInRange).toHaveLength(1);
      expect(mealsInRange[0].mealTime.getDate()).toBe(15);
    });

    it('should support pagination', async () => {
      // Create additional meal records
      for (let i = 0; i < 5; i++) {
        await prisma.mealRecord.create({
          data: {
            catId: testCatId,
            foodId: testFoodId,
            quantity: 30 + i,
            calories: 105 + i * 3.5,
            mealTime: new Date(`2024-01-${16 + i}T08:00:00Z`),
          },
        });
      }

      const [meals, total] = await Promise.all([
        prisma.mealRecord.findMany({
          where: { catId: testCatId },
          orderBy: { mealTime: 'desc' },
          take: 3,
          skip: 0,
        }),
        prisma.mealRecord.count({
          where: { catId: testCatId },
        }),
      ]);

      expect(meals).toHaveLength(3);
      expect(total).toBe(6); // 1 original + 5 new
    });

    it('should validate filter schema', () => {
      const validFilter = {
        catId: testCatId,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        foodType: 'DRY' as const,
        limit: 20,
        offset: 0,
      };

      const result = MealRecordFilterSchema.safeParse(validFilter);
      expect(result.success).toBe(true);

      const invalidFilter = {
        catId: 'invalid-id',
        limit: -1,
        offset: -1,
      };

      const invalidResult = MealRecordFilterSchema.safeParse(invalidFilter);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Meal Record Update Logic', () => {
    beforeEach(async () => {
      const mealRecord = await prisma.mealRecord.create({
        data: {
          catId: testCatId,
          foodId: testFoodId,
          ...testMealRecord,
        },
      });
      createdMealId = mealRecord.id;
    });

    it('should validate meal record update schema', () => {
      const updateData = {
        quantity: 60,
        notes: '更新されたメモ',
      };

      const result = MealRecordUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.quantity).toBe(updateData.quantity);
        expect(result.data.notes).toBe(updateData.notes);
      }
    });

    it('should update meal record in database', async () => {
      const updateData = {
        quantity: 60,
        notes: '更新されたメモ',
      };

      const validatedData = MealRecordUpdateSchema.parse(updateData);

      const updatedMeal = await prisma.mealRecord.update({
        where: { id: createdMealId },
        data: validatedData,
        include: {
          cat: { select: { name: true } },
          food: { select: { name: true, caloriesPerGram: true } },
        },
      });

      expect(updatedMeal.quantity).toBe(updateData.quantity);
      expect(updatedMeal.notes).toBe(updateData.notes);
      expect(updatedMeal.catId).toBe(testCatId); // Should remain unchanged
    });

    it('should recalculate calories when quantity or food changes', async () => {
      const food = await prisma.food.findUnique({
        where: { id: testFoodId },
        select: { caloriesPerGram: true },
      });

      const newQuantity = 80;
      const expectedCalories = calculateCaloriesFromGrams(
        newQuantity,
        food!.caloriesPerGram,
      );

      const updatedMeal = await prisma.mealRecord.update({
        where: { id: createdMealId },
        data: {
          quantity: newQuantity,
          calories: expectedCalories,
        },
      });

      expect(updatedMeal.quantity).toBe(newQuantity);
      expect(updatedMeal.calories).toBe(expectedCalories);
      expect(updatedMeal.calories).toBe(280); // 80 * 3.5 = 280
    });

    it('should handle partial updates', async () => {
      const updateData = { notes: '部分更新のメモ' };

      const validatedData = MealRecordUpdateSchema.parse(updateData);

      const updatedMeal = await prisma.mealRecord.update({
        where: { id: createdMealId },
        data: validatedData,
      });

      expect(updatedMeal.notes).toBe(updateData.notes);
      expect(updatedMeal.quantity).toBe(testMealRecord.quantity); // Should remain unchanged
      expect(updatedMeal.calories).toBe(testMealRecord.calories); // Should remain unchanged
    });

    it('should validate cat and food existence on update', async () => {
      // Test updating with valid cat ID
      const updateWithValidCat = await prisma.mealRecord.update({
        where: { id: createdMealId },
        data: { catId: testCat2Id },
      });
      expect(updateWithValidCat.catId).toBe(testCat2Id);

      // Test updating with valid food ID
      const updateWithValidFood = await prisma.mealRecord.update({
        where: { id: createdMealId },
        data: { foodId: testFood2Id },
      });
      expect(updateWithValidFood.foodId).toBe(testFood2Id);
    });
  });

  describe('Meal Record Deletion Logic', () => {
    beforeEach(async () => {
      const mealRecord = await prisma.mealRecord.create({
        data: {
          catId: testCatId,
          foodId: testFoodId,
          ...testMealRecord,
        },
      });
      createdMealId = mealRecord.id;
    });

    it('should delete meal record', async () => {
      // Check meal record exists
      const existingMeal = await prisma.mealRecord.findUnique({
        where: { id: createdMealId },
        include: {
          cat: { select: { name: true } },
          food: { select: { name: true } },
        },
      });

      expect(existingMeal).not.toBeNull();
      expect(existingMeal?.cat?.name).toBe('テスト猫1');
      expect(existingMeal?.food?.name).toBe('テストドライフード');

      // Delete meal record
      await prisma.mealRecord.delete({
        where: { id: createdMealId },
      });

      // Verify deletion
      const deletedMeal = await prisma.mealRecord.findUnique({
        where: { id: createdMealId },
      });

      expect(deletedMeal).toBeNull();
    });

    it('should not affect cat or food when deleting meal record', async () => {
      // Delete meal record
      await prisma.mealRecord.delete({
        where: { id: createdMealId },
      });

      // Verify cat still exists
      const cat = await prisma.cat.findUnique({
        where: { id: testCatId },
      });
      expect(cat).not.toBeNull();

      // Verify food still exists
      const food = await prisma.food.findUnique({
        where: { id: testFoodId },
      });
      expect(food).not.toBeNull();
    });
  });

  describe('Analytics Logic', () => {
    beforeEach(async () => {
      // Create multiple meal records for analytics testing
      const mealRecords = [
        {
          catId: testCatId,
          foodId: testFoodId, // DRY food
          quantity: 50,
          calories: 175,
          mealTime: new Date('2024-01-15T08:00:00Z'),
        },
        {
          catId: testCatId,
          foodId: testFood2Id, // WET food
          quantity: 80,
          calories: 96,
          mealTime: new Date('2024-01-15T18:00:00Z'),
        },
        {
          catId: testCat2Id,
          foodId: testFoodId, // DRY food
          quantity: 40,
          calories: 140,
          mealTime: new Date('2024-01-16T08:00:00Z'),
        },
      ];

      for (const meal of mealRecords) {
        await prisma.mealRecord.create({ data: meal });
      }
    });

    it('should get meal records for analytics', async () => {
      const startDate = new Date('2024-01-15T00:00:00Z');
      const endDate = new Date('2024-01-16T23:59:59Z');

      const mealRecords = await prisma.mealRecord.findMany({
        where: {
          mealTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy: { mealTime: 'asc' },
        include: {
          cat: { select: { id: true, name: true } },
          food: { select: { id: true, name: true, type: true, brand: true } },
        },
      });

      expect(mealRecords).toHaveLength(3);
      expect(mealRecords[0].food?.type).toBe('DRY');
      expect(mealRecords[1].food?.type).toBe('WET');
      expect(mealRecords[2].food?.type).toBe('DRY');
    });

    it('should calculate total calories and meal counts', async () => {
      const mealRecords = await prisma.mealRecord.findMany({
        where: { catId: testCatId },
      });

      const totalCalories = mealRecords.reduce(
        (sum, record) => sum + record.calories,
        0,
      );
      const totalMeals = mealRecords.length;
      const averageCaloriesPerMeal = totalCalories / totalMeals;

      expect(totalCalories).toBe(271); // 175 + 96
      expect(totalMeals).toBe(2);
      expect(averageCaloriesPerMeal).toBe(135.5);
    });

    it('should group meals by cat', async () => {
      const mealRecords = await prisma.mealRecord.findMany({
        where: {
          cat: {
            name: {
              startsWith: 'テスト',
            },
          },
        },
        include: {
          cat: { select: { id: true, name: true } },
        },
      });

      const catGroups = mealRecords.reduce((groups, record) => {
        const catId = record.catId;
        if (!groups[catId]) {
          groups[catId] = {
            cat: record.cat,
            totalCalories: 0,
            mealCount: 0,
          };
        }
        groups[catId].totalCalories += record.calories;
        groups[catId].mealCount += 1;
        return groups;
      }, {} as Record<string, unknown>);

      expect(Object.keys(catGroups)).toHaveLength(2);
      expect(catGroups[testCatId].totalCalories).toBe(271);
      expect(catGroups[testCatId].mealCount).toBe(2);
      expect(catGroups[testCat2Id].totalCalories).toBe(140);
      expect(catGroups[testCat2Id].mealCount).toBe(1);
    });

    it('should calculate food type breakdown', async () => {
      const mealRecords = await prisma.mealRecord.findMany({
        where: {
          cat: {
            name: {
              startsWith: 'テスト',
            },
          },
        },
        include: {
          food: { select: { type: true } },
        },
      });

      const totalCalories = mealRecords.reduce(
        (sum, record) => sum + record.calories,
        0,
      );

      const dryCalories = mealRecords
        .filter(record => record.food?.type === 'DRY')
        .reduce((sum, record) => sum + record.calories, 0);

      const wetCalories = mealRecords
        .filter(record => record.food?.type === 'WET')
        .reduce((sum, record) => sum + record.calories, 0);

      expect(totalCalories).toBe(411); // 175 + 96 + 140
      expect(dryCalories).toBe(315); // 175 + 140
      expect(wetCalories).toBe(96);

      const dryPercentage = Math.round((dryCalories / totalCalories) * 100);
      const wetPercentage = Math.round((wetCalories / totalCalories) * 100);

      expect(dryPercentage).toBe(77); // 315/411 ≈ 77%
      expect(wetPercentage).toBe(23); // 96/411 ≈ 23%
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject meal record with quantity too high', () => {
      const heavyMeal = {
        catId: testCatId,
        foodId: testFoodId,
        quantity: 1001, // Exceeds 1000g limit
        mealTime: new Date(),
      };

      const result = MealRecordInputSchema.safeParse(heavyMeal);
      expect(result.success).toBe(false);
    });

    it('should reject meal record with calories too high', () => {
      const highCalorieMeal = {
        catId: testCatId,
        foodId: testFoodId,
        quantity: 50,
        calories: 5001, // Exceeds 5000 calorie limit
        mealTime: new Date(),
      };

      const result = MealRecordInputSchema.safeParse(highCalorieMeal);
      expect(result.success).toBe(false);
    });

    it('should reject meal record with notes too long', () => {
      const longNotesMeal = {
        catId: testCatId,
        foodId: testFoodId,
        quantity: 50,
        mealTime: new Date(),
        notes: 'a'.repeat(501), // Exceeds 500 character limit
      };

      const result = MealRecordInputSchema.safeParse(longNotesMeal);
      expect(result.success).toBe(false);
    });

    it('should accept meal record with minimal data', () => {
      const minimalMeal = {
        catId: testCatId,
        foodId: testFoodId,
        quantity: 50,
        mealTime: new Date(),
      };

      const result = MealRecordInputSchema.safeParse(minimalMeal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.catId).toBe(testCatId);
        expect(result.data.foodId).toBe(testFoodId);
        expect(result.data.quantity).toBe(50);
        expect(result.data.calories).toBeUndefined();
        expect(result.data.notes).toBeUndefined();
      }
    });

    it('should handle calorie calculation edge cases', () => {
      // Test with zero calories per gram
      const zeroCalorieResult = calculateCaloriesFromGrams(50, 0);
      expect(zeroCalorieResult).toBe(0);

      // Test with very small amounts
      const smallAmountResult = calculateCaloriesFromGrams(0.1, 3.5);
      expect(smallAmountResult).toBe(0.35);

      // Test rounding
      const roundingResult = calculateCaloriesFromGrams(33.33, 3.333);
      expect(roundingResult).toBe(111.09); // Should be rounded to 2 decimal places
    });
  });
});
