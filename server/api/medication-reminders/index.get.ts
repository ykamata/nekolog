import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationReminderFilterSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * GET /api/medication-reminders
 * 薬のリマインダー一覧を取得
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    // クエリパラメータのバリデーション
    const filter = MedicationReminderFilterSchema.parse({
      catId: query.catId || undefined,
      medicationId: query.medicationId || undefined,
      scheduleId: query.scheduleId || undefined,
      status: query.status || undefined,
      startDate: query.startDate ? new Date(query.startDate as string) : undefined,
      endDate: query.endDate ? new Date(query.endDate as string) : undefined,
      limit: query.limit ? Number(query.limit) : 50,
      offset: query.offset ? Number(query.offset) : 0,
    });

    // フィルター条件の構築
    const where: any = {};

    if (filter.catId) {
      where.catId = filter.catId;
    }

    if (filter.medicationId) {
      where.medicationId = filter.medicationId;
    }

    if (filter.scheduleId) {
      where.scheduleId = filter.scheduleId;
    }

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      where.scheduledAt = {};
      if (filter.startDate) {
        where.scheduledAt.gte = filter.startDate;
      }
      if (filter.endDate) {
        where.scheduledAt.lte = filter.endDate;
      }
    }

    // データベースクエリ実行
    const [reminders, total] = await Promise.all([
      prisma.medicationReminder.findMany({
        where,
        include: {
          cat: true,
          medication: true,
          schedule: true,
        },
        orderBy: {
          scheduledAt: 'asc',
        },
        take: filter.limit,
        skip: filter.offset,
      }),
      prisma.medicationReminder.count({ where }),
    ]);

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseReminders = reminders.map(reminder => ({
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
    }));

    return {
      data: responseReminders,
      pagination: {
        total,
        limit: filter.limit,
        offset: filter.offset,
        hasMore: (filter.offset || 0) + (filter.limit || 10) < total,
      },
    };
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: error.errors,
      });
    }

    console.error('Error fetching medication reminders:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
