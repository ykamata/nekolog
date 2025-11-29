import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { healthSignalIdSchema } from '~/lib/validations/health-signal';

/**
 * Delete a health signal
 * DELETE /api/health-signals/:id
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'DELETE');

    const params = getRouterParams(event);
    const validated = healthSignalIdSchema.parse(params);

    // Check if health signal exists
    const existingSignal = await prisma.catHealthSignal.findUnique({
      where: { id: validated.id },
    });

    if (!existingSignal) {
      throw createError({
        statusCode: 404,
        statusMessage: 'ヘルスシグナルが見つかりません',
      });
    }

    // Delete health signal
    await prisma.catHealthSignal.delete({
      where: { id: validated.id },
    });

    console.log('✅ ヘルスシグナル削除成功:', validated.id);
    return { success: true };
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID parameter',
        data: error.errors,
      });
    }

    console.error('❌ ヘルスシグナル削除エラー:', error);
    throw error;
  }
});
