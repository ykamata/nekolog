import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationUpdateSchema } from '~/lib/validations/medication';
import {
  withErrorContext,
  validateParams,
  validateBody,
} from '~/server/utils/error-handler';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('Invalid medication ID format'),
});

export default defineEventHandler(
  withErrorContext('/api/medications/[id] [PUT]')(async (event) => {
    // Only allow PUT method
    assertMethod(event, 'PUT');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = validateParams(paramsSchema, params);

    // Parse and validate request body
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const updateData = validateBody(MedicationUpdateSchema, requestData);

    // Check if medication exists
    const existingMedication = await prisma.medication.findUnique({
      where: { id },
    });

    if (!existingMedication) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された薬が見つかりません',
      });
    }

    // Check if name is being updated and if it conflicts with another medication
    if (updateData.name && updateData.name !== existingMedication.name) {
      const nameConflict = await prisma.medication.findFirst({
        where: {
          name: updateData.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw createError({
          statusCode: 409,
          statusMessage: '同じ名前の薬が既に登録されています',
        });
      }
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Update medication
    const medication = await prisma.medication.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: nowJST,
      },
      select: {
        id: true,
        name: true,
        type: true,
        description: true,
        dosage: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseMedication = {
      ...medication,
      createdAt: toLocalISOString(medication.createdAt),
      updatedAt: toLocalISOString(medication.updatedAt),
    };

    return {
      medication: responseMedication,
      message: '薬の情報が正常に更新されました',
    };
  }),
);
