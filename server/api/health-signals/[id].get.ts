import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { healthSignalIdSchema } from '~/lib/validations/health-signal';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * Get a specific health signal by ID
 * GET /api/health-signals/:id
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'GET');

    const params = getRouterParams(event);
    const validated = healthSignalIdSchema.parse(params);

    const healthSignal = await prisma.catHealthSignal.findUnique({
      where: { id: validated.id },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!healthSignal) {
      throw createError({
        statusCode: 404,
        statusMessage: 'ヘルスシグナルが見つかりません',
      });
    }

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseSignal = {
      ...healthSignal,
      date: toLocalISOString(healthSignal.date),
      createdAt: toLocalISOString(healthSignal.createdAt),
      updatedAt: toLocalISOString(healthSignal.updatedAt),
    };

    return responseSignal;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID parameter',
        data: error.errors,
      });
    }

    console.error('❌ ヘルスシグナル取得エラー:', error);
    throw error;
  }
});
