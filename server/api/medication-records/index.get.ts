import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { parseLocalDateString, parseLocalDateStringEndOfDay, toLocalISOString } from '~/utils/cat-meal';

const querySchema = z
  .object({
    catId: z.string().optional(),
    medicationId: z.string().optional(),
    startDate: z
      .string()
      .transform(val => (val ? parseLocalDateString(val) : undefined))
      .optional(),
    endDate: z
      .string()
      .transform(val => (val ? parseLocalDateStringEndOfDay(val) : undefined))
      .optional(),
    status: z.string().optional(),
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
  })
  .refine(
    data =>
      !data.startDate || !data.endDate || data.endDate >= data.startDate,
    {
      message: '終了日は開始日以降の日付を設定してください',
      path: ['endDate'],
    },
  );

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { catId, medicationId, startDate, endDate, status, limit, offset }
      = querySchema.parse(query);

    // Build where clause
    const where: Record<string, unknown> = {};
    if (catId) {
      where.catId = catId;
    }
    if (medicationId) {
      where.medicationId = medicationId;
    }
    if (status) {
      where.status = status;
    }
    if (startDate || endDate) {
      where.administeredAt = {} as Record<string, Date>;
      if (startDate) {
        (where.administeredAt as Record<string, Date>).gte = startDate;
      }
      if (endDate) {
        // Include the entire end date by setting time to end of day
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        (where.administeredAt as Record<string, Date>).lte = endOfDay;
      }
    }

    // Get medication records with optional filtering
    const [records, total] = await Promise.all([
      prisma.medicationRecord.findMany({
        where,
        orderBy: { administeredAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          cat: {
            select: {
              id: true,
              name: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          medication: {
            select: {
              id: true,
              name: true,
              type: true,
              dosage: true,
              createdAt: true,
              updatedAt: true,
            },
          },
        },
      }),
      prisma.medicationRecord.count({ where }),
    ]);

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseRecords = records.map(record => ({
      ...record,
      administeredAt: toLocalISOString(record.administeredAt),
      createdAt: toLocalISOString(record.createdAt),
      updatedAt: toLocalISOString(record.updatedAt),
      cat: {
        ...record.cat,
        createdAt: toLocalISOString(record.cat.createdAt),
        updatedAt: toLocalISOString(record.cat.updatedAt),
      },
      medication: {
        ...record.medication,
        createdAt: toLocalISOString(record.medication.createdAt),
        updatedAt: toLocalISOString(record.medication.updatedAt),
      },
    }));

    // Add caching headers for medication records data
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=120');

    return {
      records: responseRecords,
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
