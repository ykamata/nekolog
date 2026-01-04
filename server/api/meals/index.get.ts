import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { parseLocalDateString, parseLocalDateStringEndOfDay } from '~/utils/cat-meal';

const querySchema = z.object({
  catId: z.coerce.number().positive().optional(),
  foodId: z.coerce.number().positive().optional(),
  startDate: z
    .string()
    .transform(str => parseLocalDateString(str))
    .pipe(z.date().nullable())
    .optional(),
  endDate: z
    .string()
    .transform(str => parseLocalDateStringEndOfDay(str))
    .pipe(z.date().nullable())
    .optional(),
  foodType: z.enum(['DRY', 'WET']).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional()
    .default('20'),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(0))
    .optional()
    .default('0'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { catId, foodId, startDate, endDate, foodType, limit, offset }
      = querySchema.parse(query);

    // Build where clause
    const where: Record<string, any> = {};

    if (catId) {
      where.catId = catId;
    }

    if (foodId) {
      where.foodId = foodId;
    }

    if (startDate || endDate) {
      where.mealTime = {};
      if (startDate) {
        where.mealTime.gte = startDate;
      }
      if (endDate) {
        where.mealTime.lte = endDate;
      }
    }

    if (foodType) {
      where.food = {
        type: foodType,
      };
    }

    // Get meal records with optional filtering and optimized queries
    const [mealRecords, total] = await Promise.all([
      prisma.mealRecord.findMany({
        where,
        orderBy: { mealTime: 'desc' },
        take: limit,
        skip: offset,
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
      }),
      // Use count with same where clause for consistency
      prisma.mealRecord.count({ where }),
    ]);

    // Add response caching headers for better performance
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=120');

    // フロントエンドが期待する形式でレスポンスを返す
    return {
      mealRecords,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
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
