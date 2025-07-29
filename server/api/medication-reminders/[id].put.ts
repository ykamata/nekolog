import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationIdSchema } from '~/lib/validations/medication';
import { ReminderStatus } from '~/types/medication';

/**
 * PUT /api/medication-reminders/:id
 * 薬のリマインダーのステータスを更新
 */

// リマインダー更新用のスキーマ
const ReminderUpdateSchema = z.object({
  status: z.nativeEnum(ReminderStatus, {
    errorMap: () => ({ message: '有効なステータスを選択してください' }),
  }),
  scheduledAt: z.date({
    errorMap: () => ({ message: '有効な予定日時を入力してください' }),
  }).optional(),
});

export default defineEventHandler(async (event) => {
  try {
    const params = getRouterParams(event);
    const body = await readBody(event);

    // パラメータのバリデーション
    const { id } = MedicationIdSchema.parse(params);

    // 入力データのバリデーション
    const updateData = ReminderUpdateSchema.parse(body);

    // リマインダーの存在確認
    const existingReminder = await prisma.medicationReminder.findUnique({
      where: { id },
    });

    if (!existingReminder) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Medication reminder not found',
      });
    }

    // スヌーズの場合は新しい予定時間が必要
    if (updateData.status === ReminderStatus.SNOOZED && !updateData.scheduledAt) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Scheduled time is required when snoozing reminder',
      });
    }

    // リマインダーを更新
    const updatedReminder = await prisma.medicationReminder.update({
      where: { id },
      data: {
        status: updateData.status,
        ...(updateData.scheduledAt && { scheduledAt: updateData.scheduledAt }),
        updatedAt: new Date(),
      },
      include: {
        cat: true,
        medication: true,
        schedule: true,
      },
    });

    return updatedReminder;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid input data',
        data: error.errors,
      });
    }

    // 既にcreateErrorで作成されたエラーはそのまま投げる
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Error updating medication reminder:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
