import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { dailyNoteInputSchema } from '~/lib/validations/daily-calendar';

/**
 * Create a new daily note
 * POST /api/daily-notes
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'POST');

    const body = await readBody(event);
    const validated = dailyNoteInputSchema.parse(body);

    // Normalize date to start of day (00:00:00)
    const normalizedDate = new Date(validated.date);
    normalizedDate.setHours(0, 0, 0, 0);

    // Check if cat exists
    const cat = await prisma.cat.findUnique({
      where: { id: validated.catId },
    });

    if (!cat) {
      throw createError({
        statusCode: 404,
        statusMessage: '指定された猫が見つかりません',
      });
    }

    // Validate medication exists if provided
    if (validated.medicationId) {
      const medication = await prisma.medication.findUnique({
        where: { id: validated.medicationId },
      });

      if (!medication) {
        throw createError({
          statusCode: 404,
          statusMessage: '指定された薬が見つかりません',
        });
      }
    }

    // Create or update daily note (upsert)
    const dailyNote = await prisma.dailyNote.upsert({
      where: {
        catId_date: {
          catId: validated.catId,
          date: normalizedDate,
        },
      },
      update: {
        medicationId: validated.medicationId,
        emergencyMedication: validated.emergencyMedication ?? false,
        memo: validated.memo,
      },
      create: {
        catId: validated.catId,
        date: normalizedDate,
        medicationId: validated.medicationId,
        emergencyMedication: validated.emergencyMedication ?? false,
        memo: validated.memo,
      },
    });

    console.log('✅ デイリーノート作成/更新成功:', dailyNote.id);

    return dailyNote;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: error.errors,
      });
    }

    console.error('❌ デイリーノート作成エラー:', error);

    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error',
    });
  }
});
