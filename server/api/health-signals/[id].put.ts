import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { healthSignalIdSchema, updateCatHealthSignalSchema } from '~/lib/validations/health-signal';
import { toLocalISOString } from '~/utils/cat-meal';

/**
 * Update a health signal
 * PUT /api/health-signals/:id
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'PUT');

    const params = getRouterParams(event);
    const validatedParams = healthSignalIdSchema.parse(params);

    const body = await readBody(event);

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const validated = updateCatHealthSignalSchema.parse(requestData);

    // Check if health signal exists
    const existingSignal = await prisma.catHealthSignal.findUnique({
      where: { id: validatedParams.id },
    });

    if (!existingSignal) {
      throw createError({
        statusCode: 404,
        statusMessage: 'ヘルスシグナルが見つかりません',
      });
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Update health signal
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const healthSignal = await prisma.catHealthSignal.update({
      where: { id: validatedParams.id },
      data: {
        ...validated,
        updatedAt: nowJST,
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseSignal = {
      ...healthSignal,
      date: toLocalISOString(healthSignal.date),
      createdAt: toLocalISOString(healthSignal.createdAt),
      updatedAt: toLocalISOString(healthSignal.updatedAt),
    };

    console.log('✅ ヘルスシグナル更新成功:', healthSignal.id);
    return responseSignal;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: error.errors,
      });
    }

    console.error('❌ ヘルスシグナル更新エラー:', error);
    throw error;
  }
});
