import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { requireAuth } from '~/lib/auth-middleware';
import { veterinaryDoctorSchema } from '~/lib/validations/veterinary-master';

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // リクエストボディを取得して検証
    const rawBody = await readBody(event);
    const body = veterinaryDoctorSchema.parse(rawBody);

    // 同名の先生が既に存在するかチェック（同じユーザー内で）
    const existingDoctor = await prisma.veterinaryDoctor.findFirst({
      where: {
        name: body.name,
        userId: user.userId,
      },
    });

    if (existingDoctor) {
      throw createError({
        statusCode: 409,
        statusMessage: 'この先生名は既に登録されています',
      });
    }

    // 病院IDが指定されている場合、その病院が存在し、ユーザーが所有しているかチェック
    if (body.hospitalId) {
      const hospital = await prisma.veterinaryHospital.findFirst({
        where: {
          id: body.hospitalId,
          userId: user.userId,
        },
      });

      if (!hospital) {
        throw createError({
          statusCode: 400,
          statusMessage: '指定された病院が見つかりません',
        });
      }
    }

    // 新しい先生を作成
    const doctor = await prisma.veterinaryDoctor.create({
      data: {
        name: body.name,
        hospitalId: body.hospitalId || null,
        specialty: body.specialty || null,
        memo: body.memo || null,
        userId: user.userId,
      },
      include: {
        hospital: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return { doctor };
  }
  catch (error) {
    // Zodバリデーションエラーの場合
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: '入力データが無効です',
        data: {
          validationErrors: error.errors,
        },
      });
    }

    // Re-throw HTTP errors
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: '先生の作成に失敗しました',
    });
  }
});
