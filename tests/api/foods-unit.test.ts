import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { FoodInputSchema, FoodUpdateSchema } from '~/lib/validations/cat-meal';
import type { FoodType } from '~/types/cat-meal';

describe('Food Management API Logic', () => {
  // Test data
  const testFood = {
    name: 'テストドライフード',
    type: 'DRY' as FoodType,
    brand: 'テストブランド',
    caloriesPerGram: 3.5,
    pricePerUnit: 1200,
    unit: 'g',
  };

  const testFood2 = {
    name: 'テストウェットフード',
    type: 'WET' as FoodType,
    brand: 'テストブランド2',
    caloriesPerGram: 1.2,
    pricePerUnit: 150,
    unit: 'g',
  };

  const testFoodMinimal = {
    name: 'ミニマルフード',
    type: 'DRY' as FoodType,
    caloriesPerGram: 4.0,
  };

  let createdFoodId: number;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.mealRecord.deleteMany({
      where: {
        food: {
          name: {
            startsWith: 'テスト',
          },
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
    await prisma.food.deleteMany({
      where: {
        name: {
          startsWith: 'ミニマル',
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.mealRecord.deleteMany({
      where: {
        food: {
          name: {
            startsWith: 'テスト',
          },
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
    await prisma.food.deleteMany({
      where: {
        name: {
          startsWith: 'ミニマル',
        },
      },
    });
  });

  describe('Food Creation Logic', () => {
    it('should validate food input schema with valid data', () => {
      const result = FoodInputSchema.safeParse(testFood);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testFood.name);
        expect(result.data.type).toBe(testFood.type);
        expect(result.data.brand).toBe(testFood.brand);
        expect(result.data.caloriesPerGram).toBe(testFood.caloriesPerGram);
        expect(result.data.pricePerUnit).toBe(testFood.pricePerUnit);
        expect(result.data.unit).toBe(testFood.unit);
      }
    });

    it('should validate food input schema with minimal data', () => {
      const result = FoodInputSchema.safeParse(testFoodMinimal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testFoodMinimal.name);
        expect(result.data.type).toBe(testFoodMinimal.type);
        expect(result.data.caloriesPerGram).toBe(
          testFoodMinimal.caloriesPerGram,
        );
        expect(result.data.brand).toBeUndefined();
        expect(result.data.pricePerUnit).toBeUndefined();
      }
    });

    it('should reject invalid food input data', () => {
      const invalidFood = {
        name: '', // Empty name
        type: 'INVALID', // Invalid type
        caloriesPerGram: -1, // Negative calories
        pricePerUnit: -100, // Negative price
      };

      const result = FoodInputSchema.safeParse(invalidFood);
      expect(result.success).toBe(false);
    });

    it('should create food in database', async () => {
      const validatedData = FoodInputSchema.parse(testFood);

      const food = await prisma.food.create({
        data: validatedData,
        select: {
          id: true,
          name: true,
          type: true,
          brand: true,
          caloriesPerGram: true,
          pricePerUnit: true,
          unit: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(food.name).toBe(testFood.name);
      expect(food.type).toBe(testFood.type);
      expect(food.brand).toBe(testFood.brand);
      expect(food.caloriesPerGram).toBe(testFood.caloriesPerGram);
      expect(food.pricePerUnit).toBe(testFood.pricePerUnit);
      expect(food.unit).toBe(testFood.unit);
      expect(food.id).toBeDefined();
      expect(food.createdAt).toBeDefined();
      expect(food.updatedAt).toBeDefined();

      createdFoodId = food.id;
    });

    it('should handle duplicate name/brand validation', async () => {
      // Create first food
      const food1 = await prisma.food.create({
        data: FoodInputSchema.parse(testFood),
      });

      // Check for existing food with same name and brand
      const existingFood = await prisma.food.findFirst({
        where: {
          name: testFood.name,
          brand: testFood.brand,
        },
      });

      expect(existingFood).not.toBeNull();
      expect(existingFood?.name).toBe(testFood.name);
      expect(existingFood?.brand).toBe(testFood.brand);

      createdFoodId = food1.id;
    });

    it('should allow same name with different brand', async () => {
      // Create first food
      const food1 = await prisma.food.create({
        data: FoodInputSchema.parse(testFood),
      });

      // Create food with same name but different brand
      const differentBrandFood = {
        ...testFood,
        brand: '異なるブランド',
      };

      const food2 = await prisma.food.create({
        data: FoodInputSchema.parse(differentBrandFood),
      });

      expect(food1.name).toBe(food2.name);
      expect(food1.brand).not.toBe(food2.brand);

      // Clean up
      await prisma.food.delete({ where: { id: food2.id } });
      createdFoodId = food1.id;
    });
  });

  describe('Food Reading Logic', () => {
    beforeEach(async () => {
      const food = await prisma.food.create({
        data: FoodInputSchema.parse(testFood),
      });
      createdFoodId = food.id;
    });

    it('should find food by ID', async () => {
      const food = await prisma.food.findUnique({
        where: { id: createdFoodId },
        select: {
          id: true,
          name: true,
          type: true,
          brand: true,
          caloriesPerGram: true,
          pricePerUnit: true,
          unit: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              meals: true,
            },
          },
        },
      });

      expect(food).not.toBeNull();
      expect(food?.id).toBe(createdFoodId);
      expect(food?.name).toBe(testFood.name);
      expect(food?.type).toBe(testFood.type);
      expect(food?._count.meals).toBe(0);
    });

    it('should list foods with filtering by type', async () => {
      // Create second food with different type
      await prisma.food.create({
        data: FoodInputSchema.parse(testFood2),
      });

      // Get only DRY foods
      const dryFoods = await prisma.food.findMany({
        where: {
          type: 'DRY',
          name: {
            startsWith: 'テスト',
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      expect(dryFoods).toHaveLength(1);
      expect(dryFoods[0].type).toBe('DRY');
      expect(dryFoods[0].name).toBe(testFood.name);
    });

    it('should list foods with filtering by brand', async () => {
      // Create second food
      await prisma.food.create({
        data: FoodInputSchema.parse(testFood2),
      });

      // Get foods by brand
      const brandFoods = await prisma.food.findMany({
        where: {
          brand: {
            contains: 'テストブランド',
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      expect(brandFoods.length).toBeGreaterThanOrEqual(1);
      expect(
        brandFoods.every(food => food.brand?.includes('テストブランド')),
      ).toBe(true);
    });

    it('should list foods with filtering by name', async () => {
      // Create second food
      await prisma.food.create({
        data: FoodInputSchema.parse(testFood2),
      });

      // Get foods by name
      const nameFoods = await prisma.food.findMany({
        where: {
          name: {
            contains: 'ドライ',
          },
        },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });

      expect(nameFoods).toHaveLength(1);
      expect(nameFoods[0].name).toContain('ドライ');
    });

    it('should support pagination', async () => {
      // Create second food
      await prisma.food.create({
        data: FoodInputSchema.parse(testFood2),
      });

      const [foods, total] = await Promise.all([
        prisma.food.findMany({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
          orderBy: [{ type: 'asc' }, { name: 'asc' }],
          take: 1,
          skip: 0,
        }),
        prisma.food.count({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
        }),
      ]);

      expect(foods).toHaveLength(1);
      expect(total).toBe(2);
    });
  });

  describe('Food Update Logic', () => {
    beforeEach(async () => {
      const food = await prisma.food.create({
        data: FoodInputSchema.parse(testFood),
      });
      createdFoodId = food.id;
    });

    it('should validate food update schema', () => {
      const updateData = {
        name: '更新されたフード',
        caloriesPerGram: 4.0,
        pricePerUnit: 1500,
      };

      const result = FoodUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(updateData.name);
        expect(result.data.caloriesPerGram).toBe(updateData.caloriesPerGram);
        expect(result.data.pricePerUnit).toBe(updateData.pricePerUnit);
      }
    });

    it('should update food in database', async () => {
      const updateData = {
        name: '更新されたフード',
        caloriesPerGram: 4.0,
        pricePerUnit: 1500,
      };

      const validatedData = FoodUpdateSchema.parse(updateData);

      const updatedFood = await prisma.food.update({
        where: { id: createdFoodId },
        data: validatedData,
        select: {
          id: true,
          name: true,
          type: true,
          brand: true,
          caloriesPerGram: true,
          pricePerUnit: true,
          unit: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(updatedFood.name).toBe(updateData.name);
      expect(updatedFood.caloriesPerGram).toBe(updateData.caloriesPerGram);
      expect(updatedFood.pricePerUnit).toBe(updateData.pricePerUnit);
      expect(updatedFood.type).toBe(testFood.type); // Should remain unchanged
      expect(updatedFood.brand).toBe(testFood.brand); // Should remain unchanged
    });

    it('should handle partial updates', async () => {
      const updateData = { pricePerUnit: 1800 };

      const validatedData = FoodUpdateSchema.parse(updateData);

      const updatedFood = await prisma.food.update({
        where: { id: createdFoodId },
        data: validatedData,
      });

      expect(updatedFood.name).toBe(testFood.name); // Should remain unchanged
      expect(updatedFood.pricePerUnit).toBe(updateData.pricePerUnit);
      expect(updatedFood.caloriesPerGram).toBe(testFood.caloriesPerGram); // Should remain unchanged
    });

    it('should handle name/brand conflict validation', async () => {
      // Create second food
      const food2 = await prisma.food.create({
        data: FoodInputSchema.parse(testFood2),
      });

      // Check for name/brand conflict
      const nameConflict = await prisma.food.findFirst({
        where: {
          name: testFood2.name,
          brand: testFood2.brand,
          id: { not: createdFoodId },
        },
      });

      expect(nameConflict).not.toBeNull();
      expect(nameConflict?.name).toBe(testFood2.name);
      expect(nameConflict?.brand).toBe(testFood2.brand);

      // Clean up
      await prisma.food.delete({ where: { id: food2.id } });
    });

    it('should allow updating to null brand', async () => {
      const updateData = { brand: null };

      const validatedData = FoodUpdateSchema.parse(updateData);

      const updatedFood = await prisma.food.update({
        where: { id: createdFoodId },
        data: validatedData,
      });

      expect(updatedFood.brand).toBeNull();
      expect(updatedFood.name).toBe(testFood.name); // Should remain unchanged
    });
  });

  describe('Food Deletion Logic', () => {
    beforeEach(async () => {
      const food = await prisma.food.create({
        data: FoodInputSchema.parse(testFood),
      });
      createdFoodId = food.id;
    });

    it('should delete food without related meals', async () => {
      // Check food exists
      const existingFood = await prisma.food.findUnique({
        where: { id: createdFoodId },
        include: {
          _count: {
            select: {
              meals: true,
            },
          },
        },
      });

      expect(existingFood).not.toBeNull();
      expect(existingFood?._count.meals).toBe(0);

      // Delete food
      await prisma.food.delete({
        where: { id: createdFoodId },
      });

      // Verify deletion
      const deletedFood = await prisma.food.findUnique({
        where: { id: createdFoodId },
      });

      expect(deletedFood).toBeNull();
    });

    it('should check for related meals before deletion', async () => {
      // Create a cat first (needed for meal record)
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
        },
      });

      // Create a meal record for the food
      await prisma.mealRecord.create({
        data: {
          catId: cat.id,
          foodId: createdFoodId,
          quantity: 50,
          calories: 175,
          mealTime: new Date(),
        },
      });

      // Check for related meals
      const foodWithMeals = await prisma.food.findUnique({
        where: { id: createdFoodId },
        include: {
          _count: {
            select: {
              meals: true,
            },
          },
        },
      });

      expect(foodWithMeals?._count.meals).toBe(1);

      // Clean up
      await prisma.mealRecord.deleteMany({
        where: { foodId: createdFoodId },
      });
      await prisma.cat.delete({ where: { id: cat.id } });
    });

    it('should prevent deletion of food with related meals', async () => {
      // Create a cat first (needed for meal record)
      const cat = await prisma.cat.create({
        data: {
          name: 'テスト猫',
        },
      });

      // Create a meal record for the food
      const meal = await prisma.mealRecord.create({
        data: {
          catId: cat.id,
          foodId: createdFoodId,
          quantity: 50,
          calories: 175,
          mealTime: new Date(),
        },
      });

      // Try to delete food (should fail due to foreign key constraint)
      await expect(
        prisma.food.delete({
          where: { id: createdFoodId },
        }),
      ).rejects.toThrow();

      // Verify food still exists
      const existingFood = await prisma.food.findUnique({
        where: { id: createdFoodId },
      });
      expect(existingFood).not.toBeNull();

      // Clean up
      await prisma.mealRecord.delete({ where: { id: meal.id } });
      await prisma.cat.delete({ where: { id: cat.id } });
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject food with name too long', () => {
      const longNameFood = {
        name: 'a'.repeat(101), // Exceeds 100 character limit
        type: 'DRY' as FoodType,
        caloriesPerGram: 3.5,
      };

      const result = FoodInputSchema.safeParse(longNameFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with brand too long', () => {
      const longBrandFood = {
        name: 'テストフード',
        type: 'DRY' as FoodType,
        brand: 'a'.repeat(51), // Exceeds 50 character limit
        caloriesPerGram: 3.5,
      };

      const result = FoodInputSchema.safeParse(longBrandFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with negative calories', () => {
      const negativeCaloriesFood = {
        name: '負カロリーフード',
        type: 'DRY' as FoodType,
        caloriesPerGram: -1,
      };

      const result = FoodInputSchema.safeParse(negativeCaloriesFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with calories too high', () => {
      const highCaloriesFood = {
        name: '高カロリーフード',
        type: 'DRY' as FoodType,
        caloriesPerGram: 15, // Exceeds 10 limit
      };

      const result = FoodInputSchema.safeParse(highCaloriesFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with negative price', () => {
      const negativePriceFood = {
        name: '負価格フード',
        type: 'DRY' as FoodType,
        caloriesPerGram: 3.5,
        pricePerUnit: -100,
      };

      const result = FoodInputSchema.safeParse(negativePriceFood);
      expect(result.success).toBe(false);
    });

    it('should reject food with invalid type', () => {
      const invalidTypeFood = {
        name: '無効タイプフード',
        type: 'INVALID',
        caloriesPerGram: 3.5,
      };

      const result = FoodInputSchema.safeParse(invalidTypeFood);
      expect(result.success).toBe(false);
    });

    it('should accept food with minimal required data', () => {
      const minimalFood = {
        name: 'ミニマルフード',
        type: 'WET' as FoodType,
        caloriesPerGram: 2.0,
      };

      const result = FoodInputSchema.safeParse(minimalFood);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(minimalFood.name);
        expect(result.data.type).toBe(minimalFood.type);
        expect(result.data.caloriesPerGram).toBe(minimalFood.caloriesPerGram);
        expect(result.data.brand).toBeUndefined();
        expect(result.data.pricePerUnit).toBeUndefined();
      }
    });

    it('should default unit to \'g\' when not provided', () => {
      const foodWithoutUnit = {
        name: '単位なしフード',
        type: 'DRY' as FoodType,
        caloriesPerGram: 3.5,
      };

      const result = FoodInputSchema.safeParse(foodWithoutUnit);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.unit).toBe('g');
      }
    });
  });

  describe('Calorie Calculation Logic', () => {
    it('should calculate calories correctly', () => {
      const quantity = 100; // grams
      const caloriesPerGram = 3.5;
      const expectedCalories = quantity * caloriesPerGram;

      expect(expectedCalories).toBe(350);
    });

    it('should handle decimal quantities', () => {
      const quantity = 75.5; // grams
      const caloriesPerGram = 4.2;
      const expectedCalories = quantity * caloriesPerGram;

      expect(expectedCalories).toBe(317.1);
    });

    it('should handle different food types with different calorie densities', () => {
      const dryFoodCalories = 100 * 4.0; // Dry food typically higher calories
      const wetFoodCalories = 100 * 1.5; // Wet food typically lower calories

      expect(dryFoodCalories).toBe(400);
      expect(wetFoodCalories).toBe(150);
      expect(dryFoodCalories).toBeGreaterThan(wetFoodCalories);
    });
  });

  describe('Price Management Logic', () => {
    it('should calculate cost per serving', () => {
      const pricePerUnit = 1200; // yen per package
      const packageWeight = 2000; // grams
      const servingSize = 50; // grams

      const pricePerGram = pricePerUnit / packageWeight;
      const costPerServing = pricePerGram * servingSize;

      expect(pricePerGram).toBe(0.6);
      expect(costPerServing).toBe(30);
    });

    it('should handle optional price field', () => {
      const foodWithoutPrice = {
        name: '価格なしフード',
        type: 'DRY' as FoodType,
        caloriesPerGram: 3.5,
        pricePerUnit: undefined,
      };

      const result = FoodInputSchema.safeParse(foodWithoutPrice);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.pricePerUnit).toBeUndefined();
      }
    });
  });
});
