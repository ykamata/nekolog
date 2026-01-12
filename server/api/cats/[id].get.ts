import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('Invalid cat ID format'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Find cat by ID
    const cat = await prisma.cat.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        birthdate: true,
        weight: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            meals: true,
          },
        },
      },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseCat = {
      ...cat,
      birthdate: cat.birthdate ? toLocalISOString(cat.birthdate) : null,
      createdAt: toLocalISOString(cat.createdAt),
      updatedAt: toLocalISOString(cat.updatedAt),
    };

    return { cat: responseCat };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid cat ID',
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
