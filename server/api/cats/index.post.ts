import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { CatInputSchema } from '~/lib/validations/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const catData = CatInputSchema.parse(body);

    // Check if cat with same name already exists
    const existingCat = await prisma.cat.findFirst({
      where: {
        name: catData.name,
      },
    });

    if (existingCat) {
      throw createError({
        statusCode: 409,
        statusMessage: '同じ名前の猫が既に登録されています',
      });
    }

    // Create new cat
    const cat = await prisma.cat.create({
      data: catData,
      select: {
        id: true,
        name: true,
        birthdate: true,
        weight: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      cat,
      message: '猫が正常に登録されました',
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
