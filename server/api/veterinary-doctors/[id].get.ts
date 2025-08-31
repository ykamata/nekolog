import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';
import { veterinaryIdSchema } from '~/lib/validations/veterinary-master';

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // パラメータを検証
    const { id } = await getValidatedRouterParams(event, veterinaryIdSchema);

    // 先生を取得（ユーザーが作成したもののみ）
    const doctor = await prisma.veterinaryDoctor.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!doctor) {
      throw createError({
        statusCode: 404,
        statusMessage: '先生が見つかりません',
      });
    }

    return doctor;
  }
  catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '無効なIDです',
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Failed to fetch veterinary doctor:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '先生の取得に失敗しました',
    });
  }
});
