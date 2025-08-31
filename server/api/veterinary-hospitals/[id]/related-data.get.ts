import { requireAuth } from '~/lib/auth-middleware';
import { prisma } from '~/lib/prisma';
import { createApiErrorHandler } from '~/server/utils/error-handler';
import { veterinaryIdSchema } from '~/lib/validations/veterinary-master';

/**
 * 病院の関連データ存在チェック
 * 削除前の確認用
 */
export default defineEventHandler(async (event) => {
  const errorHandler = createApiErrorHandler({
    endpoint: '/api/veterinary-hospitals/[id]/related-data',
    method: 'GET',
  });

  try {
    // 認証チェック
    const user = await requireAuth(event);

    // パラメータを検証
    const params = getRouterParams(event);
    const { id } = veterinaryIdSchema.parse(params);

    // 病院が存在し、ユーザーが所有者であることを確認
    const hospital = await prisma.veterinaryHospital.findFirst({
      where: {
        id,
        userId: user.userId,
      },
    });

    if (!hospital) {
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

    // 関連データの存在をチェック
    const [doctorCount, visitCount, appointmentCount] = await Promise.all([
      prisma.veterinaryDoctor.count({
        where: {
          hospitalId: id,
          userId: user.userId,
        },
      }),
      prisma.veterinaryVisit.count({
        where: {
          hospitalId: id,
        },
      }),
      prisma.veterinaryAppointment.count({
        where: {
          hospitalId: id,
        },
      }),
    ]);

    return {
      hasDoctors: doctorCount > 0,
      hasVisits: visitCount > 0,
      hasAppointments: appointmentCount > 0,
      counts: {
        doctors: doctorCount,
        visits: visitCount,
        appointments: appointmentCount,
      },
    };
  }
  catch (error) {
    throw errorHandler(error);
  }
});
