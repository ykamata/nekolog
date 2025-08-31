import { z } from 'zod';
import { prisma } from '~/lib/prisma';

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
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { name, limit, offset } = querySchema.parse(query);

    // Build where clause
    const where: Record<string, any> = {};
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }

    // Get cats with optional filtering
    const [cats, total] = await Promise.all([
      prisma.cat.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
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
      }),
      prisma.cat.count({ where }),
    ]);

    // 開発時はキャッシュを短くし、no-cacheヘッダーがある場合は無効化
    const cacheControl = getHeader(event, 'cache-control');
    if (cacheControl?.includes('no-cache')) {
      setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate');
      setHeader(event, 'Pragma', 'no-cache');
      setHeader(event, 'Expires', '0');
    } else {
      // 通常時は短いキャッシュ（30秒）
      setHeader(event, 'Cache-Control', 'public, max-age=30, s-maxage=30');
    }

    console.log('🔍 API: 猫データ取得', { count: cats.length, total });
    return cats;
  }
  catch (error) {
    console.error('❌ API: 猫データ取得エラー', error);
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: error.errors,
      });
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
