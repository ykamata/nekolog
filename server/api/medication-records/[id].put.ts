import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationRecordUpdateSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('有効なIDを指定してください'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow PUT method
    assertMethod(event, 'PUT');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse and validate request body
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const updateData = MedicationRecordUpdateSchema.parse(requestData);

    // Check if record exists
    const existingRecord = await prisma.medicationRecord.findUnique({
      where: { id },
      select: { id: true, catId: true, medicationId: true },
    });

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: '投与記録が見つかりません',
      });
    }

    // If catId is being updated, verify the cat exists
    if (updateData.catId && updateData.catId !== existingRecord.catId) {
      const cat = await prisma.cat.findUnique({
        where: { id: updateData.catId },
        select: { id: true },
      });

      if (!cat) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された猫が見つかりません',
        });
      }
    }

    // If medicationId is being updated, verify the medication exists
    if (
      updateData.medicationId
      && updateData.medicationId !== existingRecord.medicationId
    ) {
      const medication = await prisma.medication.findUnique({
        where: { id: updateData.medicationId },
        select: { id: true },
      });

      if (!medication) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された薬が見つかりません',
        });
      }
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Update medication record
    const record = await prisma.medicationRecord.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: nowJST,
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        medication: {
          select: {
            id: true,
            name: true,
            type: true,
            dosage: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseRecord = {
      ...record,
      administeredAt: toLocalISOString(record.administeredAt),
      createdAt: toLocalISOString(record.createdAt),
      updatedAt: toLocalISOString(record.updatedAt),
      cat: {
        ...record.cat,
        createdAt: toLocalISOString(record.cat.createdAt),
        updatedAt: toLocalISOString(record.cat.updatedAt),
      },
      medication: {
        ...record.medication,
        createdAt: toLocalISOString(record.medication.createdAt),
        updatedAt: toLocalISOString(record.medication.updatedAt),
      },
    };

    return {
      record: responseRecord,
      message: '投与記録が正常に更新されました',
    };
  }
  catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '入力データが無効です',
        data: error.errors,
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Handle unexpected errors
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
