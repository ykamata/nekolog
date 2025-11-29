import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { healthSignalQuerySchema } from '~/lib/validations/health-signal';

/**
 * Get health signals with optional filters
 * GET /api/health-signals?catId=1&startDate=2024-01-01&endDate=2024-01-31&color=GREEN
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'GET');

    const query = getQuery(event);
    const validated = healthSignalQuerySchema.parse(query);

    const { catId, startDate, endDate, color } = validated;

    const healthSignals = await prisma.catHealthSignal.findMany({
      where: {
        ...(catId && { catId }),
        ...(color && { color }),
        ...(startDate || endDate
          ? {
              date: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            }
          : {}),
      },
      orderBy: {
        date: 'desc',
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return healthSignals;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request parameters',
        data: error.errors,
      });
    }

    console.error('❌ ヘルスシグナル取得エラー:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
