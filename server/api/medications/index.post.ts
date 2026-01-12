import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationInputSchema } from '~/lib/validations/medication';
import { withErrorContext, validateBody } from '~/server/utils/error-handler';
import { toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(withErrorContext('/api/medications [POST]')(async (event) => {
  // Only allow POST method
  assertMethod(event, 'POST');

  // Parse and validate request body
  const body = await readBody(event);

  // createdAtとupdatedAtはサーバー側で管理するため除外
  const { createdAt, updatedAt, ...requestData } = body;
  const medicationData = validateBody(MedicationInputSchema, requestData);

  // Check if medication with same name already exists
  const existingMedication = await prisma.medication.findFirst({
    where: {
      name: medicationData.name,
    },
  });

  if (existingMedication) {
    throw createError({
      statusCode: 409,
      statusMessage: '同じ名前の薬が既に登録されています',
    });
  }

  // 現在のJST時刻を明示的に作成（UTC + 9時間）
  const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

  // Create new medication
  // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
  const medication = await prisma.medication.create({
    data: {
      ...medicationData,
      createdAt: nowJST,
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
    message: '薬が正常に登録されました',
  };
}));
