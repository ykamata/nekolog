import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // クエリパラメータを取得
    const query = getQuery(event);
    const hospitalId = query.hospitalId as string | undefined;
    const searchQuery = query.name as string | undefined;
    const page = Math.max(1, parseInt(query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit as string) || 20));
    const offset = (page - 1) * limit;

    // 検索条件を構築
    const whereCondition: any = {
      userId: user.userId,
    };

    if (hospitalId?.trim()) {
      const parsedHospitalId = parseInt(hospitalId.trim());
      if (!isNaN(parsedHospitalId)) {
        whereCondition.hospitalId = parsedHospitalId;
      }
    }

    if (searchQuery?.trim()) {
      const searchTerm = searchQuery.trim();
      whereCondition.OR = [
        { name: { contains: searchTerm } },
        { specialty: { contains: searchTerm } },
      ];
    }

    // 総件数を取得
    const total = await prisma.veterinaryDoctor.count({
      where: whereCondition,
    });

    // 先生一覧を取得（ページネーション対応）
    const doctors = await prisma.veterinaryDoctor.findMany({
      where: whereCondition,
      orderBy: {
        name: 'asc',
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        memo: true,
        hospitalId: true,
        createdAt: true,
        updatedAt: true,
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      skip: offset,
      take: limit,
    });

    return {
      doctors,
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

    console.error('Failed to fetch veterinary doctors:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '先生一覧の取得に失敗しました',
    });
  }
});
