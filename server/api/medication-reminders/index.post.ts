import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationReminderInputSchema } from '~/lib/validations/medication';

/**
 * POST /api/medication-reminders
 * 薬のリマインダーを作成
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // 入力データのバリデーション
    const reminderData = MedicationReminderInputSchema.parse(body);

    // スケジュールの存在確認
    const schedule = await prisma.medicationSchedule.findUnique({
      where: { id: reminderData.scheduleId },
      include: {
        cat: true,
        medication: true,
      },
    });

    if (!schedule) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Medication schedule not found',
      });
    }

    // 猫とスケジュールの整合性チェック
    if (schedule.catId !== reminderData.catId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cat ID does not match schedule',
      });
    }

    // 薬とスケジュールの整合性チェック
    if (schedule.medicationId !== reminderData.medicationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Medication ID does not match schedule',
      });
    }

    // 同じ時間のリマインダーが既に存在するかチェック
    const existingReminder = await prisma.medicationReminder.findFirst({
      where: {
        scheduleId: reminderData.scheduleId,
        scheduledAt: reminderData.scheduledAt,
      },
    });

    if (existingReminder) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Reminder already exists for this time',
      });
    }

    // リマインダーを作成
    const reminder = await prisma.medicationReminder.create({
      data: reminderData,
      include: {
        cat: true,
        medication: true,
        schedule: true,
      },
    });

    return reminder;
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

    console.error('Error creating medication reminder:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
