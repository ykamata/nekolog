import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MealRecordUpdateSchema } from '~/lib/validations/cat-meal';
import { calculateCaloriesFromGrams, toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('Invalid meal record ID format'),
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
    console.log('🔍 [PUT /api/meals/:id] Request body:', JSON.stringify(body, null, 2));

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    console.log('🔍 [PUT /api/meals/:id] After removing createdAt/updatedAt:', JSON.stringify(requestData, null, 2));

    const updateData = MealRecordUpdateSchema.parse(requestData);
    console.log('✅ [PUT /api/meals/:id] Validation passed');

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

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    // new Date()はUTCを返すため、JST時刻を明示的に計算
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Update meal record
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const mealRecord = await prisma.mealRecord.update({
      where: { id },
      data: {
        ...updateData,
        ...(calories !== undefined && { calories }),
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

    console.log('📤 [PUT /api/meals/:id] Response mealRecord dates (before conversion):', {
      mealTime: mealRecord.mealTime,
      createdAt: mealRecord.createdAt,
      updatedAt: mealRecord.updatedAt,
      mealTimeType: typeof mealRecord.mealTime,
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseRecord = {
      ...mealRecord,
      mealTime: toLocalISOString(mealRecord.mealTime),
      createdAt: toLocalISOString(mealRecord.createdAt),
      updatedAt: toLocalISOString(mealRecord.updatedAt),
      cat: mealRecord.cat ? {
        ...mealRecord.cat,
        createdAt: toLocalISOString(mealRecord.cat.createdAt),
        updatedAt: toLocalISOString(mealRecord.cat.updatedAt),
      } : undefined,
      food: mealRecord.food ? {
        ...mealRecord.food,
        createdAt: toLocalISOString(mealRecord.food.createdAt),
        updatedAt: toLocalISOString(mealRecord.food.updatedAt),
      } : undefined,
    };

    console.log('📤 [PUT /api/meals/:id] Response mealRecord dates (after conversion):', {
      mealTime: responseRecord.mealTime,
      createdAt: responseRecord.createdAt,
      updatedAt: responseRecord.updatedAt,
    });

    return {
      mealRecord: responseRecord,
      message: '食事記録が正常に更新されました',
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      console.error('❌ [PUT /api/meals/:id] Zod validation error:', JSON.stringify(error.errors, null, 2));
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
    console.error('❌ [PUT /api/meals/:id] Unexpected error:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
