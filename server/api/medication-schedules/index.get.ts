import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationScheduleFilterSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * GET /api/medication-schedules
 * 薬のスケジュール一覧を取得
 */
export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    // クエリパラメータのバリデーション
    const filter = MedicationScheduleFilterSchema.parse({
      catId: query.catId || undefined,
      medicationId: query.medicationId || undefined,
      isActive: query.isActive ? query.isActive === 'true' : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
      offset: query.offset ? Number(query.offset) : undefined,
    });

    // データベースクエリの構築
    const where: Record<string, unknown> = {};
    if (filter.catId) where.catId = filter.catId;
    if (filter.medicationId) where.medicationId = filter.medicationId;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;

    // スケジュール一覧を取得
    const schedules = await prisma.medicationSchedule.findMany({
      where,
      include: {
        cat: true,
        medication: true,
      },
      orderBy: [{ isActive: 'desc' }, { startDate: 'desc' }],
      take: filter.limit || 50,
      skip: filter.offset || 0,
    });

    // times フィールドをJSONパースして配列に変換し、DateオブジェクトをローカルISO文字列に変換
    const schedulesWithParsedTimes = schedules.map(schedule => ({
      ...schedule,
      times: JSON.parse(schedule.times),
      startDate: toLocalISOString(schedule.startDate),
      endDate: schedule.endDate ? toLocalISOString(schedule.endDate) : null,
      createdAt: toLocalISOString(schedule.createdAt),
      updatedAt: toLocalISOString(schedule.updatedAt),
      cat: {
        ...schedule.cat,
        birthdate: schedule.cat.birthdate ? toLocalISOString(schedule.cat.birthdate) : null,
        createdAt: toLocalISOString(schedule.cat.createdAt),
        updatedAt: toLocalISOString(schedule.cat.updatedAt),
      },
      medication: {
        ...schedule.medication,
        createdAt: toLocalISOString(schedule.medication.createdAt),
        updatedAt: toLocalISOString(schedule.medication.updatedAt),
      },
    }));

    return schedulesWithParsedTimes;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid query parameters',
        data: error.errors,
      });
    }

    // eslint-disable-next-line no-console
    console.error('Error fetching medication schedules:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
