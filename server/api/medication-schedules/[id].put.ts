import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import {
  MedicationIdSchema,
  MedicationScheduleUpdateSchema,
} from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * PUT /api/medication-schedules/:id
 * 指定されたIDの薬のスケジュールを更新
 */
export default defineEventHandler(async (event) => {
  try {
    const params = getRouterParams(event);
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;

    // パラメータとボディのバリデーション
    const { id } = MedicationIdSchema.parse(params);
    const updateData = MedicationScheduleUpdateSchema.parse(requestData);

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

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // データを準備（timesが配列の場合はJSON文字列に変換）
    const dataToUpdate: Record<string, unknown> = { ...updateData };
    if (updateData.times) {
      dataToUpdate.times = JSON.stringify(updateData.times);
    }
    dataToUpdate.updatedAt = nowJST;

    // スケジュールを更新
    const updatedSchedule = await prisma.medicationSchedule.update({
      where: { id },
      data: dataToUpdate,
      include: {
        cat: true,
        medication: true,
      },
    });

    // レスポンス用にtimesを配列に戻し、DateオブジェクトをローカルISO文字列に変換
    const scheduleWithParsedTimes = {
      ...updatedSchedule,
      times: JSON.parse(updatedSchedule.times),
      startDate: toLocalISOString(updatedSchedule.startDate),
      endDate: updatedSchedule.endDate ? toLocalISOString(updatedSchedule.endDate) : null,
      createdAt: toLocalISOString(updatedSchedule.createdAt),
      updatedAt: toLocalISOString(updatedSchedule.updatedAt),
      cat: {
        ...updatedSchedule.cat,
        birthdate: updatedSchedule.cat.birthdate ? toLocalISOString(updatedSchedule.cat.birthdate) : null,
        createdAt: toLocalISOString(updatedSchedule.cat.createdAt),
        updatedAt: toLocalISOString(updatedSchedule.cat.updatedAt),
      },
      medication: {
        ...updatedSchedule.medication,
        createdAt: toLocalISOString(updatedSchedule.medication.createdAt),
        updatedAt: toLocalISOString(updatedSchedule.medication.updatedAt),
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

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
