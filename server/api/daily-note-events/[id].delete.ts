import { prisma } from '~/lib/prisma';

/**
 * Delete a daily note event
 * DELETE /api/daily-note-events/:id
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'DELETE');

    const idParam = getRouterParam(event, 'id');
    const id = Number(idParam);

    if (!Number.isInteger(id) || id <= 0) {
      throw createError({ statusCode: 400, statusMessage: '無効なIDです' });
    }

    const existing = await prisma.dailyNoteEvent.findUnique({ where: { id } });
    if (!existing) {
      throw createError({ statusCode: 404, statusMessage: 'イベントが見つかりません' });
    }

    await prisma.dailyNoteEvent.delete({ where: { id } });

    console.log('✅ デイリーノートイベント削除成功:', id);
    return { success: true };
  }
  catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('❌ デイリーノートイベント削除エラー:', error);
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' });
  }
});
