import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { FoodUpdateSchema } from '~/lib/validations/cat-meal';

const paramsSchema = z.object({
  id: z.string().cuid('有効なフードIDを指定してください'),
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
    const updateData = FoodUpdateSchema.parse(body);

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

    // Update food
    const food = await prisma.food.update({
      where: { id },
      data: updateData,
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
