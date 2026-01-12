import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationIdSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * GET /api/medication-schedules/:id
 * 指定されたIDの薬のスケジュールを取得
 */
export default defineEventHandler(async (event) => {
  try {
    const params = getRouterParams(event);

    // パラメータのバリデーション
    const { id } = MedicationIdSchema.parse(params);

    // スケジュールを取得
    const schedule = await prisma.medicationSchedule.findUnique({
      where: { id },
      include: {
        cat: true,
        medication: true,
      },
    });

    if (!schedule) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定されたスケジュールが見つかりません',
      });
    }

    // times フィールドをJSONパースして配列に変換し、DateオブジェクトをローカルISO文字列に変換
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
        statusMessage: 'Invalid parameters',
        data: error.errors,
      });
    }

    console.error('Error fetching medication schedule:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
