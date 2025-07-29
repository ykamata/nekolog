import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.string().cuid('Invalid meal record ID format'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Find meal record by ID
    const mealRecord = await prisma.mealRecord.findUnique({
      where: { id },
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

    if (!mealRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された食事記録が見つかりません',
      });
    }

    return { mealRecord };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid meal record ID',
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
