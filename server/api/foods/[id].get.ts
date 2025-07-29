import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.string().cuid('有効なフードIDを指定してください'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Get food by ID
    const food = await prisma.food.findUnique({
      where: { id },
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

    if (!food) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定されたフードが見つかりません',
      });
    }

    return { food };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid food ID',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
