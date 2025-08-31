import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';
import { createApiErrorHandler } from '~/server/utils/error-handler';
import { veterinaryIdSchema } from '~/lib/validations/veterinary-master';

export default defineEventHandler(async (event) => {
  const errorHandler = createApiErrorHandler({
    endpoint: '/api/veterinary-doctors/[id]',
    method: 'DELETE',
  });

  try {
    // 認証チェック
    const user = await requireAuth(event);

    // パラメータを検証
    const params = getRouterParams(event);
    const { id } = veterinaryIdSchema.parse(params);

    // 先生が存在し、ユーザーが所有者であることを確認
    const existingDoctor = await prisma.veterinaryDoctor.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        visits: true,
        appointments: true,
      },
    });

    if (!existingDoctor) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された先生が見つかりません',
        data: {
          code: 'NOT_FOUND',
          resource: 'doctor',
          id,
        },
      });
    }

    // 関連データの存在チェック
    if (existingDoctor.visits.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この先生には通院記録があるため削除できません',
        data: {
          code: 'DOCTOR_HAS_VISITS',
          visitCount: existingDoctor.visits.length,
        },
      });
    }

    if (existingDoctor.appointments.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この先生には予約があるため削除できません',
        data: {
          code: 'DOCTOR_HAS_APPOINTMENTS',
          appointmentCount: existingDoctor.appointments.length,
        },
      });
    }

    // 先生を削除
    await prisma.veterinaryDoctor.delete({
      where: { id },
    });

    return { success: true, message: '先生を削除しました' };
  }
  catch (error) {
    throw errorHandler(error);
  }
});
