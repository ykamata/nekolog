import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationIdSchema } from '~/lib/validations/medication';

/**
 * GET /api/medication-reminders/:id
 * 薬のリマインダー詳細を取得
 */
export default defineEventHandler(async (event) => {
  try {
    const params = getRouterParams(event);

    // パラメータのバリデーション
    const { id } = MedicationIdSchema.parse(params);

    // リマインダーを取得
    const reminder = await prisma.medicationReminder.findUnique({
      where: { id },
      include: {
        cat: true,
        medication: true,
        schedule: true,
      },
    });

    if (!reminder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Medication reminder not found',
      });
    }

    return reminder;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid reminder ID',
        data: error.errors,
      });
    }

    // 既にcreateErrorで作成されたエラーはそのまま投げる
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Error fetching medication reminder:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
