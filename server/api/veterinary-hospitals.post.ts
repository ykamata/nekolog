import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';
import { veterinaryHospitalSchema } from '~/lib/validations/veterinary-master';
import { createApiErrorHandler, validateBody } from '~/server/utils/error-handler';

export default defineEventHandler(async (event) => {
  const errorHandler = createApiErrorHandler({
    endpoint: 'veterinary-hospitals',
    method: 'POST',
  });

  try {
    // 認証チェック
    const user = await requireAuth(event);

    // リクエストボディを取得して検証
    const requestBody = await readBody(event);
    const body = validateBody(veterinaryHospitalSchema, requestBody);

    // 同名の病院が既に存在するかチェック（同じユーザー内で）
    const existingHospital = await prisma.veterinaryHospital.findFirst({
      where: {
        name: body.name,
        userId: user.userId,
      },
    });

    if (existingHospital) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この病院名は既に登録されています',
        data: {
          code: 'DUPLICATE_NAME',
          field: 'name',
          value: body.name,
        },
      });
    }

    // 新しい病院を作成
    const hospital = await prisma.veterinaryHospital.create({
      data: {
        name: body.name,
        address: body.address || null,
        phone: body.phone || null,
        memo: body.memo || null,
        userId: user.userId,
      },
    });

    return hospital;
  }
  catch (error) {
    throw errorHandler(error);
  }
});
