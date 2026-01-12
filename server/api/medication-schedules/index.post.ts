import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationScheduleInputSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * POST /api/medication-schedules
 * 新しい薬のスケジュールを作成
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;

    // リクエストボディのバリデーション
    const scheduleData = MedicationScheduleInputSchema.parse(requestData);

    // 猫と薬の存在確認
    const [cat, medication] = await Promise.all([
      prisma.cat.findUnique({ where: { id: scheduleData.catId } }),
      prisma.medication.findUnique({
        where: { id: scheduleData.medicationId },
      }),
    ]);

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    if (!medication) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された薬が見つかりません',
      });
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // スケジュールを作成
    const schedule = await prisma.medicationSchedule.create({
      data: {
        ...scheduleData,
        times: JSON.stringify(scheduleData.times), // 配列をJSON文字列に変換
        createdAt: nowJST,
        updatedAt: nowJST,
      },
      include: {
        cat: true,
        medication: true,
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const scheduleWithParsedTimes = {
      ...schedule,
      times: JSON.parse(schedule.times),
      startDate: toLocalISOString(schedule.startDate),
      endDate: schedule.endDate ? toLocalISOString(schedule.endDate) : null,
      createdAt: toLocalISOString(schedule.createdAt),
      updatedAt: toLocalISOString(schedule.updatedAt),
      cat: {
        ...schedule.cat,
        birthdate: schedule.cat.birthdate ? toLocalISOString(schedule.cat.birthdate) : null,
        createdAt: toLocalISOString(schedule.cat.createdAt),
        updatedAt: toLocalISOString(schedule.cat.updatedAt),
      },
      medication: {
        ...schedule.medication,
        createdAt: toLocalISOString(schedule.medication.createdAt),
        updatedAt: toLocalISOString(schedule.medication.updatedAt),
      },
    };

    return scheduleWithParsedTimes;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid input data',
        data: error.errors,
      });
    }

    console.error('Error creating medication schedule:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
