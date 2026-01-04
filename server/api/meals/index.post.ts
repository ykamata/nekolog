import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MealRecordInputSchema } from '~/lib/validations/cat-meal';
import { calculateCaloriesFromGrams, toMySQLDateTime } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const mealData = MealRecordInputSchema.parse(body);

    // Verify that cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: mealData.catId },
      select: { id: true, name: true },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Verify that food exists and get calorie information
    const food = await prisma.food.findUnique({
      where: { id: mealData.foodId },
      select: {
        id: true,
        name: true,
        type: true,
        caloriesPerGram: true,
      },
    });

    if (!food) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定されたフードが見つかりません',
      });
    }

    // Calculate calories if not provided
    let calories = mealData.calories;
    if (!calories) {
      calories = calculateCaloriesFromGrams(
        mealData.quantity,
        food.caloriesPerGram,
      );
    }

    // Create new meal record
    // mealTimeをMySQL DATETIME文字列に変換してタイムゾーンを保持
    const mealRecord = await prisma.mealRecord.create({
      data: {
        ...mealData,
        mealTime: toMySQLDateTime(mealData.mealTime) as any,
        calories,
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
      message: '食事記録が正常に登録されました',
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
