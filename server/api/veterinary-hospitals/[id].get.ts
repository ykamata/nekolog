import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';
import { veterinaryIdSchema } from '~/lib/validations/veterinary-master';

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = veterinaryIdSchema.parse(params);

    // Get hospital by ID (only if owned by user)
    const hospital = await prisma.veterinaryHospital.findFirst({
      where: {
        id,
        userId: user.userId, // ユーザーが作成した病院のみ取得
      },
      include: {
        doctors: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            visits: true,
            appointments: true,
            doctors: true,
          },
        },
      },
    });

    if (!hospital) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された病院が見つかりません',
      });
    }

    return hospital;
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'パラメータが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Error fetching veterinary hospital:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '病院の取得に失敗しました',
    });
  }
});
