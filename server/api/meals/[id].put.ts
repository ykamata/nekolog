import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MealRecordUpdateSchema } from '~/lib/validations/cat-meal';
import { calculateCaloriesFromGrams } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.string().cuid('Invalid meal record ID format'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow PUT method
    assertMethod(event, 'PUT');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse and validate request body
    const body = await readBody(event);
    const updateData = MealRecordUpdateSchema.parse(body);

    // Check if meal record exists
    const existingMealRecord = await prisma.mealRecord.findUnique({
      where: { id },
      include: {
        food: {
          select: {
            caloriesPerGram: true,
          },
        },
      },
    });

    if (!existingMealRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された食事記録が見つかりません',
      });
    }

    // If catId is being updated, verify the cat exists
    if (updateData.catId) {
      const cat = await prisma.cat.findUnique({
        where: { id: updateData.catId },
        select: { id: true },
      });

      if (!cat) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された猫が見つかりません',
        });
      }
    }

    // If foodId is being updated, verify the food exists and get calorie info
    let food = existingMealRecord.food;
    if (updateData.foodId) {
      const newFood = await prisma.food.findUnique({
        where: { id: updateData.foodId },
        select: {
          id: true,
          caloriesPerGram: true,
        },
      });

      if (!newFood) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定されたフードが見つかりません',
        });
      }
      food = newFood;
    }

    // Recalculate calories if quantity or food changed and calories not explicitly provided
    let calories = updateData.calories;
    if (!calories && (updateData.quantity !== undefined || updateData.foodId)) {
      const quantity = updateData.quantity ?? existingMealRecord.quantity;
      calories = calculateCaloriesFromGrams(quantity, food.caloriesPerGram);
    }

    // Update meal record
    const mealRecord = await prisma.mealRecord.update({
      where: { id },
      data: {
        ...updateData,
        ...(calories !== undefined && { calories }),
      },
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

    return {
      mealRecord,
      message: '食事記録が正常に更新されました',
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '入力データが無効です',
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
