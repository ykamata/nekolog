import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { FoodInputSchema } from '~/lib/validations/cat-meal';
import { toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const foodData = FoodInputSchema.parse(requestData);

    // Check if food with same name and brand already exists
    const existingFood = await prisma.food.findFirst({
      where: {
        name: foodData.name,
        brand: foodData.brand || null,
      },
    });

    if (existingFood) {
      throw createError({
        statusCode: 409,
        statusMessage: '同じ名前とブランドのフードが既に登録されています',
      });
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Create new food
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const food = await prisma.food.create({
      data: {
        ...foodData,
        unit: foodData.unit || 'g',
        createdAt: nowJST,
        updatedAt: nowJST,
      },
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
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseFood = {
      ...food,
      createdAt: toLocalISOString(food.createdAt),
      updatedAt: toLocalISOString(food.updatedAt),
    };

    return {
      food: responseFood,
      message: 'フードが正常に登録されました',
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
