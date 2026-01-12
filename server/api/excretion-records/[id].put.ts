import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { ExcretionRecordUpdateSchema } from '~/lib/validations/excretion';
import { toLocalISOString } from '~/utils/cat-meal';

const paramsSchema = z.object({
  id: z.coerce.number().positive('Invalid excretion record ID format'),
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

    // createdAtとupdatedAtはサーバー側で管理するため除外
    const { createdAt, updatedAt, ...requestData } = body;
    const updateData = ExcretionRecordUpdateSchema.parse(requestData);

    // Check if excretion record exists
    const existingRecord = await prisma.excretionRecord.findUnique({
      where: { id },
      select: { id: true, catId: true },
    });

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された排泄記録が見つかりません',
      });
    }

    // If catId is being updated, verify the cat exists
    if (updateData.catId) {
      const cat = await prisma.cat.findUnique({
        where: { id: updateData.catId },
        select: { id: true },
      });

      if (!cat) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された猫が見つかりません',
        });
      }
    }

    // 現在のJST時刻を明示的に作成（UTC + 9時間）
    const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000);

    // Prepare update data with proper typing
    const finalUpdateData: {
      catId?: number;
      type?: 'URINE' | 'FECES';
      recordedAt?: Date;
      notes?: string;
      updatedAt: Date;
    } = {
      updatedAt: nowJST,
    };

    if (updateData.catId) finalUpdateData.catId = updateData.catId;
    if (updateData.type)
      finalUpdateData.type = updateData.type as 'URINE' | 'FECES';
    if (updateData.recordedAt)
      finalUpdateData.recordedAt = updateData.recordedAt;
    if (updateData.notes !== undefined)
      finalUpdateData.notes = updateData.notes;

    // Update excretion record
    // DATABASE_URLのtimezone=Asia/Tokyoパラメータによりタイムゾーンが保持される
    const excretionRecord = await prisma.excretionRecord.update({
      where: { id },
      data: finalUpdateData,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    // DateオブジェクトをローカルISO文字列に変換してタイムゾーン情報を保持
    const responseRecord = {
      ...excretionRecord,
      recordedAt: toLocalISOString(excretionRecord.recordedAt),
      createdAt: toLocalISOString(excretionRecord.createdAt),
      updatedAt: toLocalISOString(excretionRecord.updatedAt),
      cat: excretionRecord.cat ? {
        ...excretionRecord.cat,
        createdAt: toLocalISOString(excretionRecord.cat.createdAt),
        updatedAt: toLocalISOString(excretionRecord.cat.updatedAt),
      } : undefined,
    };

    return {
      record: responseRecord,
      message: '排泄記録が正常に更新されました',
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
