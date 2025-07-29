import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationScheduleInputSchema } from '~/lib/validations/medication';

/**
 * POST /api/medication-schedules
 * 新しい薬のスケジュールを作成
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // リクエストボディのバリデーション
    const scheduleData = MedicationScheduleInputSchema.parse(body);

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

    // スケジュールを作成
    const schedule = await prisma.medicationSchedule.create({
      data: {
        ...scheduleData,
        times: JSON.stringify(scheduleData.times), // 配列をJSON文字列に変換
      },
      include: {
        cat: true,
        medication: true,
      },
    });

    // レスポンス用にtimesを配列に戻す
    const scheduleWithParsedTimes = {
      ...schedule,
      times: JSON.parse(schedule.times),
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
