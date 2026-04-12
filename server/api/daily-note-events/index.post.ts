import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { dailyNoteEventInputSchema } from '~/lib/validations/daily-calendar';

/**
 * Create a daily note event (auto-creates DailyNote if needed)
 * POST /api/daily-note-events
 * Body: { catId, date, eventType }
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'POST');

    const body = await readBody(event);
    const validated = dailyNoteEventInputSchema.parse(body);

    // 日付を00:00:00に正規化
    const normalizedDate = new Date(validated.date);
    normalizedDate.setHours(0, 0, 0, 0);

    // 猫の存在確認
    const cat = await prisma.cat.findUnique({ where: { id: validated.catId } });
    if (!cat) {
      throw createError({ statusCode: 404, statusMessage: '指定された猫が見つかりません' });
    }

    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // DailyNoteをupsert（存在しない場合は作成）
    const dailyNote = await prisma.dailyNote.upsert({
      where: {
        catId_date: {
          catId: validated.catId,
          date: normalizedDate,
        },
      },
      update: { updatedAt: nowJST },
      create: {
        catId: validated.catId,
        date: normalizedDate,
        emergencyMedication: false,
        createdAt: nowJST,
        updatedAt: nowJST,
      },
    });

    // イベントを作成
    const noteEvent = await prisma.dailyNoteEvent.create({
      data: {
        dailyNoteId: dailyNote.id,
        eventType: validated.eventType,
        createdAt: nowJST,
        updatedAt: nowJST,
      },
    });

    console.log('✅ デイリーノートイベント作成成功:', noteEvent.id);
    return noteEvent;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({ statusCode: 400, statusMessage: 'Invalid request data', data: error.errors });
    }

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('❌ デイリーノートイベント作成エラー:', error);
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' });
  }
});
