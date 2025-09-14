import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';

const searchQuerySchema = z.object({
  query: z.string().min(1, '検索クエリは必須です'),
});

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // クエリパラメータを取得して検証
    const rawQuery = getQuery(event);
    const { query } = searchQuerySchema.parse(rawQuery);

    // 病院を検索（名前または住所での部分一致）
    const hospitals = await prisma.veterinaryHospital.findMany({
      where: {
        userId: user.userId,
        OR: [
          {
            name: {
              contains: query,
            },
          },
          {
            address: {
              contains: query,
            },
          },
        ],
      },
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        _count: {
          select: {
            doctors: true,
          },
        },
      },
    });

    return hospitals;
  }
  catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '検索クエリが無効です',
        data: {
          validationErrors: error.errors,
        },
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Failed to search veterinary hospitals:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '病院の検索に失敗しました',
    });
  }
});
