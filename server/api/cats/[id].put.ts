import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { CatUpdateSchema } from '~/lib/validations/cat-meal';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().int().positive('Invalid cat ID format'),
});

export default defineEventHandler(async (event) => {
  try {
    // Only allow PUT method
    assertMethod(event, 'PUT');

    // Parse and validate route parameters
    const params = getRouterParams(event);
    const { id } = paramsSchema.parse(params);

    // Parse and validate request body
    const body = await readBody(event);
    console.log('🐱 PUT /api/cats/[id] - Request body:', JSON.stringify(body, null, 2));

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const updateData = CatUpdateSchema.parse(requestData);
    console.log('🐱 PUT /api/cats/[id] - Validated data:', JSON.stringify(updateData, null, 2));

    // Check if cat exists
    const existingCat = await prisma.cat.findUnique({
      where: { id },
    });

    if (!existingCat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Check if name is being updated and if it conflicts with another cat
    if (updateData.name && updateData.name !== existingCat.name) {
      const nameConflict = await prisma.cat.findFirst({
        where: {
          name: updateData.name,
          id: { not: id },
        },
      });

      if (nameConflict) {
        throw createError({
          statusCode: 409,
          statusMessage: '同じ名前の猫が既に登録されています',
        });
      }
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Update cat
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const cat = await prisma.cat.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: nowJST,
      },
      select: {
        id: true,
        name: true,
        birthdate: true,
        weight: true,
        photoUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseCat = {
      ...cat,
      birthdate: cat.birthdate ? toLocalISOString(cat.birthdate) : null,
      createdAt: toLocalISOString(cat.createdAt),
      updatedAt: toLocalISOString(cat.updatedAt),
    };

    return {
      cat: responseCat,
      message: '猫の情報が正常に更新されました',
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
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
