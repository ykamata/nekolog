import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { MedicationRecordInputSchema } from '~/lib/validations/medication';

export default defineEventHandler(async (event) => {
  try {
    // Only allow POST method
    assertMethod(event, 'POST');

    // Parse and validate request body
    const body = await readBody(event);
    const recordData = MedicationRecordInputSchema.parse(body);

    // Verify that the cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: recordData.catId },
      select: { id: true, name: true },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Verify that the medication exists
    const medication = await prisma.medication.findUnique({
      where: { id: recordData.medicationId },
      select: { id: true, name: true, type: true },
    });

    if (!medication) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された薬が見つかりません',
      });
    }

    // Create new medication record
    const record = await prisma.medicationRecord.create({
      data: {
        ...recordData,
        status: recordData.status || 'PENDING',
      },
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
      message: '投与記録が正常に登録されました',
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
