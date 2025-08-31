import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';
import { createApiErrorHandler } from '~/server/utils/error-handler';
import { veterinaryIdSchema } from '~/lib/validations/veterinary-master';

export default defineEventHandler(async (event) => {
  const errorHandler = createApiErrorHandler({
    endpoint: '/api/veterinary-hospitals/[id]',
    method: 'DELETE',
  });

  try {
    // 認証チェック
    const user = await requireAuth(event);

    // パラメータを検証
    const params = getRouterParams(event);
    const { id } = veterinaryIdSchema.parse(params);

    // 病院が存在し、ユーザーが所有者であることを確認
    const existingHospital = await prisma.veterinaryHospital.findFirst({
      where: {
        id,
        userId: user.userId,
      },
      include: {
        doctors: true,
        visits: true,
        appointments: true,
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

    // 関連データの存在チェック
    if (existingHospital.doctors.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この病院には所属している先生がいるため削除できません',
        data: {
          code: 'HOSPITAL_HAS_DOCTORS',
          doctorCount: existingHospital.doctors.length,
          doctors: existingHospital.doctors.map(d => ({ id: d.id, name: d.name })),
        },
      });
    }

    if (existingHospital.visits.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この病院には通院記録があるため削除できません',
        data: {
          code: 'HOSPITAL_HAS_VISITS',
          visitCount: existingHospital.visits.length,
        },
      });
    }

    if (existingHospital.appointments.length > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この病院には予約があるため削除できません',
        data: {
          code: 'HOSPITAL_HAS_APPOINTMENTS',
          appointmentCount: existingHospital.appointments.length,
        },
      });
    }

    // 病院を削除
    await prisma.veterinaryHospital.delete({
      where: { id },
    });

    return { success: true, message: '病院を削除しました' };
  }
  catch (error) {
    throw errorHandler(error);
  }
});
