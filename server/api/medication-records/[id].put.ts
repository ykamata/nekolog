import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationRecordUpdateSchema } from '~/lib/validations/medication';

const paramsSchema = z.object({
  id: z.string().min(1, '有効なIDを指定してください'),
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
    const updateData = MedicationRecordUpdateSchema.parse(body);

    // Check if record exists
    const existingRecord = await prisma.medicationRecord.findUnique({
      where: { id },
      select: { id: true, catId: true, medicationId: true },
    });

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: '投与記録が見つかりません',
      });
    }

    // If catId is being updated, verify the cat exists
    if (updateData.catId && updateData.catId !== existingRecord.catId) {
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

    // If medicationId is being updated, verify the medication exists
    if (
      updateData.medicationId
      && updateData.medicationId !== existingRecord.medicationId
    ) {
      const medication = await prisma.medication.findUnique({
        where: { id: updateData.medicationId },
        select: { id: true },
      });

      if (!medication) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された薬が見つかりません',
        });
      }
    }

    // Update medication record
    const record = await prisma.medicationRecord.update({
      where: { id },
      data: updateData,
      include: {
        cat: {
          select: {
            id: true,
            name: true,
          },
        },
        medication: {
          select: {
            id: true,
            name: true,
            type: true,
            dosage: true,
          },
        },
      },
    });

    return {
      record,
      message: '投与記録が正常に更新されました',
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
