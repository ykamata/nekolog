import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationReminderInputSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * POST /api/medication-reminders
 * 薬のリマインダーを作成
 */
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;

    // 入力データのバリデーション
    const reminderData = MedicationReminderInputSchema.parse(requestData);

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

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // リマインダーを作成
    const reminder = await prisma.medicationReminder.create({
      data: {
        ...reminderData,
        createdAt: nowJST,
        updatedAt: nowJST,
      },
      include: {
        cat: true,
        medication: true,
        schedule: true,
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseReminder = {
      ...reminder,
      scheduledAt: toLocalISOString(reminder.scheduledAt),
      createdAt: toLocalISOString(reminder.createdAt),
      updatedAt: toLocalISOString(reminder.updatedAt),
      cat: {
        ...reminder.cat,
        birthdate: reminder.cat.birthdate ? toLocalISOString(reminder.cat.birthdate) : null,
        createdAt: toLocalISOString(reminder.cat.createdAt),
        updatedAt: toLocalISOString(reminder.cat.updatedAt),
      },
      medication: {
        ...reminder.medication,
        createdAt: toLocalISOString(reminder.medication.createdAt),
        updatedAt: toLocalISOString(reminder.medication.updatedAt),
      },
      schedule: {
        ...reminder.schedule,
        startDate: toLocalISOString(reminder.schedule.startDate),
        endDate: reminder.schedule.endDate ? toLocalISOString(reminder.schedule.endDate) : null,
        createdAt: toLocalISOString(reminder.schedule.createdAt),
        updatedAt: toLocalISOString(reminder.schedule.updatedAt),
      },
    };

    return responseReminder;
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
