import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { veterinaryHospitalSchema } from '~/lib/validations/veterinary-master';

import { requireAuth } from '~/lib/auth-middleware';
import { toLocalISOString } from '~/utils/cat-meal';

export default defineEventHandler(async (event) => {
  try {
    // 認証チェック
    const user = await requireAuth(event);

    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const hospitalData = veterinaryHospitalSchema.parse(requestData);

    // Check if hospital with same name already exists for this user
    const existingHospital = await prisma.veterinaryHospital.findFirst({
      where: {
        name: hospitalData.name,
        userId: user.userId, // 同じユーザー内での重複チェック
      },
    });

    if (existingHospital) {
      throw createError({
        statusCode: 409,
        statusMessage: '同じ名前の病院が既に登録されています',
      });
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Create new hospital
    const hospital = await prisma.veterinaryHospital.create({
      data: {
        name: hospitalData.name,
        address: hospitalData.address || null,
        phone: hospitalData.phone || null,
        memo: hospitalData.memo || null,
        userId: user.userId, // ユーザーIDを設定
        createdAt: nowJST,
        updatedAt: nowJST,
      },
      include: {
        _count: {
          select: {
            visits: true,
            appointments: true,
            doctors: true,
          },
        },
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseHospital = {
      ...hospital,
      createdAt: toLocalISOString(hospital.createdAt),
      updatedAt: toLocalISOString(hospital.updatedAt),
    };

    return {
      hospital: responseHospital,
      message: '病院が正常に登録されました',
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
    console.error('Error creating veterinary hospital:', error);
    throw createError({
      statusCode: 500,
      statusMessage: '病院の作成に失敗しました',
    });
  }
});
