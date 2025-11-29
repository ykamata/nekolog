import { z } from 'zod';
import { prisma } from '~/lib/prisma';
import { createCatHealthSignalSchema } from '~/lib/validations/health-signal';

/**
 * Create a new health signal
 * POST /api/health-signals
 */
export default defineEventHandler(async (event) => {
  try {
    assertMethod(event, 'POST');

    const body = await readBody(event);
    const validated = createCatHealthSignalSchema.parse(body);

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

    // Upsert health signal (create or update if exists for the same cat and date)
    const healthSignal = await prisma.catHealthSignal.upsert({
      where: {
        catId_date: {
          catId: validated.catId,
          date: normalizedDate,
        },
      },
      update: {
        color: validated.color,
        note: validated.note,
      },
      create: {
        catId: validated.catId,
        date: normalizedDate,
        color: validated.color,
        note: validated.note,
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

    console.log('✅ ヘルスシグナル作成成功:', healthSignal.id);
    return healthSignal;
  }
  catch (error) {
    if (error instanceof z.ZodError) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request data',
        data: error.errors,
      });
    }

    console.error('❌ ヘルスシグナル作成エラー:', error);
    throw error;
  }
});
