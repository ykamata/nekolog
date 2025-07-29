import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import {
  MedicationIdSchema,
  MedicationScheduleUpdateSchema,
} from '~/lib/validations/medication';

/**
 * PUT /api/medication-schedules/:id
 * 指定されたIDの薬のスケジュールを更新
 */
export default defineEventHandler(async (event) => {
  try {
    const params = getRouterParams(event);
    const body = await readBody(event);

    // パラメータとボディのバリデーション
    const { id } = MedicationIdSchema.parse(params);
    const updateData = MedicationScheduleUpdateSchema.parse(body);

    // スケジュールの存在確認
    const existingSchedule = await prisma.medicationSchedule.findUnique({
      where: { id },
    });

    if (!existingSchedule) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定されたスケジュールが見つかりません',
      });
    }

    // 猫と薬の存在確認（更新される場合のみ）
    if (updateData.catId || updateData.medicationId) {
      const checks = [];
      if (updateData.catId) {
        checks.push(prisma.cat.findUnique({ where: { id: updateData.catId } }));
      }
      if (updateData.medicationId) {
        checks.push(
          prisma.medication.findUnique({
            where: { id: updateData.medicationId },
          }),
        );
      }

      const results = await Promise.all(checks);

      if (updateData.catId && !results[0]) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された猫が見つかりません',
        });
      }

      if (updateData.medicationId && !results[updateData.catId ? 1 : 0]) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された薬が見つかりません',
        });
      }
    }

    // データを準備（timesが配列の場合はJSON文字列に変換）
    const dataToUpdate: Record<string, unknown> = { ...updateData };
    if (updateData.times) {
      dataToUpdate.times = JSON.stringify(updateData.times);
    }

    // スケジュールを更新
    const updatedSchedule = await prisma.medicationSchedule.update({
      where: { id },
      data: dataToUpdate,
      include: {
        cat: true,
        medication: true,
      },
    });

    // レスポンス用にtimesを配列に戻す
    const scheduleWithParsedTimes = {
      ...updatedSchedule,
      times: JSON.parse(updatedSchedule.times),
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

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
