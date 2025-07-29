import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.string().cuid('Invalid meal record ID format'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, 'DELETE');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Check if meal record exists
    const existingMealRecord = await prisma.mealRecord.findUnique({
      where: { id },
      select: {
        id: true,
        cat: {
          select: {
            name: true,
          },
        },
        food: {
          select: {
            name: true,
          },
        },
        mealTime: true,
      },
    });

    if (!existingMealRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された食事記録が見つかりません',
      });
    }

    // Delete meal record
    await prisma.mealRecord.delete({
      where: { id },
    });

    return {
      message: '食事記録が正常に削除されました',
      deletedRecord: {
        id: existingMealRecord.id,
        catName: existingMealRecord.cat.name,
        foodName: existingMealRecord.food.name,
        mealTime: existingMealRecord.mealTime,
      },
    };
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
