import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prisma } from '~/lib/prisma';
import { CatInputSchema, CatUpdateSchema } from '~/lib/validations/cat-meal';

describe('Cat Management API Logic', () => {
  // Test data
  const testCat = {
    name: 'テスト猫',
    birthdate: new Date('2020-01-01'),
    weight: 4.5,
    photoUrl: 'https://example.com/cat.jpg',
  };

  const testCat2 = {
    name: 'テスト猫2',
    birthdate: new Date('2021-06-15'),
    weight: 3.2,
  };

  let createdCatId: number;

  beforeEach(async () => {
    // Clean up any existing test data
    await prisma.mealRecord.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
  });

  afterEach(async () => {
    // Clean up test data
    await prisma.mealRecord.deleteMany({
      where: {
        cat: {
          name: {
            startsWith: 'テスト',
          },
        },
      },
    });
    await prisma.cat.deleteMany({
      where: {
        name: {
          startsWith: 'テスト',
        },
      },
    });
  });

  describe('Cat Creation Logic', () => {
    it('should validate cat input schema with valid data', () => {
      const result = CatInputSchema.safeParse(testCat);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(testCat.name);
        expect(result.data.weight).toBe(testCat.weight);
        expect(result.data.photoUrl).toBe(testCat.photoUrl);
      }
    });

    it('should reject invalid cat input data', () => {
      const invalidCat = {
        name: '', // Empty name
        weight: -1, // Negative weight
        photoUrl: 'invalid-url', // Invalid URL
      };

      const result = CatInputSchema.safeParse(invalidCat);
      expect(result.success).toBe(false);
    });

    it('should create cat in database', async () => {
      const validatedData = CatInputSchema.parse(testCat);

      const cat = await prisma.cat.create({
        data: validatedData,
        select: {
          id: true,
          name: true,
          birthdate: true,
          weight: true,
          photoUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(cat.name).toBe(testCat.name);
      expect(cat.weight).toBe(testCat.weight);
      expect(cat.photoUrl).toBe(testCat.photoUrl);
      expect(cat.id).toBeDefined();
      expect(cat.createdAt).toBeDefined();
      expect(cat.updatedAt).toBeDefined();

      createdCatId = cat.id;
    });

    it('should handle duplicate name validation', async () => {
      // Create first cat
      const cat1 = await prisma.cat.create({
        data: CatInputSchema.parse(testCat),
      });

      // Check for existing cat with same name
      const existingCat = await prisma.cat.findFirst({
        where: { name: testCat.name },
      });

      expect(existingCat).not.toBeNull();
      expect(existingCat?.name).toBe(testCat.name);

      createdCatId = cat1.id;
    });
  });

  describe('Cat Reading Logic', () => {
    beforeEach(async () => {
      const cat = await prisma.cat.create({
        data: CatInputSchema.parse(testCat),
      });
      createdCatId = cat.id;
    });

    it('should find cat by ID', async () => {
      const cat = await prisma.cat.findUnique({
        where: { id: createdCatId },
        select: {
          id: true,
          name: true,
          birthdate: true,
          weight: true,
          photoUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              meals: true,
            },
          },
        },
      });

      expect(cat).not.toBeNull();
      expect(cat?.id).toBe(createdCatId);
      expect(cat?.name).toBe(testCat.name);
      expect(cat?._count.meals).toBe(0);
    });

    it('should list cats with filtering', async () => {
      // Create second cat
      await prisma.cat.create({
        data: CatInputSchema.parse(testCat2),
      });

      // Get all test cats
      const cats = await prisma.cat.findMany({
        where: {
          name: {
            startsWith: 'テスト',
          },
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          birthdate: true,
          weight: true,
          photoUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              meals: true,
            },
          },
        },
      });

      expect(cats).toHaveLength(2);
      expect(cats[0].name).toBe('テスト猫');
      expect(cats[1].name).toBe('テスト猫2');
    });

    it('should support pagination', async () => {
      // Create second cat
      await prisma.cat.create({
        data: CatInputSchema.parse(testCat2),
      });

      const [cats, total] = await Promise.all([
        prisma.cat.findMany({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
          orderBy: { name: 'asc' },
          take: 1,
          skip: 0,
        }),
        prisma.cat.count({
          where: {
            name: {
              startsWith: 'テスト',
            },
          },
        }),
      ]);

      expect(cats).toHaveLength(1);
      expect(total).toBe(2);
      expect(cats[0].name).toBe('テスト猫');
    });
  });

  describe('Cat Update Logic', () => {
    beforeEach(async () => {
      const cat = await prisma.cat.create({
        data: CatInputSchema.parse(testCat),
      });
      createdCatId = cat.id;
    });

    it('should validate cat update schema', () => {
      const updateData = {
        name: '更新された猫',
        weight: 5.0,
      };

      const result = CatUpdateSchema.safeParse(updateData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(updateData.name);
        expect(result.data.weight).toBe(updateData.weight);
      }
    });

    it('should update cat in database', async () => {
      const updateData = {
        name: '更新された猫',
        weight: 5.0,
      };

      const validatedData = CatUpdateSchema.parse(updateData);

      const updatedCat = await prisma.cat.update({
        where: { id: createdCatId },
        data: validatedData,
        select: {
          id: true,
          name: true,
          birthdate: true,
          weight: true,
          photoUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      expect(updatedCat.name).toBe(updateData.name);
      expect(updatedCat.weight).toBe(updateData.weight);
      expect(updatedCat.photoUrl).toBe(testCat.photoUrl); // Should remain unchanged
    });

    it('should handle partial updates', async () => {
      const updateData = { weight: 4.8 };

      const validatedData = CatUpdateSchema.parse(updateData);

      const updatedCat = await prisma.cat.update({
        where: { id: createdCatId },
        data: validatedData,
      });

      expect(updatedCat.name).toBe(testCat.name); // Should remain unchanged
      expect(updatedCat.weight).toBe(updateData.weight);
    });

    it('should handle name conflict validation', async () => {
      // Create second cat
      await prisma.cat.create({
        data: CatInputSchema.parse(testCat2),
      });

      // Check for name conflict
      const nameConflict = await prisma.cat.findFirst({
        where: {
          name: testCat2.name,
          id: { not: createdCatId },
        },
      });

      expect(nameConflict).not.toBeNull();
      expect(nameConflict?.name).toBe(testCat2.name);
    });
  });

  describe('Cat Deletion Logic', () => {
    beforeEach(async () => {
      const cat = await prisma.cat.create({
        data: CatInputSchema.parse(testCat),
      });
      createdCatId = cat.id;
    });

    it('should delete cat without related meals', async () => {
      // Check cat exists
      const existingCat = await prisma.cat.findUnique({
        where: { id: createdCatId },
        include: {
          _count: {
            select: {
              meals: true,
            },
          },
        },
      });

      expect(existingCat).not.toBeNull();
      expect(existingCat?._count.meals).toBe(0);

      // Delete cat
      await prisma.cat.delete({
        where: { id: createdCatId },
      });

      // Verify deletion
      const deletedCat = await prisma.cat.findUnique({
        where: { id: createdCatId },
      });

      expect(deletedCat).toBeNull();
    });

    it('should check for related meals before deletion', async () => {
      // Create a food first (needed for meal record)
      const food = await prisma.food.create({
        data: {
          name: 'テストフード',
          type: 'DRY',
          caloriesPerGram: 3.5,
        },
      });

      // Create a meal record for the cat
      await prisma.mealRecord.create({
        data: {
          catId: createdCatId,
          foodId: food.id,
          quantity: 50,
          calories: 175,
          mealTime: new Date(),
        },
      });

      // Check for related meals
      const catWithMeals = await prisma.cat.findUnique({
        where: { id: createdCatId },
        include: {
          _count: {
            select: {
              meals: true,
            },
          },
        },
      });

      expect(catWithMeals?._count.meals).toBe(1);

      // Clean up
      await prisma.mealRecord.deleteMany({
        where: { catId: createdCatId },
      });
      await prisma.food.delete({ where: { id: food.id } });
    });

    it('should cascade delete related meals', async () => {
      // Create a food first (needed for meal record)
      const food = await prisma.food.create({
        data: {
          name: 'テストフード',
          type: 'DRY',
          caloriesPerGram: 3.5,
        },
      });

      // Create a meal record for the cat
      const meal = await prisma.mealRecord.create({
        data: {
          catId: createdCatId,
          foodId: food.id,
          quantity: 50,
          calories: 175,
          mealTime: new Date(),
        },
      });

      // Delete cat (should cascade delete meals due to schema configuration)
      await prisma.cat.delete({
        where: { id: createdCatId },
      });

      // Verify cat is deleted
      const deletedCat = await prisma.cat.findUnique({
        where: { id: createdCatId },
      });
      expect(deletedCat).toBeNull();

      // Verify meal is also deleted (cascade)
      const deletedMeal = await prisma.mealRecord.findUnique({
        where: { id: meal.id },
      });
      expect(deletedMeal).toBeNull();

      // Clean up food
      await prisma.food.delete({ where: { id: food.id } });
    });
  });

  describe('Validation Edge Cases', () => {
    it('should reject cat with name too long', () => {
      const longNameCat = {
        name: 'a'.repeat(51), // Exceeds 50 character limit
      };

      const result = CatInputSchema.safeParse(longNameCat);
      expect(result.success).toBe(false);
    });

    it('should reject cat with negative weight', () => {
      const negativeCat = {
        name: '負の重量猫',
        weight: -1,
      };

      const result = CatInputSchema.safeParse(negativeCat);
      expect(result.success).toBe(false);
    });

    it('should reject cat with weight too high', () => {
      const heavyCat = {
        name: '重い猫',
        weight: 25, // Exceeds 20kg limit
      };

      const result = CatInputSchema.safeParse(heavyCat);
      expect(result.success).toBe(false);
    });

    it('should reject cat with invalid URL', () => {
      const invalidUrlCat = {
        name: '無効URL猫',
        photoUrl: 'not-a-url',
      };

      const result = CatInputSchema.safeParse(invalidUrlCat);
      expect(result.success).toBe(false);
    });

    it('should accept cat with minimal data', () => {
      const minimalCat = { name: 'ミニマル猫' };

      const result = CatInputSchema.safeParse(minimalCat);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(minimalCat.name);
        expect(result.data.birthdate).toBeUndefined();
        expect(result.data.weight).toBeUndefined();
        expect(result.data.photoUrl).toBeUndefined();
      }
    });
  });
});
