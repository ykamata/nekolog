import { prisma } from '~/lib/prisma';

/**
 * Delete a daily note
 * DELETE /api/daily-notes/:id
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'DELETE');

    const id = parseInt(event.context.params?.id || '');
    if (isNaN(id)) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid ID',
      });
    }

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

    // Delete daily note
    await prisma.dailyNote.delete({
      where: { id },
    });

    console.log('✅ デイリーノート削除成功:', id);

    return { success: true, id };
  }
  catch (error) {
    console.error('❌ デイリーノート削除エラー:', error);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
