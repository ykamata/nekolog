import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { healthSignalIdSchema, updateCatHealthSignalSchema } from '~/lib/validations/health-signal';

/**
 * Update a health signal
 * PUT /api/health-signals/:id
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'PUT');

    const params = getRouterParams(event);
    const validatedParams = healthSignalIdSchema.parse(params);

    const body = await readBody(event);
    const validated = updateCatHealthSignalSchema.parse(body);

    // Check if health signal exists
    const existingSignal = await prisma.catHealthSignal.findUnique({
      where: { id: validatedParams.id },
    });

    if (!existingSignal) {
      throw createError({
        statusCode: 404,
        statusMessage: 'ヘルスシグナルが見つかりません',
      });
    }

    // Update health signal
    const healthSignal = await prisma.catHealthSignal.update({
      where: { id: validatedParams.id },
      data: validated,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('✅ ヘルスシグナル更新成功:', healthSignal.id);
    return healthSignal;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: error.errors,
      });
    }

    console.error('❌ ヘルスシグナル更新エラー:', error);
    throw error;
  }
});
