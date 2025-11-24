import { z } from 'zod';
import { prisma } from '~/lib/prisma';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('Invalid cat ID format'),
});

const querySchema = z.object({
  cascade: z
    .string()
    .optional()
    .transform(val => val === 'true'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow DELETE method
    assertMethod(event, 'DELETE');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse query parameters
    const query = getQuery(event);
    const { cascade } = querySchema.parse(query);

    // Check if cat exists
    const existingCat = await prisma.cat.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            meals: true,
          },
        },
      },
    });

    if (!existingCat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Check for related meal records
    if (existingCat._count.meals > 0 && !cascade) {
      throw createError({
        statusCode: 409,
        statusMessage:
          'この猫には食事記録が関連付けられています。削除するには cascade=true パラメータを指定してください。',
        data: {
          relatedMeals: existingCat._count.meals,
          requiresCascade: true,
        },
      });
    }

    // Delete cat (cascade will automatically delete related meals due to onDelete: Cascade in schema)
    await prisma.cat.delete({
      where: { id },
    });

    return {
      message: `猫「${existingCat.name}」が正常に削除されました`,
      deletedMeals: existingCat._count.meals,
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid parameters',
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
