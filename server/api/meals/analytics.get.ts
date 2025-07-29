import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { generateMealAnalytics } from '~/utils/cat-meal';

const querySchema = z.object({
  catId: z.string().cuid().optional(),
  startDate: z
    .string()
    .transform(str => new Date(str))
    .pipe(z.date())
    .optional(),
  endDate: z
    .string()
    .transform(str => new Date(str))
    .pipe(z.date())
    .optional(),
  days: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(365))
    .optional()
    .default('30'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { catId, startDate, endDate, days } = querySchema.parse(query);

    // Build where clause
    const where: Record<string, any> = {};

    if (catId) {
      where.catId = catId;
    }

    // Set date range - either from parameters or last N days
    if (startDate || endDate) {
      where.mealTime = {};
      if (startDate) {
        where.mealTime.gte = startDate;
      }
      if (endDate) {
        where.mealTime.lte = endDate;
      }
    }
    else {
      // Default to last N days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days + 1);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      where.mealTime = {
        gte: startDate,
        lte: endDate,
      };
    }

    // Get meal records for analytics with optimized query
    const mealRecords = await prisma.mealRecord.findMany({
      where,
      orderBy: { mealTime: 'asc' },
      select: {
        id: true,
        catId: true,
        foodId: true,
        quantity: true,
        calories: true,
        mealTime: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
        food: {
          select: {
            id: true,
            name: true,
            type: true,
            brand: true,
          },
        },
      },
    });

    // Transform data for analytics utility
    const transformedRecords = mealRecords.map(record => ({
      id: record.id,
      catId: record.catId,
      foodId: record.foodId,
      quantity: record.quantity,
      calories: record.calories,
      mealTime: record.mealTime,
      notes: record.notes,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      cat: record.cat
        ? {
            id: record.cat.id,
            name: record.cat.name,
            birthdate: undefined,
            weight: undefined,
            photoUrl: undefined,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : undefined,
      food: record.food
        ? {
            id: record.food.id,
            name: record.food.name,
            type: record.food.type as 'DRY' | 'WET',
            brand: record.food.brand,
            caloriesPerGram: 0, // Not needed for analytics
            pricePerUnit: undefined,
            unit: 'g',
            createdAt: new Date(),
            updatedAt: new Date(),
          }
        : undefined,
    }));

    // Generate analytics
    const analytics = generateMealAnalytics(transformedRecords);

    // Get additional summary data
    const totalMeals = mealRecords.length;
    const totalCalories = mealRecords.reduce(
      (sum, record) => sum + record.calories,
      0,
    );
    const averageCaloriesPerMeal
      = totalMeals > 0 ? Math.round((totalCalories / totalMeals) * 100) / 100 : 0;

    // Get cat-specific data if no specific cat is requested
    let catBreakdown = undefined;
    if (!catId) {
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
      }, {} as Record<string, any>);

      catBreakdown = Object.values(catGroups).map((group: any) => ({
        catId: group.cat.id,
        catName: group.cat.name,
        totalCalories: Math.round(group.totalCalories * 100) / 100,
        mealCount: group.mealCount,
        averageCaloriesPerMeal:
          group.mealCount > 0
            ? Math.round((group.totalCalories / group.mealCount) * 100) / 100
            : 0,
      }));
    }

    // Add caching headers for analytics data
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600');

    return {
      analytics,
      summary: {
        totalMeals,
        totalCalories: Math.round(totalCalories * 100) / 100,
        averageCaloriesPerMeal,
        dateRange: {
          startDate: where.mealTime?.gte || startDate,
          endDate: where.mealTime?.lte || endDate,
        },
      },
      ...(catBreakdown && { catBreakdown }),
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: error.errors,
      });
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
