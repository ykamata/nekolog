import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { VeterinaryHospitalFilterSchema } from '~/lib/validations/veterinary-visit';

// クエリパラメータのスキーマ（文字列から適切な型に変換）
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
    const parsedQuery = querySchema.parse(query);

    // Validate with the main filter schema
    const { name, limit, offset } = VeterinaryHospitalFilterSchema.parse(parsedQuery);

    // Build where clause
    const where: Record<string, any> = {};

    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
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

    // Handle unexpected errors
    console.error('Error fetching veterinary hospitals:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '病院マスタの取得に失敗しました',
    });
  }
});
