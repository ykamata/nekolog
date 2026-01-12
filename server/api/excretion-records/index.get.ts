import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { ExcretionRecordFilterSchema } from '~/lib/validations/excretion';
import { performanceMonitor } from '~/utils/performance-monitor';
import { toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow GET method
    assertMethod(event, 'GET');

    // Parse and validate query parameters
    const query = getQuery(event);
    const { catId, type, startDate, endDate, limit, offset } = ExcretionRecordFilterSchema.parse(query);

    // Build where clause
    const where: Record<string, any> = {};

    if (catId) {
      where.catId = catId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) {
        where.recordedAt.gte = startDate;
      }
      if (endDate) {
        where.recordedAt.lte = endDate;
      }
    }

    // Get excretion records with optional filtering (with performance monitoring)
    const [excretionRecords, total] = await performanceMonitor.measure(
      'excretion-records-query',
      () => Promise.all([
        prisma.excretionRecord.findMany({
          where,
          orderBy: { recordedAt: 'desc' },
          take: limit,
          skip: offset,
          select: {
            id: true,
            catId: true,
            type: true,
            recordedAt: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
            cat: {
              select: {
                id: true,
                name: true,
                photoUrl: true,
                createdAt: true,
                updatedAt: true,
              },
            },
          },
        }),
        // Use count with same where clause for consistency
        prisma.excretionRecord.count({ where }),
      ]),
      {
        filters: { catId, type, hasDateRange: !!(startDate || endDate) },
        limit,
        offset,
      },
    );

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const convertedRecords = excretionRecords.map(record => ({
      ...record,
      recordedAt: toLocalISOString(record.recordedAt),
      createdAt: toLocalISOString(record.createdAt),
      updatedAt: toLocalISOString(record.updatedAt),
      cat: record.cat ? {
        ...record.cat,
        createdAt: toLocalISOString(record.cat.createdAt),
        updatedAt: toLocalISOString(record.cat.updatedAt),
      } : undefined,
    }));

    // Add response caching headers for better performance
    setHeader(event, 'Cache-Control', 'public, max-age=60, s-maxage=120');

    return {
      records: convertedRecords,
      total,
      page: Math.floor((offset || 0) / (limit || 20)) + 1,
      limit: limit || 20,
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
