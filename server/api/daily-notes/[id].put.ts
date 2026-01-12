import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { dailyNoteUpdateSchema } from '~/lib/validations/daily-calendar';
import { toLocalISOString } from '~/utils/cat-meal';

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

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const validated = dailyNoteUpdateSchema.parse(requestData);

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

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Update daily note
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const updated = await prisma.dailyNote.update({
      where: { id },
      data: {
        ...validated,
        updatedAt: nowJST,
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseNote = {
      ...updated,
      date: toLocalISOString(updated.date),
      createdAt: toLocalISOString(updated.createdAt),
      updatedAt: toLocalISOString(updated.updatedAt),
    };

    console.log('✅ デイリーノート更新成功:', id);

    return responseNote;
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
