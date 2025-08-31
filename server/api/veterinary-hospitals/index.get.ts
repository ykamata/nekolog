import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { veterinarySearchSchema } from '~/lib/validations/veterinary-master';

// クエリパラメータのスキーマ（文字列から適切な型に変換）
import { requireAuth } from '~/lib/auth-middleware';

const querySchema = z.object({
  name: z.string().optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().positive().max(100))
    .optional()
    .default('20'),
  offset: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(0))
    .optional()
    .default('0'),
});

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const parsedQuery = querySchema.parse(query);

    // Validate with the main filter schema
    const { query: name, limit, offset } = veterinarySearchSchema.parse({
      query: parsedQuery.name,
      limit: parsedQuery.limit,
      offset: parsedQuery.offset,
    });

    // Build where clause with user filter
    const where: Record<string, any> = {
      userId: user.userId, // ユーザーが作成した病院のみ取得
    };

    if (name) {
      where.name = {
        contains: name,
      };
    }

    // Get hospitals with related data counts
    const [hospitals, total] = await Promise.all([
      prisma.veterinaryHospital.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
        include: {
          _count: {
            select: {
              visits: true,
              appointments: true,
              doctors: true,
            },
          },
        },
      }),
      prisma.veterinaryHospital.count({ where }),
    ]);

    // Add caching headers
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600');

    return {
      hospitals,
      total,
      hasMore: offset + limit < total,
      pagination: {
        limit,
        offset,
        total,
      },
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'クエリパラメータが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    console.error('Error fetching veterinary hospitals:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '病院マスタの取得に失敗しました',
    });
  }
});
