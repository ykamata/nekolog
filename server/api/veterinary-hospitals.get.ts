import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // クエリパラメータを取得
    const query = getQuery(event);
    const searchQuery = query.query as string | undefined;
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // 検索条件を構築
    const whereCondition: any = {
      userId: user.userId,
    };

    if (searchQuery?.trim()) {
      const searchTerm = searchQuery.trim();
      whereCondition.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { address: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm } },
      ];
    }

    // 総件数を取得
    const total = await prisma.veterinaryHospital.count({
      where: whereCondition,
    });

    // 病院一覧を取得（ページネーション対応）
    const hospitals = await prisma.veterinaryHospital.findMany({
      where: whereCondition,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        memo: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            doctors: true,
          },
        },
      },
      skip: offset,
      take: limit,
    });

    return {
      hospitals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
  catch (error) {
    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Failed to fetch veterinary hospitals:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '病院一覧の取得に失敗しました',
    });
  }
});
