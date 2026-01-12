import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationRecordInputSchema } from '~/lib/validations/medication';
import { toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const recordData = MedicationRecordInputSchema.parse(requestData);

    // Verify that the cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: recordData.catId },
      select: { id: true, name: true },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Verify that the medication exists
    const medication = await prisma.medication.findUnique({
      where: { id: recordData.medicationId },
      select: { id: true, name: true, type: true },
    });

    if (!medication) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された薬が見つかりません',
      });
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Create new medication record
    const record = await prisma.medicationRecord.create({
      data: {
        ...recordData,
        status: recordData.status || 'PENDING',
        createdAt: nowJST,
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
      message: '投与記録が正常に登録されました',
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
