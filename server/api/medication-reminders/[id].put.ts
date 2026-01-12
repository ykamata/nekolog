import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationIdSchema } from '~/lib/validations/medication';
import { ReminderStatus } from '~/types/medication';
import { toLocalISOString } from '~/utils/cat-meal';

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

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;

    // パラメータのバリデーション
    const { id } = MedicationIdSchema.parse(params);

    // 入力データのバリデーション
    const updateData = ReminderUpdateSchema.parse(requestData);

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

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // リマインダーを更新
    const updatedReminder = await prisma.medicationReminder.update({
      where: { id },
      data: {
        status: updateData.status,
        ...(updateData.scheduledAt && { scheduledAt: updateData.scheduledAt }),
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
      ...updatedReminder,
      scheduledAt: toLocalISOString(updatedReminder.scheduledAt),
      createdAt: toLocalISOString(updatedReminder.createdAt),
      updatedAt: toLocalISOString(updatedReminder.updatedAt),
      cat: {
        ...updatedReminder.cat,
        birthdate: updatedReminder.cat.birthdate ? toLocalISOString(updatedReminder.cat.birthdate) : null,
        createdAt: toLocalISOString(updatedReminder.cat.createdAt),
        updatedAt: toLocalISOString(updatedReminder.cat.updatedAt),
      },
      medication: {
        ...updatedReminder.medication,
        createdAt: toLocalISOString(updatedReminder.medication.createdAt),
        updatedAt: toLocalISOString(updatedReminder.medication.updatedAt),
      },
      schedule: {
        ...updatedReminder.schedule,
        startDate: toLocalISOString(updatedReminder.schedule.startDate),
        endDate: updatedReminder.schedule.endDate ? toLocalISOString(updatedReminder.schedule.endDate) : null,
        createdAt: toLocalISOString(updatedReminder.schedule.createdAt),
        updatedAt: toLocalISOString(updatedReminder.schedule.updatedAt),
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

    console.error('Error updating medication reminder:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
