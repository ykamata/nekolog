import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { CatUpdateSchema } from '~/lib/validations/cat-meal';

const paramsSchema = z.object({
  id: z.string().cuid('Invalid cat ID format'),
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
    const updateData = CatUpdateSchema.parse(body);

    // Check if cat exists
    const existingCat = await prisma.cat.findUnique({
      where: { id },
    });

    if (!existingCat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Check if name is being updated and if it conflicts with another cat
    if (updateData.name && updateData.name !== existingCat.name) {
      const nameConflict = await prisma.cat.findFirst({
        where: {
          name: updateData.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw createError({
          statusCode: 409,
          statusMessage: '同じ名前の猫が既に登録されています',
        });
      }
    }

    // Update cat
    const cat = await prisma.cat.update({
      where: { id },
      data: updateData,
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
      message: '猫の情報が正常に更新されました',
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
