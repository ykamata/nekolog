import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MealRecordInputSchema } from '~/lib/validations/cat-meal';
import { calculateCaloriesFromGrams, toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const mealData = MealRecordInputSchema.parse(requestData);

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

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    // new Date()はUTCを返すため、JST時刻を明示的に計算
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Create new meal record
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const mealRecord = await prisma.mealRecord.create({
      data: {
        ...mealData,
        calories,
        createdAt: nowJST,
        updatedAt: nowJST,
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            createdAt: true,
            updatedAt: true,
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
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseRecord = {
      ...mealRecord,
      mealTime: toLocalISOString(mealRecord.mealTime),
      createdAt: toLocalISOString(mealRecord.createdAt),
      updatedAt: toLocalISOString(mealRecord.updatedAt),
      cat: mealRecord.cat
        ? {
            ...mealRecord.cat,
            createdAt: toLocalISOString(mealRecord.cat.createdAt),
            updatedAt: toLocalISOString(mealRecord.cat.updatedAt),
          }
        : undefined,
      food: mealRecord.food
        ? {
            ...mealRecord.food,
            createdAt: toLocalISOString(mealRecord.food.createdAt),
            updatedAt: toLocalISOString(mealRecord.food.updatedAt),
          }
        : undefined,
    };

    return {
      mealRecord: responseRecord,
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
