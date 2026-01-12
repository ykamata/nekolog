import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { FoodUpdateSchema } from '~/lib/validations/cat-meal';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('有効なフードIDを指定してください'),
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

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const updateData = FoodUpdateSchema.parse(requestData);

    // Check if food exists
    const existingFood = await prisma.food.findUnique({
      where: { id },
    });

    if (!existingFood) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定されたフードが見つかりません',
      });
    }

    // Check for duplicate name/brand combination if name or brand is being updated
    if (updateData.name || updateData.brand !== undefined) {
      const nameToCheck = updateData.name || existingFood.name;
      const brandToCheck
        = updateData.brand !== undefined ? updateData.brand : existingFood.brand;

      const duplicateFood = await prisma.food.findFirst({
        where: {
          name: nameToCheck,
          brand: brandToCheck,
          id: { not: id },
        },
      });

      if (duplicateFood) {
        throw createError({
          statusCode: 409,
          statusMessage: '同じ名前とブランドのフードが既に登録されています',
        });
      }
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Update food
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const food = await prisma.food.update({
      where: { id },
      data: {
        ...updateData,
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
      message: 'フード情報が正常に更新されました',
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
