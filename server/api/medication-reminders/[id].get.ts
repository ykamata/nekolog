import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationIdSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

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
