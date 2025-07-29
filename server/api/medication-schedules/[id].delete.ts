import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationIdSchema } from '~/lib/validations/medication';

/**
 * DELETE /api/medication-schedules/:id
 * 指定されたIDの薬のスケジュールを削除
 */
export default defineEventHandler(async (event) => {
  try {
    const params = getRouterParams(event);

    // パラメータのバリデーション
    const { id } = MedicationIdSchema.parse(params);

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

    // 関連するリマインダーも削除される（CASCADE設定により自動削除）
    await prisma.medicationSchedule.delete({
      where: { id },
    });

    return { success: true, message: 'スケジュールが削除されました' };
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid parameters',
        data: error.errors,
      });
    }

    console.error('Error deleting medication schedule:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
