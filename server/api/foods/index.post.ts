import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { FoodInputSchema } from '~/lib/validations/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const foodData = FoodInputSchema.parse(body);

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

    // Create new food
    const food = await prisma.food.create({
      data: {
        ...foodData,
        unit: foodData.unit || 'g',
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

    return {
      food,
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
