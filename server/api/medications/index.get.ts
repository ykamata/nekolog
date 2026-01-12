import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { toLocalISOString } from '~/utils/cat-meal';

const querySchema = z.object({
  name: z.string().optional(),
  type: z.string().optional(),
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
    const { name, type, limit, offset } = querySchema.parse(query);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (name) {
      where.name = {
        contains: name,
        mode: 'insensitive',
      };
    }
    if (type) {
      where.type = type;
    }

    // Get medications with optional filtering
    const [medications, total] = await Promise.all([
      prisma.medication.findMany({
        where,
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          name: true,
          type: true,
          description: true,
          dosage: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              records: true,
              schedules: true,
            },
          },
        },
      }),
      prisma.medication.count({ where }),
    ]);

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseMedications = medications.map(medication => ({
      ...medication,
      createdAt: toLocalISOString(medication.createdAt),
      updatedAt: toLocalISOString(medication.updatedAt),
    }));

    // Add caching headers for medications data
    setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600');

    return {
      medications: responseMedications,
      total,
      limit,
      offset,
    };
  }
  catch (error) {
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
