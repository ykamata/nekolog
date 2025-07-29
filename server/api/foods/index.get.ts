import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const querySchema = z.object({
  name: z.string().optional(),
  type: z.enum(['DRY', 'WET']).optional(),
  brand: z.string().optional(),
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
    const { name, type, brand, limit, offset } = querySchema.parse(query);

    // Build where clause
    const where: Record<string, any> = {};
    if (name) {
      where.name = {
        contains: name,
      };
    }
    if (type) {
      where.type = type;
    }
    if (brand) {
      where.brand = {
        contains: brand,
      };
    }

    // Get foods with optional filtering
    const [foods, total] = await Promise.all([
      prisma.food.findMany({
        where,
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
        take: limit,
        skip: offset,
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
      }),
      prisma.food.count({ where }),
    ]);

    // Add caching headers for foods data (changes less frequently)
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600');

    return foods;
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
