import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { createCatHealthSignalSchema } from '~/lib/validations/health-signal';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * Create a new health signal
 * POST /api/health-signals
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'POST');

    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const validated = createCatHealthSignalSchema.parse(requestData);

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

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Upsert health signal (create or update if exists for the same cat and date)
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const healthSignal = await prisma.catHealthSignal.upsert({
      where: {
        catId_date: {
          catId: validated.catId,
          date: normalizedDate,
        },
      },
      update: {
        color: validated.color,
        note: validated.note,
        updatedAt: nowJST,
      },
      create: {
        catId: validated.catId,
        date: normalizedDate,
        color: validated.color,
        note: validated.note,
        createdAt: nowJST,
        updatedAt: nowJST,
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

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseSignal = {
      ...healthSignal,
      date: toLocalISOString(healthSignal.date),
      createdAt: toLocalISOString(healthSignal.createdAt),
      updatedAt: toLocalISOString(healthSignal.updatedAt),
    };

    console.log('✅ ヘルスシグナル作成成功:', healthSignal.id);
    return responseSignal;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: error.errors,
      });
    }

    console.error('❌ ヘルスシグナル作成エラー:', error);
    throw error;
  }
});
