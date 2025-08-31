import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';
import { veterinaryHospitalSchema } from '~/lib/validations/veterinary-master';

export default defineEventHandler(async (event) => {
  const errorHandler = createApiErrorHandler({
    operation: 'update_hospital',
    resource: 'veterinary-hospitals',
    method: 'PUT',
  });

  try {
    // 認証チェック
    const user = await requireAuth(event);

    // パラメータとボディを検証
    const { id } = await validateParams(event, veterinaryIdSchema);
    const body = await validateBody(event, veterinaryHospitalUpdateSchema);

    // 病院が存在し、ユーザーが所有者であることを確認
    const existingHospital = await prisma.veterinaryHospital.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!existingHospital) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された病院が見つかりません',
        data: {
          code: 'NOT_FOUND',
          resource: 'hospital',
          id,
        },
      });
    }

    // 名前が変更される場合、重複チェック
    if (body.name && body.name !== existingHospital.name) {
      const duplicateHospital = await prisma.veterinaryHospital.findFirst({
        where: {
          name: body.name,
          userId: user.userId,
          id: { not: id },
        },
      });

      if (duplicateHospital) {
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
    }

    // 病院情報を更新
    const updatedHospital = await prisma.veterinaryHospital.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.address !== undefined && { address: body.address || null }),
        ...(body.phone !== undefined && { phone: body.phone || null }),
        ...(body.memo !== undefined && { memo: body.memo || null }),
      },
    });

    return updatedHospital;
  }
  catch (error) {
    throw errorHandler(error);
  }
});
