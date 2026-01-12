import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { dailyNoteInputSchema } from '~/lib/validations/daily-calendar';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * Create a new daily note
 * POST /api/daily-notes
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'POST');

    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const validated = dailyNoteInputSchema.parse(requestData);

    // Normalize date to start of day (00:00:00)
    const normalizedDate = new Date(validated.date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Check if cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: validated.catId },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Validate medication exists if provided
    if (validated.medicationId) {
      const medication = await prisma.medication.findUnique({
        where: { id: validated.medicationId },
      });

      if (!medication) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された薬が見つかりません',
        });
      }
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Create or update daily note (upsert)
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const dailyNote = await prisma.dailyNote.upsert({
      where: {
        catId_date: {
          catId: validated.catId,
          date: normalizedDate,
        },
      },
      update: {
        medicationId: validated.medicationId,
        emergencyMedication: validated.emergencyMedication ?? false,
        memo: validated.memo,
        updatedAt: nowJST,
      },
      create: {
        catId: validated.catId,
        date: normalizedDate,
        medicationId: validated.medicationId,
        emergencyMedication: validated.emergencyMedication ?? false,
        memo: validated.memo,
        createdAt: nowJST,
        updatedAt: nowJST,
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseNote = {
      ...dailyNote,
      date: toLocalISOString(dailyNote.date),
      createdAt: toLocalISOString(dailyNote.createdAt),
      updatedAt: toLocalISOString(dailyNote.updatedAt),
    };

    console.log('✅ デイリーノート作成/更新成功:', dailyNote.id);

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

    console.error('❌ デイリーノート作成エラー:', error);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
