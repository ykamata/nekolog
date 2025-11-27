import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { dailyNoteUpdateSchema } from '~/lib/validations/daily-calendar';

/**
 * Update a daily note
 * PUT /api/daily-notes/:id
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'PUT');

    const id = parseInt(event.context.params?.id || '');
    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID',
      });
    }

    const body = await readBody(event);
    const validated = dailyNoteUpdateSchema.parse(body);

    // Check if daily note exists
    const existing = await prisma.dailyNote.findUnique({
      where: { id },
    });

    if (!existing) {
      throw createError({
        statusCode: 404,
        statusMessage: 'デイリーノートが見つかりません',
      });
    }

    // Update daily note
    const updated = await prisma.dailyNote.update({
      where: { id },
      data: validated,
    });

    console.log('✅ デイリーノート更新成功:', id);

    return updated;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: error.errors,
      });
    }

    console.error('❌ デイリーノート更新エラー:', error);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
