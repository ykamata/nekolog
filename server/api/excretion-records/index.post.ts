import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { ExcretionRecordInputSchema } from '~/lib/validations/excretion';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const excretionData = ExcretionRecordInputSchema.parse(body);

    // Verify that cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: excretionData.catId },
      select: { id: true, name: true },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Create new excretion record
    const excretionRecord = await prisma.excretionRecord.create({
      data: {
        catId: excretionData.catId,
        type: excretionData.type as 'URINE' | 'FECES',
        recordedAt: excretionData.recordedAt,
        notes: excretionData.notes,
      },
      include: {
        cat: {
          select: {
            id: true,
            name: true,
            photoUrl: true,
          },
        },
      },
    });

    return {
      record: excretionRecord,
      message: '排泄記録が正常に登録されました',
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
